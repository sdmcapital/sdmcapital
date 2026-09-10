import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { avisarError } from '@/lib/errores'
import { useGuardado } from '@/components/admin/acciones'
import { fechaHoraChile } from '@/lib/fechas'
// SOLO EL TIPO, no valores: `import type` se borra en el build, así que el panel
// del admin no arrastra el módulo del sitio público a su chunk. Lo que se gana a
// cambio es que `PRODUCTO_LABEL` sea un `Record<ProductoCredito, string>`, o sea
// que el día que aparezca un quinto producto `tsc` no deja compilar hasta que
// tenga rótulo acá.
import type { ProductoCredito } from '@/components/credito/productos'

// ── Auth ──────────────────────────────────────────────────────────────────────
// Copiado de los otros cuatro paneles de `src/pages/admin/`. Extraerlo a un
// hook compartido tocaría los cuatro y es una tanda propia, no un efecto
// colateral de estrenar este módulo.
function useAdminAuth() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setChecking(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s))
    return () => subscription.unsubscribe()
  }, [])
  return { authed, checking }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
//
// LAS COLUMNAS ESTÁN PARTIDAS EN DOS GRUPOS Y ESA DIVISIÓN ES LA REGLA DEL
// MÓDULO: lo que escribió el VISITANTE y lo que escribe el EQUIPO. El panel solo
// escribe el segundo grupo. Ver `CamposCiclo` más abajo, que es donde la regla
// deja de ser un comentario y pasa a ser algo que `tsc` verifica.
type Solicitud = {
  id: string
  created_at: string | null

  // ── Del visitante. NADA de esto se toca desde acá. ──
  producto: string
  nombres: string | null
  apellidos: string | null
  email: string | null
  telefono: string | null
  rut: string | null
  accion: string | null
  tipo_propiedad: string | null
  condicion_propiedad: string | null
  valor_uf: number | null
  situacion_laboral: string | null
  sueldo_promedio: number | null
  monto_solicitado: number | null
  tipo_persona: string | null
  tipo_bien: string | null

  // ── Del equipo. Lo único que el panel escribe. ──
  contactado_en: string | null
  cerrado_en: string | null
  resultado: string | null
}

// LO ÚNICO QUE EL PANEL PUEDE ESCRIBIR, dicho en el sistema de tipos y no en un
// comentario que alguien puede no leer. Todas las escrituras pasan por
// `escribirCiclo`, que solo acepta esto: pasarle `sueldo_promedio` o `rut` no
// compila, y el build se cae antes de llegar a producción.
type CamposCiclo = Partial<Pick<Solicitud, 'contactado_en' | 'cerrado_en' | 'resultado'>>

// ── Rótulos ───────────────────────────────────────────────────────────────────
//
// `Record<ProductoCredito, string>` y no `Record<string, string>`: exhaustivo a
// propósito. Los cuatro valores viven además en el CHECK `producto_valido`
// (migración `20260909205233`) y en `PRODUCTOS` de `credito/productos.ts`.
const PRODUCTO_LABEL: Record<ProductoCredito, string> = {
  hipotecario: 'Hipotecario',
  consumo: 'Consumo y deudas',
  bancarizacion: 'Bancarización',
  leaseback: 'Leaseback',
}

// Los cuatro del CHECK `resultado_valido` (migración `20260909214015`). Si se
// agrega uno en la base va también acá: `cicloSolicitud` cae al valor crudo si
// no lo encuentra, así que la lista no miente, pero se lee peor.
//
// NO son los de `leads.resultado`: una solicitud de crédito se aprueba o se
// rechaza, no se «vende».
const RESULTADO_LABEL: Record<string, string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  desistio: 'Desistió',
  sin_respuesta: 'Sin respuesta',
}
const RESULTADOS = Object.keys(RESULTADO_LABEL)

