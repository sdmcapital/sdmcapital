import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RadioGroup, labelStyle } from './campos'
import type { ProductoCredito } from './productos'

const TIPOS_PROPIEDAD = ['Departamento', 'Casa', 'Oficina', 'Local comercial', 'Parcela', 'Terreno']

// Leaseback no es solo inmobiliario: la operación se hace contra cualquier
// activo que la institución pueda adquirir y arrendar de vuelta. De ahí
// «Maquinaria» y «Otro», que en el catálogo de propiedades no existen.
const TIPOS_BIEN = ['Propiedad residencial', 'Oficina', 'Local comercial', 'Bodega o galpón', 'Terreno', 'Maquinaria', 'Otro']

interface FormState {
  nombres: string
  apellidos: string
  email: string
  telefono: string
  rut: string
  accion: string
  condicion_propiedad: string
  tipo_propiedad: string
  valor_uf: string
  situacion_laboral: string
  sueldo_promedio: string
  monto_solicitado: string
  tipo_persona: string
  tipo_bien: string
}

const EMPTY_FORM: FormState = {
  nombres: '', apellidos: '', email: '', telefono: '', rut: '',
  accion: '', condicion_propiedad: '', tipo_propiedad: '', valor_uf: '', situacion_laboral: '', sueldo_promedio: '',
  monto_solicitado: '', tipo_persona: '', tipo_bien: '',
}

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
  if (!clean) return ''
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  if (!body) return dv
  const reversed = body.split('').reverse().join('')
  const grouped = reversed.replace(/(\d{3})(?=\d)/g, '$1.')
  const formattedBody = grouped.split('').reverse().join('')
  return `${formattedBody}-${dv}`
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('es-CL')
}

// Lo que se escribe en pantalla lleva puntos de miles; lo que va a la base es un
// `numeric`. La conversión está en un sitio para que validación y payload no
// puedan discrepar.
const soloDigitos = (raw: string) => Number(raw.replace(/\D/g, ''))

const RUT_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Piezas repetidas entre productos ────────────────────────────────────────
//
// A NIVEL DE MÓDULO, no dentro del render: un componente definido dentro de la
// función es un tipo nuevo en cada pasada y React desmonta y remonta su subárbol
// —el campo pierde el foco a la primera tecla—. Es el mismo bug de remontaje que
// documenta `SINCRONIA.md` para los paneles del admin.

function CampoMiles({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-2">
      <span style={labelStyle}>{label}</span>
      <input
        required
        inputMode="numeric"
        className="input-line"
        value={value}
        onChange={e => onChange(formatThousands(e.target.value))}
        placeholder={placeholder}
      />
    </label>
  )
}

// Situación laboral + sueldo van SIEMPRE juntos: los tres productos que evalúan
// a una persona natural los piden como par, y ninguno pide uno sin el otro.
function CamposLaborales({ situacion, sueldo, onSituacion, onSueldo }: {
  situacion: string
  sueldo: string
  onSituacion: (v: string) => void
  onSueldo: (v: string) => void
}) {
  return (
    <>
      <RadioGroup
        label="Situación laboral"
        value={situacion}
        onChange={onSituacion}
        options={[
          { value: 'dependiente', label: 'Trabajador dependiente' },
          { value: 'independiente', label: 'Trabajador independiente' },
        ]}
      />
      <CampoMiles
        label="Promedio estimado de sueldo líquido mensual (últimos 3 meses)"
        value={sueldo}
        onChange={onSueldo}
        placeholder="Ej: 1.500.000"
      />
    </>
  )
}

interface SolicitudCreditoFormProps {
  /* OPCIONAL Y CON DEFAULT, no obligatoria. `EvaluacionGratuitaPage.tsx` monta
     este formulario sin selector de producto y esa página es de otra tanda: con
     la prop obligatoria, `tsc` la rompería y el build entero se cae. Con el
     default se queda exactamente como está hoy —hipotecaria— hasta que le toque
     su propia sesión. */
  producto?: ProductoCredito
  title?: string
  subtitle?: string
  successTitle?: string
  successMessage?: string
  successAction?: React.ReactNode
}

