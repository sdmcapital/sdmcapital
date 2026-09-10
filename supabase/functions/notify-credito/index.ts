import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAILS       = ['contacto@sdmcapital.cl', 'rurrutia@sdmcapital.cl', 'vurrutia@sdmcapital.cl']
const FROM_EMAIL      = 'captacion@sdmcapital.cl'
const PANEL_URL       = 'https://sdmcapital.cl/admin/solicitudes'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Diccionarios de etiquetas ────────────────────────────────────────────────
//
// Los cuatro valores de `PRODUCTO_LABEL` son los del CHECK `producto_valido`
// (migración `20260909205233`) y los mismos de `credito/productos.ts` y del
// panel del admin. Son la misma lista escrita en varios sitios: si aparece un
// quinto producto, entra acá también o el correo lo marca como no reconocido.
const PRODUCTO_LABEL: Record<string, string> = {
  hipotecario: 'Hipotecario',
  consumo: 'Consumo y deudas',
  bancarizacion: 'Bancarización',
  leaseback: 'Leaseback',
}

const ACCION_LABEL: Record<string, string> = {
  compra: 'Comprar una propiedad',
  refinanciamiento: 'Refinanciar un crédito',
}
const CONDICION_LABEL: Record<string, string> = {
  nueva: 'Nueva',
  usada: 'Usada',
}
const SITUACION_LABEL: Record<string, string> = {
  dependiente: 'Trabajador dependiente',
  independiente: 'Trabajador independiente',
}
const TIPO_PERSONA_LABEL: Record<string, string> = {
  persona: 'Persona',
  empresa: 'Empresa',
}

// `tipo_bien` YA VIAJA COMO ETIQUETA, no como clave: el `<select>` de
// `SolicitudCreditoForm.tsx` guarda «Bodega o galpón», no `bodega_galpon`. Este
// mapa queda vacío a propósito y `etiqueta()` cae al valor crudo, que es el
// correcto. Existe para tener DÓNDE poner un renombre si algún día el correo
// necesita decir otra cosa que la ficha — hoy no hay ninguno.
const TIPO_BIEN_LABEL: Record<string, string> = {}

// Un valor sin etiqueta se imprime tal cual en vez de quedar en blanco: un dato
// crudo se puede leer, un hueco no se puede recuperar.
function etiqueta(mapa: Record<string, string>, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  const v = String(valor)
  return mapa[v] || v
}

// ── Formato ──────────────────────────────────────────────────────────────────

// EL PAYLOAD LO CONSTRUYE EL NAVEGADOR y se interpola en HTML, así que todo lo
// que venga de ahí se escapa. El formulario es público: cualquiera puede enviar
// un `nombres` con `<` y romper la tabla del correo, o algo peor en el cliente
// de correo que lo abra. Escapar es una línea y cierra el asunto entero.
function esc(v: unknown): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pesos(v: unknown): string | null {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return null
  return `$${Math.round(n).toLocaleString('es-CL')} CLP`
}

function enUf(v: unknown): string | null {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return null
  return `UF ${n.toLocaleString('es-CL')}`
}