// Los tres mapas de los campos del visitante. Mismos valores que los
// diccionarios de `notify-credito/index.ts`, que se queda como está: tocar la
// Edge Function es otra tanda.
const ACCION_LABEL: Record<string, string> = {
  compra: 'Comprar una propiedad',
  refinanciamiento: 'Refinanciar un crédito',
}
const CONDICION_LABEL: Record<string, string> = { nueva: 'Nueva', usada: 'Usada' }
const SITUACION_LABEL: Record<string, string> = {
  dependiente: 'Trabajador dependiente',
  independiente: 'Trabajador independiente',
}
const TIPO_PERSONA_LABEL: Record<string, string> = { persona: 'Persona', empresa: 'Empresa' }

// ── Color ─────────────────────────────────────────────────────────────────────
// Mismo mapa que el de `Captacion.tsx`, apuntando a los tokens de
// `globals.css`. Se repite en vez de importarse porque son seis líneas y
// compartirlo obligaría a tocar Captación, que no entra en esta tanda.
//
// DOS VERDES Y NO SON INTERCAMBIABLES, regla 4.2 de `SISTEMA-DISENO.md`:
// `green` solo decorativo —filetes, bordes—, `greenDark` en cuanto hay texto en
// el par. Blanco sobre `--green` da 2,93:1 y no llega ni al umbral de texto
// grande.
const COLORS = {
  navy: 'var(--navy-dark)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  bg: 'var(--off)',
  green: 'var(--green)',
  greenDark: 'var(--green-dark)',
  red: 'var(--error)',
}

// ── El ciclo, derivado y no almacenado ────────────────────────────────────────
//
// No hay columna «estado» y es deliberado: un estado guardado se desincroniza
// de las fechas que dice resumir, y entonces hay dos verdades. Acá la única
// verdad son las tres columnas.
//
// EL ORDEN IMPORTA: `cerrado_en` manda sobre `contactado_en`, porque cerrar
// escribe las dos fechas y una solicitud cerrada no debe leerse «Contactada».
type EstadoCiclo = 'sin_contactar' | 'contactada' | 'cerrada'

function estadoDe(s: Solicitud): EstadoCiclo {
  if (s.cerrado_en) return 'cerrada'
  if (s.contactado_en) return 'contactada'
  return 'sin_contactar'
}

// El ciclo en una línea, para la columna de estado. Función pura: los cuatro
// casos se pueden verificar sin base.
function cicloSolicitud(s: Solicitud): string {
  if (s.cerrado_en) {
    // `resultado` es nullable incluso con `cerrado_en` puesto.
    const r = s.resultado ? (RESULTADO_LABEL[s.resultado] || s.resultado) : null
    return r ? `Cerrada · ${r}` : 'Cerrada'
  }
  if (s.contactado_en) return 'Contactada'
  return 'Sin contactar'
}

// ── Formato ───────────────────────────────────────────────────────────────────

// Pesos chilenos con separador de miles. `es-CL` y no `Intl.NumberFormat` con
// `currency`: ese añade el código «CLP» delante en varios motores, y en una
// ficha de datos personales el signo solo se lee mejor.
function pesos(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

function uf(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null
  return `${n.toLocaleString('es-CL')} UF`
}

function nombreCompleto(s: Solicitud): string {
  const n = `${s.nombres || ''} ${s.apellidos || ''}`.trim()
  return n || '—'
}

// El número a un enlace de WhatsApp, y `null` cuando no se puede afirmar cuál
// es el número.
//
// NO SE INVENTA UN PREFIJO SOBRE CUALQUIER COSA. Anteponer '56' a un largo
// desconocido produce un enlace que abre un chat con un número que no existe, y
// eso se descubre delante del cliente. Los tres casos que sí se pueden afirmar:
//
//   56 + 9 dígitos   ya viene con país          → tal cual
//   9 dígitos con 9  móvil chileno sin país     → 56 delante
//   8 dígitos        móvil viejo, sin el 9      → 569 delante
//
// Cualquier otra forma se pinta como texto, sin enlace: es un dato que hay que
// mirar, no un enlace que hay que arreglar a ciegas.
function waUrl(tel: string | null): string | null {
  if (!tel) return null
  const d = tel.replace(/\D/g, '').replace(/^00/, '')
  if (d.length === 11 && d.startsWith('56')) return `https://wa.me/${d}`
  if (d.length === 9 && d.startsWith('9')) return `https://wa.me/56${d}`
  if (d.length === 8) return `https://wa.me/569${d}`
  return null
}

// ── Piezas visuales ───────────────────────────────────────────────────────────

function SeccionVacia({ children }: { children: React.ReactNode }) {
  return <div className="text-sdm-sm" style={{ color: COLORS.muted, fontStyle: 'italic' }}>{children}</div>
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ flex: '1 1 160px', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 'var(--sdm-radio-contenedor)', padding: 20, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span className="text-sdm-2xl" style={{ fontWeight: 700, color: color || COLORS.navy, lineHeight: 1 }}>{value}</span>
      <span className="text-sdm-sm" style={{ color: COLORS.muted }}>{label}</span>
    </div>
  )
}