export default function SolicitudCreditoForm({
  producto = 'hipotecario',
  title = 'Solicita tu evaluación',
  subtitle,
  successTitle = '¡Solicitud enviada!',
  successMessage = 'Recibimos tu información. Roberto te contactará a la brevedad para continuar con la preevaluación.',
  successAction,
}: SolicitudCreditoFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [uf, setUf] = useState<{ valor: number | null; error: boolean; loading: boolean }>({ valor: null, error: false, loading: true })

  // ─── Cambio de producto ────────────────────────────────────────────────────
  //
  // SOBREVIVEN SIETE: los cinco de identidad más el par laboral.
  //
  // Los cinco de identidad son obvios — quien ya escribió su nombre, su correo y
  // su RUT no los vuelve a escribir por cambiar de producto.
  //
  // `situacion_laboral` y `sueldo_promedio` se suman porque son EL MISMO DATO en
  // los tres productos que los piden: hipotecario, consumo y bancarización de
  // persona. Vaciarlos al cambiar obligaba a reescribir un sueldo que el campo
  // de al lado seguía mostrando.
  //
  // Se vacían los siete que dependen del producto: `accion`,
  // `condicion_propiedad`, `tipo_propiedad`, `valor_uf`, `monto_solicitado`,
  // `tipo_persona` y `tipo_bien`. El caso que lo justifica es
  // `monto_solicitado`: en consumo es lo que el cliente pide y en leaseback lo
  // que vale su activo, y arrastrar 8.000.000 de un lado al otro es un dato
  // falso, no una comodidad.
  //
  // ARRASTRAR EL PAR LABORAL NO LO VUELVE OBLIGATORIO NI LO CUELA EN EL PAYLOAD:
  // las dos cosas se deciden por `producto`, no por si el campo tiene valor. En
  // bancarización de EMPRESA, `especificoValid` corta antes de mirar el par y
  // `laboralAplica` es falso, así que las dos columnas viajan en `null`.
  //
  // AJUSTE DURANTE EL RENDER, no un `useEffect`: con el efecto React alcanza a
  // pintar una pasada con los campos del producto anterior y recién ahí los
  // limpia — un parpadeo visible en los campos que los dos productos comparten.
  // Ajustando durante el render, esa pasada nunca se confirma en pantalla. Es el
  // patrón documentado en React para «adaptar el estado cuando cambia una prop»,
  // y por eso hace falta guardar el producto anterior en estado.
  const [productoAnterior, setProductoAnterior] = useState<ProductoCredito>(producto)
  if (producto !== productoAnterior) {
    setProductoAnterior(producto)
    setForm(f => ({
      ...EMPTY_FORM,
      nombres: f.nombres, apellidos: f.apellidos, email: f.email, telefono: f.telefono, rut: f.rut,
      situacion_laboral: f.situacion_laboral, sueldo_promedio: f.sueldo_promedio,
    }))
    setStatus('idle')
    setErrorMsg('')
  }

  useEffect(() => {
    let active = true
    fetch('https://mindicador.cl/api/uf')
      .then(r => r.json())
      .then(data => {
        if (!active) return
        const valor = data?.serie?.[0]?.valor
        setUf(typeof valor === 'number' ? { valor, error: false, loading: false } : { valor: null, error: true, loading: false })
      })
      .catch(() => { if (active) setUf({ valor: null, error: true, loading: false }) })
    return () => { active = false }
  }, [])

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Para los controles que entregan el valor ya limpio —`RadioGroup` y
  // `CampoMiles`—, en vez del evento.
  const setCampo = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  // ─── Validación ────────────────────────────────────────────────────────────
  //
  // Los cinco comunes valen para los cuatro productos. Lo específico se evalúa
  // SOLO para el producto activo: un campo que no está en pantalla no puede
  // bloquear el envío, y ésa era la trampa de tener un único `canSubmit`.
  const rutValid = RUT_REGEX.test(form.rut)
  const emailValid = EMAIL_REGEX.test(form.email)
  const valorUfValid = form.valor_uf !== '' && Number(form.valor_uf) > 0
  const montoValid = soloDigitos(form.monto_solicitado) > 0
  const laboralValid = form.situacion_laboral !== '' && soloDigitos(form.sueldo_promedio) > 0
  const compraFieldsValid = form.accion !== 'compra' || (form.condicion_propiedad !== '' && form.tipo_propiedad !== '')

  const identidadValid =
    form.nombres.trim() !== '' &&
    form.apellidos.trim() !== '' &&
    emailValid &&
    form.telefono.trim() !== '' &&
    rutValid

  const especificoValid =
    producto === 'hipotecario' ? form.accion !== '' && compraFieldsValid && valorUfValid && laboralValid
    : producto === 'consumo' ? montoValid && laboralValid
    // Una empresa no declara situación laboral ni sueldo: para ella el producto
    // se evalúa con los antecedentes tributarios, que no se piden por acá.
    : producto === 'bancarizacion' ? form.tipo_persona !== '' && (form.tipo_persona !== 'persona' || laboralValid)
    : form.tipo_bien !== '' && montoValid

  const canSubmit = identidadValid && especificoValid && status !== 'sending'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('sending')
    setErrorMsg('')

    // ─── El payload ──────────────────────────────────────────────────────────
    //
    // LAS CATORCE CLAVES VAN SIEMPRE, y lo que no aplica va en `null` explícito.
    // No es cosmético: en supabase-js una clave con `undefined` DESAPARECE del
    // cuerpo de la petición, así que la columna se quedaría con lo que hubiera
    // en vez de vaciarse. Para limpiar un campo hay que mandar `null`.
    //
    // Y tiene que cumplir los tres CHECK de la migración
    // `20260909205233_solicitudes_credito_productos.sql`. `hipotecario_completo`
    // y `consumo_completo` son justo lo que `especificoValid` ya exige, así que
    // un envío que pasa la validación no puede provocar un 23514.
    const laboralAplica =
      producto === 'hipotecario' ||
      producto === 'consumo' ||
      (producto === 'bancarizacion' && form.tipo_persona === 'persona')
    const montoAplica = producto === 'consumo' || producto === 'leaseback'
    const esCompra = producto === 'hipotecario' && form.accion === 'compra'

    const payload = {
      producto,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      rut: form.rut.trim(),
      accion: producto === 'hipotecario' ? form.accion : null,
      tipo_propiedad: esCompra ? form.tipo_propiedad : null,
      condicion_propiedad: esCompra ? form.condicion_propiedad : null,
      valor_uf: producto === 'hipotecario' ? Number(form.valor_uf) : null,
      situacion_laboral: laboralAplica ? form.situacion_laboral : null,
      sueldo_promedio: laboralAplica ? soloDigitos(form.sueldo_promedio) : null,
      monto_solicitado: montoAplica ? soloDigitos(form.monto_solicitado) : null,
      tipo_persona: producto === 'bancarizacion' ? form.tipo_persona : null,
      tipo_bien: producto === 'leaseback' ? form.tipo_bien : null,
    }

    try {
      const { error: insertError } = await supabase.from('solicitudes_credito').insert([payload])

      if (insertError) {
        // EL OBJETO COMPLETO, no solo el mensaje: `code`, `details` y `hint`
        // viven ahí y son lo único que sirve para depurar de verdad — un 23514
        // dice qué CHECK falló y un PGRST204 qué columna no existe. Es la misma
        // razón por la que existe `avisarError()` en el admin, pero NO se usa
        // acá: `avisarError` levanta un `alert()`, y esto es un formulario
        // público donde el error va en el sitio, bajo el botón.
        console.error('Solicitud de crédito — insert falló', insertError)
        setErrorMsg(insertError.message || 'No pudimos enviar tu solicitud. Intenta de nuevo.')
        setStatus('error')
        return
      }
    } catch (err) {
      // supabase-js entrega los errores dentro de `{ error }` en vez de
      // rechazar, así que esto casi nunca corre. Está para que un rechazo raro
      // no deje el botón en «Enviando…» para siempre.
      console.error('Solicitud de crédito — el insert lanzó', err)
      setErrorMsg(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud. Intenta de nuevo.')
      setStatus('error')
      return
    }

    // ─── El aviso por correo NO decide el resultado ──────────────────────────
    //
    // Estaba dentro del mismo `try` que el insert: si Resend fallaba DESPUÉS de
    // un insert correcto, el visitante veía un error, reintentaba, y la fila se
    // duplicaba. La solicitud ya está guardada — el estado es 'ok' y punto. Lo
    // que se pierde si esto falla es el aviso, y eso va a la consola.
    try {
      const { error: avisoError } = await supabase.functions.invoke('notify-credito', { body: { record: payload } })
      if (avisoError) console.error('Solicitud de crédito — el aviso por correo falló', avisoError)
    } catch (err) {
      console.error('Solicitud de crédito — el aviso por correo lanzó', err)
    }

    setStatus('ok')
  }

  if (status === 'ok') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-20">
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(61,170,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          {/* `--green-dark`: el círculo es `rgba(61,170,110,0.12)` sobre blanco,
              o sea un fondo efectivo de ~`#E8F5EE`. Ahí `--green` da 2,58:1 y
              `--green-dark` 4,28:1. Es la misma cara de la regla 4.2 que el visto
              de Rental: marca verde sobre superficie clara. */}
          <Check size={28} color="var(--green-dark)" />
        </div>
        <h2 className="font-serif font-light text-sdm-2xl" style={{ color: 'var(--navy-dark)', marginBottom: 10 }}>
          {successTitle}
        </h2>
        <p className="text-sdm-base" style={{ color: 'var(--muted)', lineHeight: 1.7, maxWidth: 420, marginBottom: successAction ? 28 : 0 }}>
          {successMessage}
        </p>
        {successAction}
      </div>
    )
  }

  return (
    <>
      <h2 className="font-serif font-light text-sdm-2xl" style={{ color: 'var(--navy-dark)', marginBottom: subtitle ? 8 : 24 }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-sdm-base" style={{ fontWeight: 300, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-7">
        {/* ── Los cinco comunes: los cuatro productos los piden ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span style={labelStyle}>Nombres</span>
            <input required className="input-line" value={form.nombres} onChange={set('nombres')} placeholder="Tus nombres" />
          </label>
          <label className="flex flex-col gap-2">
            <span style={labelStyle}>Apellidos</span>
            <input required className="input-line" value={form.apellidos} onChange={set('apellidos')} placeholder="Tus apellidos" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span style={labelStyle}>Email</span>
            <input required type="email" className="input-line" value={form.email} onChange={set('email')} placeholder="tu@email.com" />
          </label>
          <label className="flex flex-col gap-2">
            <span style={labelStyle}>Teléfono</span>
            <input required type="tel" className="input-line" value={form.telefono} onChange={set('telefono')} placeholder="+56 9 ···" />
          </label>
        </div>

        <label className="flex flex-col gap-2" style={{ maxWidth: 220 }}>
          <span style={labelStyle}>RUT</span>
          <input required className="input-line" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: formatRut(e.target.value) }))} placeholder="12.345.678-9" />
        </label>

        {/* ── Hipotecario ── */}
        {producto === 'hipotecario' && (
          <>
            <RadioGroup
              label="¿Qué quieres hacer?"
              value={form.accion}
              onChange={setCampo('accion')}
              options={[
                { value: 'compra', label: 'Comprar una propiedad' },
                { value: 'refinanciamiento', label: 'Refinanciar un crédito' },
              ]}
            />

            {form.accion === 'compra' && (
              <>
                <RadioGroup
                  label="¿Buscas propiedad nueva o usada?"
                  value={form.condicion_propiedad}
                  onChange={setCampo('condicion_propiedad')}
                  options={[
                    { value: 'nueva', label: 'Nueva' },
                    { value: 'usada', label: 'Usada' },
                  ]}
                />

                <label className="flex flex-col gap-2">
                  <span style={labelStyle}>Tipo de propiedad</span>
                  <select className="input-line" value={form.tipo_propiedad} onChange={set('tipo_propiedad')}>
                    <option value="" disabled>Selecciona…</option>
                    {TIPOS_PROPIEDAD.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </>
            )}

            <div className="flex flex-col gap-2">
              {/* Acá el <label> envuelve solo al input, no al div entero: el texto
                  de ayuda de la UF cambia solo y no debe entrar en el nombre
                  accesible del campo. Los gap-2 anidados dan la misma separación
                  de 8px entre los tres elementos que había antes. */}
              <label className="flex flex-col gap-2">
                <span style={labelStyle}>Valor de la propiedad (UF)</span>
                <input required type="number" min="0" className="input-line" value={form.valor_uf} onChange={set('valor_uf')} placeholder="Ej: 5000" />
              </label>
              {uf.loading ? (
                <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Consultando valor UF…</p>
              ) : uf.error ? (
                <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Consulta el valor vigente en mindicador.cl</p>
              ) : (
                <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
                  Valor UF hoy: ${Math.round(uf.valor as number).toLocaleString('es-CL')} CLP
                </p>
              )}
            </div>

            <CamposLaborales
              situacion={form.situacion_laboral}
              sueldo={form.sueldo_promedio}
              onSituacion={setCampo('situacion_laboral')}
              onSueldo={setCampo('sueldo_promedio')}
            />
          </>
        )}

        {/* ── Consumo y consolidación ── */}
        {producto === 'consumo' && (
          <>
            <CampoMiles
              label="Monto aproximado que necesitas (CLP)"
              value={form.monto_solicitado}
              onChange={setCampo('monto_solicitado')}
              placeholder="Ej: 8.000.000"
            />
            <CamposLaborales
              situacion={form.situacion_laboral}
              sueldo={form.sueldo_promedio}
              onSituacion={setCampo('situacion_laboral')}
              onSueldo={setCampo('sueldo_promedio')}
            />
          </>
        )}

        {/* ── Bancarización ── */}
        {producto === 'bancarizacion' && (
          <>
            <RadioGroup
              label="¿Para quién?"
              value={form.tipo_persona}
              onChange={setCampo('tipo_persona')}
              options={[
                { value: 'persona', label: 'Persona' },
                { value: 'empresa', label: 'Empresa' },
              ]}
            />
            {form.tipo_persona === 'persona' && (
              <CamposLaborales
                situacion={form.situacion_laboral}
                sueldo={form.sueldo_promedio}
                onSituacion={setCampo('situacion_laboral')}
                onSueldo={setCampo('sueldo_promedio')}
              />
            )}
          </>
        )}

        {/* ── Leaseback ── */}
        {producto === 'leaseback' && (
          <>
            <label className="flex flex-col gap-2">
              <span style={labelStyle}>Tipo de bien</span>
              <select className="input-line" value={form.tipo_bien} onChange={set('tipo_bien')}>
                <option value="" disabled>Selecciona…</option>
                {TIPOS_BIEN.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <CampoMiles
              label="Valor estimado del bien (CLP)"
              value={form.monto_solicitado}
              onChange={setCampo('monto_solicitado')}
              placeholder="Ej: 180.000.000"
            />
          </>
        )}

        {status === 'error' && (
          <p className="text-sdm-base" style={{ color: 'var(--error)' }}>{errorMsg || 'Error al enviar. Intenta de nuevo.'}</p>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary justify-center">
          {status === 'sending' ? (
            <span className="flex items-center gap-2"><Loader2 aria-hidden="true" size={15} className="animate-spin" /> Enviando…</span>
          ) : 'Enviar solicitud'}
        </button>
      </form>
    </>
  )
}