// HORA DE CHILE, no UTC. Deno trae ICU completo, así que `timeZone` funciona.
// El payload NO trae `created_at` —lo pone la base con su `DEFAULT now()` y esta
// función recibe lo que el navegador mandó, no la fila—, así que la fecha es la
// del envío del correo. Va a menos de un segundo de la del INSERT, y decirlo
// aproximado es más honesto que estampar una hora en UTC que se lee como local.
function fechaChile(): string {
  return new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: { ...corsHeaders } })
  }

  try {
    const cuerpo = await req.json().catch(() => ({}))
    // `?? {}` — SIN ESTO, un cuerpo sin `record` revienta al desestructurar y el
    // correo no sale. No es autenticación ni un cambio de contrato: es que la
    // función siga produciendo un correo legible con lo que haya llegado, que es
    // justo lo que hace falta cuando algo viene mal.
    const record = (cuerpo?.record ?? {}) as Record<string, unknown>

    const {
      producto, nombres, apellidos, email, telefono, rut,
      accion, tipo_propiedad, condicion_propiedad, valor_uf,
      situacion_laboral, sueldo_promedio,
      monto_solicitado, tipo_persona, tipo_bien,
    } = record

    const nombreCompleto = [nombres, apellidos].filter(Boolean).map(String).join(' ').trim() || 'Sin nombre'

    // EL PRODUCTO DESCONOCIDO SE DECLARA, NO SE ASUME HIPOTECARIO. Un correo que
    // dice «producto no reconocido» se corrige mirando la fila en el panel; uno
    // que miente sobre el producto manda a alguien a llamar con el guion
    // equivocado y nadie se entera.
    const conocido = typeof producto === 'string' && producto in PRODUCTO_LABEL
    const productoTexto = conocido
      ? PRODUCTO_LABEL[producto as string]
      : `PRODUCTO NO RECONOCIDO (${producto === undefined || producto === null || producto === '' ? 'ausente' : String(producto)})`

    const fila = (label: string, valor: string) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8edf2; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #7a8a96; width: 170px; vertical-align: top;">${esc(label)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e8edf2; font-size: 15px; color: #0F2535;">${valor}</td>
      </tr>`

    // LOS CAMPOS EN NULL NO SE IMPRIMEN. Un «—» donde el visitante nunca escribió
    // nada dice que faltó un dato; para un leaseback el valor en UF de una
    // propiedad NUNCA se preguntó. Un hueco se lee como un problema.
    const filas: string[] = []
    const add = (label: string, valor: string | null | undefined, yaEsHtml = false) => {
      if (valor === null || valor === undefined || valor === '') return
      filas.push(fila(label, yaEsHtml ? valor : esc(valor)))
    }

    // ── Comunes a los cuatro ──
    add('Producto', productoTexto)
    add('Nombres', nombres as string)
    add('Apellidos', apellidos as string)
    if (email) add('Email', `<a href="mailto:${encodeURIComponent(String(email))}" style="color: #1C3D5C;">${esc(email)}</a>`, true)
    add('Teléfono', telefono as string)
    add('RUT', rut as string)
    add('Fecha de la solicitud', fechaChile())

    // ── Del producto ──
    const laboral = () => {
      add('Situación laboral', etiqueta(SITUACION_LABEL, situacion_laboral))
      add('Sueldo líquido promedio (3 meses)', pesos(sueldo_promedio))
    }

    if (producto === 'hipotecario') {
      add('¿Qué quiere hacer?', etiqueta(ACCION_LABEL, accion))
      if (accion === 'compra') {
        add('Propiedad nueva o usada', etiqueta(CONDICION_LABEL, condicion_propiedad))
        add('Tipo de propiedad', tipo_propiedad as string)
      }
      add('Valor de la propiedad', enUf(valor_uf))
      laboral()
    } else if (producto === 'consumo') {
      add('Monto que necesita', pesos(monto_solicitado))
      laboral()
    } else if (producto === 'bancarizacion') {
      add('¿Para quién?', etiqueta(TIPO_PERSONA_LABEL, tipo_persona))
      // Una empresa no declara situación laboral ni sueldo: el formulario manda
      // las dos en `null` y acá no se piden.
      if (tipo_persona === 'persona') laboral()
    } else if (producto === 'leaseback') {
      add('Tipo de bien', etiqueta(TIPO_BIEN_LABEL, tipo_bien))
      add('Valor estimado del bien', pesos(monto_solicitado))
    } else {
      // PRODUCTO DESCONOCIDO: se vuelca TODO lo que llegó con valor, sin filtrar
      // por producto. No se sabe qué campos aplican, así que esconder algo sería
      // perder el único registro legible que va a tener quien lea esto.
      add('¿Qué quiere hacer?', etiqueta(ACCION_LABEL, accion))
      add('Propiedad nueva o usada', etiqueta(CONDICION_LABEL, condicion_propiedad))
      add('Tipo de propiedad', tipo_propiedad as string)
      add('Valor de la propiedad', enUf(valor_uf))
      add('Monto solicitado', pesos(monto_solicitado))
      add('¿Para quién?', etiqueta(TIPO_PERSONA_LABEL, tipo_persona))
      add('Tipo de bien', etiqueta(TIPO_BIEN_LABEL, tipo_bien))
      laboral()
    }

    const asunto = `Nueva solicitud · ${productoTexto} · ${nombreCompleto}`

    const avisoDesconocido = conocido ? '' : `
        <div style="border-left: 4px solid #A8384B; background: #fff3f3; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #0F2535;">
          <strong>El producto no se pudo reconocer.</strong> Abajo van TODOS los campos que llegaron con
          valor, sin filtrar. La solicitud sí quedó guardada: revísala en el panel.
        </div>`

    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
        <div style="border-left: 4px solid #3DAA6E; padding-left: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 300; margin: 0; color: #0F2535;">Nueva solicitud · ${esc(productoTexto)}</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #7a8a96;">SDM Capital — Financiamiento Personas</p>
        </div>
${avisoDesconocido}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${filas.join('')}
        </table>

        <div>
          ${email ? `<a href="mailto:${encodeURIComponent(String(email))}?subject=${encodeURIComponent(`Re: Tu solicitud · ${productoTexto} · SDM Capital`)}&body=${encodeURIComponent(`Hola ${nombres || ''},`)}"
            style="display: inline-block; background: #0F2535; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 2px; margin-right: 8px;">
            Responder →
          </a>` : ''}
          <a href="${PANEL_URL}"
            style="display: inline-block; background: #fff; color: #0F2535; border: 1px solid #0F2535; padding: 12px 24px; text-decoration: none; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 2px;">
            Ver en el panel →
          </a>
        </div>

        <p style="margin-top: 32px; font-size: 12px; color: #7a8a96; border-top: 1px solid #e8edf2; padding-top: 16px;">
          Gestiona esta solicitud en <a href="${PANEL_URL}" style="color: #1C3D5C;">${PANEL_URL}</a><br />
          SDM Capital · Av. Apoquindo 5583, Las Condes, Santiago
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAILS,
        subject: asunto,
        html,
      }),
    })

    if (!res.ok) {
      // ESTE CORREO ES EL ÚNICO AVISO DE QUE ENTRÓ UNA SOLICITUD, así que su
      // fallo tiene que quedar registrado con lo suficiente para saber DE QUIÉN
      // era: antes se logueaba solo el texto de la respuesta, sin código, sin
      // producto y sin correo, o sea sin forma de emparejarlo con una fila del
      // panel. El dato no se pierde —el INSERT ya ocurrió y la solicitud está en
      // `/admin/solicitudes`—, pero nadie recibe el aviso, y el log es lo único
      // que puede decir cuál fue.
      const err = await res.text()
      console.error('[notify-credito] Resend falló', {
        status: res.status,
        producto: productoTexto,
        email: email ?? null,
        nombre: nombreCompleto,
        respuesta: err,
      })
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notify-credito] la función lanzó', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