// Insignia de producto. Neutra a propósito: los cuatro productos son pares
// entre sí, ninguno es más urgente que otro, y darles cuatro colores inventaría
// una jerarquía que no existe. El color en este panel lo lleva el ESTADO, que
// es lo único sobre lo que se actúa.
function ProductoBadge({ producto }: { producto: string }) {
  const label = PRODUCTO_LABEL[producto as ProductoCredito] || producto
  return (
    <span className="text-sdm-xs" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 600, color: COLORS.navy, background: COLORS.bg,
      border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '3px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// `--muted` sobre `--off` da 4,81:1 y `--green-dark` sobre blanco 4,85:1: los
// dos por encima del 4,5:1 de texto normal. El punto de color va aparte del
// texto, así que no depende solo del tono para distinguirse.
const ESTADO_STYLE: Record<EstadoCiclo, { punto: string; fg: string }> = {
  sin_contactar: { punto: 'var(--lead-warm)', fg: COLORS.navy },
  contactada:    { punto: COLORS.green,       fg: COLORS.navy },
  cerrada:       { punto: COLORS.border,      fg: COLORS.muted },
}

function EstadoTexto({ s }: { s: Solicitud }) {
  const st = ESTADO_STYLE[estadoDe(s)]
  return (
    <span className="text-sdm-sm" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, color: st.fg, minWidth: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.punto, flexShrink: 0, transform: 'translateY(-1px)' }} />
      <span style={{ overflowWrap: 'anywhere' }}>{cicloSolicitud(s)}</span>
    </span>
  )
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: COLORS.muted, fontWeight: 600 }}>{label}</span>
      <span className="text-sdm-base" style={{ color: COLORS.navy, overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}

// Un par «rótulo · valor» de la tarjeta móvil. Fuera de la tabla el dato solo no
// dice nada: una fecha y un nombre sueltos no se sabe de qué son. En escritorio
// ese trabajo lo hace la posición de la columna; acá no hay columna.
function CampoMovil({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span className="text-sdm-xs" style={{ color: COLORS.muted, minWidth: 76, flexShrink: 0 }}>{label}</span>
      <span className="text-sdm-sm" style={{ color: COLORS.navy, overflowWrap: 'anywhere', minWidth: 0 }}>{children}</span>
    </div>
  )
}

// ── El detalle del visitante ──────────────────────────────────────────────────
//
// LOS CAMPOS EN NULL NO SE DIBUJAN. Un «—» donde el visitante nunca escribió
// nada no informa: dice que el panel esperaba algo ahí, y para una solicitud de
// leaseback el valor en UF de una propiedad NUNCA se pidió. Un guión ahí se lee
// como un dato que falta cuando en realidad es un campo que no aplica.
//
// SE RAMIFICA POR `producto`, no por «lo que venga con valor». Si una fila
// arrastrara un campo de otro producto —hoy no puede: el formulario manda `null`
// explícito en todo lo que no aplica— pintarlo sería presentar como dato del
// caso algo que nadie preguntó en ese caso.
//
// Función pura y aparte para poder verificar los cuatro productos sin base.
function detalleVisitante(s: Solicitud): { label: string; value: string }[] {
  const filas: { label: string; value: string }[] = []
  const add = (label: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') return
    filas.push({ label, value })
  }

  add('RUT', s.rut)

  if (s.producto === 'hipotecario') {
    add('Qué quiere hacer', s.accion ? (ACCION_LABEL[s.accion] || s.accion) : null)
    add('Propiedad', s.condicion_propiedad ? (CONDICION_LABEL[s.condicion_propiedad] || s.condicion_propiedad) : null)
    add('Tipo de propiedad', s.tipo_propiedad)
    add('Valor de la propiedad', uf(s.valor_uf))
  } else if (s.producto === 'consumo') {
    add('Monto que necesita', pesos(s.monto_solicitado))
  } else if (s.producto === 'bancarizacion') {
    add('Para quién', s.tipo_persona ? (TIPO_PERSONA_LABEL[s.tipo_persona] || s.tipo_persona) : null)
  } else if (s.producto === 'leaseback') {
    add('Tipo de bien', s.tipo_bien)
    add('Valor estimado del bien', pesos(s.monto_solicitado))
  }

  add('Situación laboral', s.situacion_laboral ? (SITUACION_LABEL[s.situacion_laboral] || s.situacion_laboral) : null)
  add('Sueldo líquido promedio', pesos(s.sueldo_promedio))

  return filas
}

// ── Fila ──────────────────────────────────────────────────────────────────────

const COLUMNAS = '150px minmax(0,1.3fr) 140px minmax(0,1.4fr) minmax(0,1fr) 20px'

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  // `stopPropagation`: la cabecera entera abre y cierra la fila, así que sin
  // esto tocar el teléfono además la desplegaría.
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className="text-sdm-sm" style={{ color: COLORS.navy, textDecoration: 'underline', overflowWrap: 'anywhere' }}>
      {children}
    </a>
  )
}

function Contacto({ s }: { s: Solicitud }) {
  const wa = waUrl(s.telefono)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      {s.telefono
        ? (wa
            ? <Enlace href={wa}>{s.telefono}</Enlace>
            // Sin enlace y sin disimularlo: el número no tiene una forma que
            // permita afirmar a qué chat lleva. Ver `waUrl`.
            : <span className="text-sdm-sm" style={{ color: COLORS.navy, overflowWrap: 'anywhere' }}>{s.telefono}</span>)
        : null}
      {s.email ? <Enlace href={`mailto:${s.email}`}>{s.email}</Enlace> : null}
      {!s.telefono && !s.email ? <span className="text-sdm-sm" style={{ color: COLORS.muted }}>—</span> : null}
    </div>
  )
}

function SolicitudRow({ s, expanded, onToggle, onContactado, onDeshacerContacto, onCerrar, onReabrir, accionEnCurso }: {
  s: Solicitud
  expanded: boolean
  onToggle: () => void
  onContactado: () => void
  onDeshacerContacto: () => void
  onCerrar: (resultado: string | null) => void
  onReabrir: () => void
  accionEnCurso: boolean
}) {
  // Despliegue de los cuatro resultados. Estado local y en línea, no un popover:
  // la barra de acciones ya es su propia fila, así que abrirla hacia abajo no
  // pide posicionamiento, ni z-index, ni cerrar al hacer clic afuera.
  const [cerrarAbierto, setCerrarAbierto] = useState(false)
  const detalle = detalleVisitante(s)
  const estado = estadoDe(s)

  return (
    <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 'var(--sdm-radio-contenedor)', overflow: 'hidden' }}>
      {/* CONTROL DE VERDAD, NO UN <div> QUE ESCUCHA CLICS. Sin `role`,
          `tabIndex` y `onKeyDown` la fila no recibe foco, no responde a Enter ni
          a Espacio y no se anuncia como control: con teclado no se podría abrir
          ninguna solicitud. `preventDefault()` en Espacio no sobra — sin él la
          página se desplaza además de abrir la fila. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        style={{ padding: '14px 18px', cursor: 'pointer' }}>

        {/* ── DOS CABECERAS, NO UNA CON MEDIA QUERIES ──────────────────────
            La de escritorio es una tabla: cinco columnas alineadas, y el guión
            de un campo vacío MANTIENE esa alineación. La de móvil es una ficha:
            no hay columna que alinear, así que los campos vacíos no se pintan y
            los que hay llevan rótulo. Son diferencias de CONTENIDO, no de
            estilo, y eso no se puede hacer desde CSS. Solo una rama está en el
            DOM a la vez, así que el lector de pantalla tampoco ve las dos. */}

        {/* Escritorio */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: COLUMNAS, gap: 14, alignItems: 'center' }}>
          <span className="text-sdm-sm" style={{ color: COLORS.muted, whiteSpace: 'nowrap' }}>{fechaHoraChile(s.created_at)}</span>
          <span className="text-sdm-base" style={{ fontWeight: 600, color: COLORS.navy, overflowWrap: 'anywhere' }}>{nombreCompleto(s)}</span>
          <span><ProductoBadge producto={s.producto} /></span>
          <Contacto s={s} />
          <EstadoTexto s={s} />
          {expanded ? <ChevronUp size={18} style={{ color: COLORS.muted }} /> : <ChevronDown size={18} style={{ color: COLORS.muted }} />}
        </div>

        {/* Móvil */}
        <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <span className="text-sdm-base" style={{ fontWeight: 600, color: COLORS.navy, overflowWrap: 'anywhere', minWidth: 0 }}>{nombreCompleto(s)}</span>
            {expanded ? <ChevronUp size={18} style={{ color: COLORS.muted, flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: COLORS.muted, flexShrink: 0 }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <CampoMovil label="Producto"><ProductoBadge producto={s.producto} /></CampoMovil>
            <CampoMovil label="Recibida">{fechaHoraChile(s.created_at)}</CampoMovil>
            {(s.telefono || s.email) && <CampoMovil label="Contacto"><Contacto s={s} /></CampoMovil>}
            <CampoMovil label="Estado"><EstadoTexto s={s} /></CampoMovil>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          {/* ── Barra de acciones ───────────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '12px 18px', background: COLORS.bg, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {estado === 'sin_contactar' && (
                <button type="button" className="btn-green text-sdm-xs" style={{ padding: '8px 14px' }}
                  onClick={onContactado} disabled={accionEnCurso}>
                  Ya lo contacté
                </button>
              )}

              {estado === 'contactada' && (
                <>
                  <span className="text-sdm-sm" style={{ color: COLORS.muted }}>
                    Contactada el {fechaHoraChile(s.contactado_en)}
                  </span>
                  <button type="button" className="btn-primary text-sdm-xs" style={{ padding: '8px 14px' }}
                    onClick={() => setCerrarAbierto(v => !v)} disabled={accionEnCurso}>
                    Cerrar
                  </button>
                  {/* SIN `confirm()`, y es deliberado: esto borra una marca de
                      tiempo que se vuelve a poner con un clic en el botón de al
                      lado. El único que pregunta es «Reabrir», que además borra
                      el resultado elegido — información que no se recupera
                      sola. Es el mismo criterio de Captación: se confirma donde
                      se destruye algo, no en cada deshacer. */}
                  <button type="button" className="btn-text text-sdm-xs" style={{ marginLeft: 'auto' }}
                    onClick={onDeshacerContacto} disabled={accionEnCurso}>
                    Deshacer contacto
                  </button>
                </>
              )}

              {estado === 'cerrada' && (
                <>
                  <span className="text-sdm-sm" style={{ color: COLORS.muted }}>
                    Cerrada el {fechaHoraChile(s.cerrado_en)}
                  </span>
                  <button type="button" className="btn-text text-sdm-xs" style={{ marginLeft: 'auto' }}
                    onClick={onReabrir} disabled={accionEnCurso}>
                    Reabrir
                  </button>
                </>
              )}
            </div>

            {cerrarAbierto && estado === 'contactada' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="text-sdm-xs" style={{ color: COLORS.muted }}>¿Con qué resultado?</span>
                {/* Los cuatro son pares entre sí: misma variante, mismo peso. */}
                {RESULTADOS.map(r => (
                  <button key={r} type="button" className="btn-primary text-sdm-xs" style={{ padding: '8px 14px' }}
                    onClick={() => { setCerrarAbierto(false); onCerrar(r) }} disabled={accionEnCurso}>
                    {RESULTADO_LABEL[r]}
                  </button>
                ))}
                <button type="button" className="btn-text text-sdm-xs"
                  onClick={() => setCerrarAbierto(false)} disabled={accionEnCurso}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* ── Detalle del visitante ───────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: COLORS.muted, fontWeight: 600, marginBottom: 10 }}>
                Lo que envió el visitante
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                {detalle.map(f => <DRow key={f.label} label={f.label} value={f.value} />)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Filtros ───────────────────────────────────────────────────────────────────
//
// NO VIAJAN EN LA URL, igual que los de Captación: son una vista de trabajo de
// quien está mirando, no un sitio al que se vuelve ni se enlaza a nadie.
type FiltroProducto = 'todos' | ProductoCredito
type FiltroEstado = 'todos' | EstadoCiclo

const FILTROS_PRODUCTO: { key: FiltroProducto; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'hipotecario', label: 'Hipotecario' },
  { key: 'consumo', label: 'Consumo y deudas' },
  { key: 'bancarizacion', label: 'Bancarización' },
  { key: 'leaseback', label: 'Leaseback' },
]

const FILTROS_ESTADO: { key: FiltroEstado; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'sin_contactar', label: 'Sin contactar' },
  { key: 'contactada', label: 'Contactadas' },
  { key: 'cerrada', label: 'Cerradas' },
]

function Chips<T extends string>({ opciones, valor, onChange, etiqueta }: {
  opciones: { key: T; label: string }[]
  valor: T
  onChange: (v: T) => void
  etiqueta: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: COLORS.muted, fontWeight: 600, marginRight: 2 }}>{etiqueta}</span>
      {opciones.map(o => (
        <button className="text-sdm-sm" key={o.key} type="button" onClick={() => onChange(o.key)}
          aria-pressed={valor === o.key}
          style={{ padding: '7px 14px', fontWeight: 600, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${valor === o.key ? COLORS.navy : COLORS.border}`,
            background: valor === o.key ? COLORS.navy : '#fff',
            color: valor === o.key ? '#fff' : COLORS.muted,
            transition: 'all 0.15s' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Solicitudes() {
  const { authed, checking } = useAdminAuth()

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [filtroProducto, setFiltroProducto] = useState<FiltroProducto>('todos')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [accionId, setAccionId] = useState<string | null>(null)
  const [actualizadoVisible, avisarActualizado] = useGuardado()

  // ── Carga ───────────────────────────────────────────────────────────────────
  //
  // `silencioso` evita el «Cargando…» de toda la lista al recargar después de
  // marcar una fila: la lista ya está en pantalla y parpadearla entera por un
  // clic en una fila es ruido.
  //
  // El `error` NO se traga. Sin refresco automático que lo repita, un fallo de
  // lectura silencioso deja una lista vieja que parece actual — que es
  // exactamente el tipo de mentira que este admin ya pagó caro. Va a consola y
  // a un aviso en pantalla, pero no a `avisarError`: eso levanta un `alert()`,
  // que es para las ESCRITURAS.
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    const { data, error } = await supabase
      .from('solicitudes_credito')
      .select('*')
      .order('created_at', { ascending: false })
    if (!silencioso) setCargando(false)
    if (error) {
      console.error('[No se pudieron cargar las solicitudes]', error)
      setFallo(true)
      return error
    }
    setFallo(false)
    setSolicitudes((data as Solicitud[]) || [])
    return null
  }, [])

  useEffect(() => { if (authed) cargar() }, [authed, cargar])

  const refrescar = async () => {
    const error = await cargar()
    // No se canta «Actualizado» sobre una recarga fallida.
    if (!error) avisarActualizado()
  }

  // ── Escrituras ──────────────────────────────────────────────────────────────
  //
  // TODAS PASAN POR ACÁ, Y ES LO QUE HACE CUMPLIR LA REGLA DEL MÓDULO. El
  // parámetro es `CamposCiclo`, o sea `Partial<Pick<Solicitud, 'contactado_en' |
  // 'cerrado_en' | 'resultado'>>`: pasarle `sueldo_promedio`, `rut` o cualquier
  // otro campo del visitante NO COMPILA. La separación deja de depender de que
  // quien escriba el próximo botón se acuerde de leer un comentario.
  //
  // La marca de tiempo sale de `new Date().toISOString()`, en UTC, y eso es lo
  // CORRECTO para un `timestamptz`: guarda un instante, no un día de calendario.
  // La trampa documentada de `toISOString()` es la contraria —derivar de ahí la
  // FECHA en Chile—, y acá no se deriva ninguna fecha: lo que se lee en pantalla
  // pasa por `fechaHoraChile()`.
  //
  // `avisarError` CORTA con `return`: recoger el error sin cortar deja la lista
  // recargándose como si la escritura hubiera funcionado.
  const escribirCiclo = async (s: Solicitud, campos: CamposCiclo, contexto: string) => {
    setAccionId(s.id)
    const { error } = await supabase.from('solicitudes_credito').update(campos).eq('id', s.id)
    setAccionId(null)
    if (avisarError(contexto, error)) return
    cargar(true)
  }

  const marcarContactado = (s: Solicitud) =>
    escribirCiclo(s, { contactado_en: new Date().toISOString() }, 'No se pudo marcar el contacto')

  // `null` explícito, nunca `undefined`: una clave con `undefined` desaparece
  // del JSON y PostgREST no la escribe, así que el campo se quedaría como
  // estaba y el panel diría que se deshizo.
  const deshacerContacto = (s: Solicitud) =>
    escribirCiclo(s, { contactado_en: null }, 'No se pudo deshacer el contacto')

  const cerrar = (s: Solicitud, resultado: string | null) => {
    const ahora = new Date().toISOString()
    return escribirCiclo(s, {
      cerrado_en: ahora,
      resultado,
      // Cerrar implica contactado. Sin esto una solicitud cerrada sin marca de
      // contacto rompería la partición de las métricas: los tres contadores
      // dejarían de sumar el total.
      ...(s.contactado_en ? {} : { contactado_en: ahora }),
    }, 'No se pudo cerrar la solicitud')
  }

  // EL ÚNICO CON CONFIRMACIÓN, porque es el único que destruye algo que no se
  // recupera con un clic: el resultado elegido. `confirm()` y no un modal propio
  // —es el mecanismo que ya usa el resto del admin, y un modal para un solo
  // botón sería una segunda forma de preguntar lo mismo.
  //
  // `contactado_en` NO va en el payload: reabrir deshace el CIERRE, no el
  // contacto. Para eso está el otro botón.
  const reabrir = (s: Solicitud) => {
    if (!confirm(
      `¿Reabrir la solicitud de ${nombreCompleto(s)}?\n\n` +
      'Vuelve a la lista de gestiones abiertas y se borra el resultado que tenía.\n\n' +
      'La fecha de contacto se mantiene.'
    )) return
    return escribirCiclo(s, { cerrado_en: null, resultado: null }, 'No se pudo reabrir la solicitud')
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }} />
  )
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.navy }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 4, textAlign: 'center' }}>
        <p style={{ marginBottom: 16, color: COLORS.navy }}>Debes iniciar sesión.</p>
        <Link to="/admin" style={{ color: COLORS.navy, fontWeight: 600 }}>← Ir al admin</Link>
      </div>
    </div>
  )

  // LAS MÉTRICAS SE CUENTAN SOBRE EL TOTAL, NO SOBRE LO FILTRADO: son el estado
  // del embudo, no un resumen de la vista. Y salen de la MISMA lista que se
  // pinta abajo, no de consultas propias — es lo que impide que la tarjeta diga
  // 10 mientras la lista muestra 0, que es el bug que Captación tuvo que
  // arreglar.
  //
  // Los tres contadores PARTICIONAN el total: `estadoDe` devuelve exactamente
  // uno de los tres para cada fila, así que sin contactar + contactadas +
  // cerradas === total, siempre.
  const total = solicitudes.length
  const sinContactar = solicitudes.filter(s => estadoDe(s) === 'sin_contactar').length
  const contactadas = solicitudes.filter(s => estadoDe(s) === 'contactada').length
  const cerradas = solicitudes.filter(s => estadoDe(s) === 'cerrada').length

  const filtradas = solicitudes.filter(s =>
    (filtroProducto === 'todos' || s.producto === filtroProducto) &&
    (filtroEstado === 'todos' || estadoDe(s) === filtroEstado)
  )

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link className="text-sdm-sm" to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.muted, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Volver al admin
          </Link>
          <span style={{ color: COLORS.border }}>|</span>
          <span className="text-sdm-lg" style={{ fontWeight: 600, color: COLORS.navy }}>Solicitudes de crédito</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Misma forma que la píldora `Guardado` de los catorce paneles, con
              el texto que corresponde: acá se recargó, no se guardó. */}
          {actualizadoVisible && (
            <span className="text-sdm-sm" style={{ color: COLORS.greenDark, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} strokeWidth={2} aria-hidden="true" />Actualizado
            </span>
          )}
          <button className="text-sdm-sm tracking-sdm-wide" onClick={refrescar}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: COLORS.navy, color: '#fff', border: 'none', borderRadius: 2, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={15} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Métricas ──────────────────────────────────────────────────── */}
        {fallo ? (
          <div className="text-sdm-sm" style={{ color: COLORS.red, fontStyle: 'italic' }}>
            No se pudieron cargar las solicitudes. Pulsa «Actualizar» para reintentar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Stat label="Solicitudes" value={total} />
            <Stat label="Sin contactar" value={sinContactar} color={sinContactar > 0 ? 'var(--lead-warm)' : undefined} />
            <Stat label="Contactadas sin cerrar" value={contactadas} />
            <Stat label="Cerradas" value={cerradas} />
          </div>
        )}

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Chips etiqueta="Producto" opciones={FILTROS_PRODUCTO} valor={filtroProducto} onChange={v => setFiltroProducto(v)} />
          <Chips etiqueta="Estado" opciones={FILTROS_ESTADO} valor={filtroEstado} onChange={v => setFiltroEstado(v)} />
        </div>

        {/* ── Lista ─────────────────────────────────────────────────────── */}
        {cargando && solicitudes.length === 0 ? (
          <SeccionVacia>Cargando solicitudes…</SeccionVacia>
        ) : filtradas.length === 0 ? (
          <SeccionVacia>
            {total === 0 ? 'Todavía no hay solicitudes de crédito.' : 'No hay solicitudes para estos filtros.'}
          </SeccionVacia>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtradas.map(s => (
              <SolicitudRow
                key={s.id}
                s={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(prev => prev === s.id ? null : s.id)}
                onContactado={() => marcarContactado(s)}
                onDeshacerContacto={() => deshacerContacto(s)}
                onCerrar={(resultado) => cerrar(s, resultado)}
                onReabrir={() => reabrir(s)}
                accionEnCurso={accionId === s.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
