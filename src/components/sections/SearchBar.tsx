import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { getComunas } from '@/data/comunas-chile'
import { useCerrarConEscape } from '@/hooks/useCerrarConEscape'

type Tab = 'comprar' | 'arrendar' | 'internacional'

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'parcela', label: 'Parcela' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'hotel', label: 'Hotel / Inversión' },
]

const PRECIOS = [
  { value: '', label: 'Sin límite' },
  { value: '2000', label: 'Hasta UF 2.000' },
  { value: '3500', label: 'Hasta UF 3.500' },
  { value: '5000', label: 'Hasta UF 5.000' },
  { value: '8000', label: 'Hasta UF 8.000' },
  { value: '10000', label: 'Hasta UF 10.000' },
]

const REGIONES = [
  { value: '', label: 'Todas las regiones' },
  { value: 'Arica y Parinacota', label: 'Arica y Parinacota' },
  { value: 'Tarapacá', label: 'Tarapacá' },
  { value: 'Antofagasta', label: 'Antofagasta' },
  { value: 'Atacama', label: 'Atacama' },
  { value: 'Coquimbo', label: 'Coquimbo' },
  { value: 'Valparaíso', label: 'Valparaíso' },
  { value: 'R. Metropolitana', label: 'R. Metropolitana' },
  { value: "O'Higgins", label: "O'Higgins" },
  { value: 'Maule', label: 'Maule' },
  { value: 'Ñuble', label: 'Ñuble' },
  { value: 'Biobío', label: 'Biobío' },
  { value: 'La Araucanía', label: 'La Araucanía' },
  { value: 'Los Ríos', label: 'Los Ríos' },
  { value: 'Los Lagos', label: 'Los Lagos' },
  { value: 'Aysén', label: 'Aysén' },
  { value: 'Magallanes', label: 'Magallanes' },
]

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    // `aria-pressed` y NO `role="switch"`: un switch es el encendido/apagado de
    // una sola cosa —el banner promocional de Contenido—, y esto es un botón que
    // queda hundido, como el «Activa/Pausada» de la lista de propiedades. Sin
    // esto el lector decía «Comprar, botón» y «Arrendar, botón» sin ninguna
    // pista de cuál estaba elegido: el estado solo vivía en el color.
    //
    // Lo PRECISO sería un `radiogroup`, porque las dos opciones son mutuamente
    // excluyentes y `aria-pressed` no expresa esa exclusividad. Se descarta
    // porque un radiogroup exige tabulación itinerante —una sola parada para el
    // grupo, flechas entre opciones— y eso es reescribir el componente.
    <button className="text-sdm-xs tracking-sdm-wide"
      aria-pressed={active}
      onClick={onClick}
      style={{ padding: '6px 20px', fontWeight: active ? 600 : 400, textTransform: 'uppercase',
        // `--border-input` y no `--border` en la rama inactiva. Es la regla 4.1 del
        // sistema: `--border` (1,18:1) es para separaciones decorativas y
        // `--border-input` (4,06:1) para el límite de un CONTROL, que es lo que pide
        // 1.4.11. Esto es un <button> y su borde es lo único que lo delimita cuando
        // no está elegido. La versión móvil de este mismo control (más abajo) ya
        // usaba `--border-input`: el escritorio se había quedado atrás.
        border: active ? '1px solid var(--navy-dark)' : '1px solid var(--border-input)',
        borderRadius: 20,
        background: active ? 'var(--navy-dark)' : 'transparent',
        color: active ? '#fff' : 'var(--muted)',
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
    >
      {label}
    </button>
  )
}

function DropSelect({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value) || options[0]
  // `useId()` porque hay DOS DropSelect en la misma barra —Tipo y Precio— y dos
  // ids iguales no fallan: se asocian al primero y dejan al segundo apuntando al
  // panel del otro.
  const panelId = useId()
  // El `mousedown` de abajo solo cubre el ratón. Escape es la salida del teclado,
  // y devuelve el foco a este botón: el panel se desmonta al cerrarse y sin esto
  // el foco caería al <body>.
  const disparador = useRef<HTMLButtonElement>(null)
  useCerrarConEscape(open, useCallback(() => setOpen(false), []), disparador)

  // CERRAR ELIGIENDO TAMBIÉN DEVUELVE EL FOCO, no solo cerrar con Escape.
  //
  // El panel se DESMONTA al cerrarse, y con teclado el foco está dentro —en la
  // opción que acabas de pulsar—. Al desaparecer ese nodo el foco cae al
  // `<body>`, y el siguiente Tab reinicia el recorrido desde el principio del
  // documento: el usuario acaba de elegir «Casa» y el Tab lo manda al logo.
  // Es WCAG 2.4.3.
  //
  // `useCerrarConEscape` ya hacía esto para su vía; ésta se había quedado sin
  // cubrir porque la tanda de teclado miró el Escape y no la selección.
  const cerrarYEnfocar = useCallback(() => {
    setOpen(false)
    disparador.current?.focus()
  }, [])

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* `aria-expanded` dice si el panel está abierto, `aria-haspopup` que este
          botón abre una lista y `aria-controls` cuál. Sin ellos el lector anunciaba
          «Tipo · Todos los tipos, botón» y no había forma de saber que se había
          desplegado nada.
          `aria-controls` SOLO cuando está abierto: el panel se desmonta al cerrarse,
          y un IDREF a un elemento inexistente es una referencia rota. */}
      {/* `aria-haspopup="true"` Y NO `"listbox"`. Declarar `listbox` promete un
          widget que no existe: el panel es un <div> con <button> dentro, y en
          todo el proyecto hay CERO `role="listbox"` y CERO `role="option"`. El
          lector anunciaba «cuadro de lista contraído», el usuario esperaba
          flechas y un «opción 3 de 17», y no había ninguna de las dos cosas.
          Un ARIA incorrecto es peor que ninguno. Con `"true"` el patrón queda
          declarado como lo que ES —un disclosure— y `aria-expanded` +
          `aria-controls` ya lo describen bien. Implementar el listbox de verdad
          es reescribir el componente; el propio archivo ya descartó un
          `radiogroup` en `Pill` por el mismo motivo. */}
      <button className="text-sdm-sm"
        ref={disparador}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          background: value ? 'var(--navy-dark)' : '#fff',
          color: value ? '#fff' : 'var(--ink)',
          // `--border-input` en la rama sin valor — regla 4.1, igual que en `Pill`.
          border: `1px solid ${value ? 'var(--navy-dark)' : 'var(--border-input)'}`,
          borderRadius: 'var(--sdm-radio-control)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: value ? 500 : 300, transition: 'all 0.18s', whiteSpace: 'nowrap' }}
      >
        <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', opacity: 0.6, marginRight: 2 }}>{label}</span>
        {selected.label}
        <ChevronDown aria-hidden="true" size={12} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div id={panelId} style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 12px 40px rgba(15,37,53,0.12)', zIndex: 50, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); cerrarYEnfocar() }}
              className={`text-sdm-base ${opt.value === value ? 'bg-[var(--sky-pale)] text-[var(--navy-dark)]' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--off)]'}`}
              style={{ width: '100%', padding: '11px 16px', textAlign: 'left', fontWeight: 300,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
            >
              {opt.label}
              {opt.value === value && <Check aria-hidden="true" size={13} style={{ color: 'var(--green-dark)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SELECTOR REGIÓN / COMUNA ─────────────────────────────────────────────────
function RegionComunaPicker({ region, comuna, onChangeRegion, onChangeComuna }: {
  region: string
  comuna: string
  onChangeRegion: (v: string) => void
  onChangeComuna: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'region' | 'comuna'>('region')
  const ref = useRef<HTMLDivElement>(null)
  const etiquetaId = useId()
  // El panel de este selector no tenía `id` ni el disparador `aria-controls`,
  // a diferencia de `DropSelect`. Mismo criterio que allá: el IDREF solo
  // mientras el panel existe en el DOM.
  const panelId = useId()
  // Ídem que en `DropSelect`. Acá importa aún más: este panel lista 17 regiones
  // o hasta 52 comunas, así que sin Escape la única salida del teclado era
  // recorrerlas todas y elegir una.
  const disparador = useRef<HTMLButtonElement>(null)
  useCerrarConEscape(open, useCallback(() => setOpen(false), []), disparador)

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const comunas = region ? getComunas(region) : []
  const label = comuna ? comuna : region ? region : 'Región o comuna...'
  const hasValue = !!(region || comuna)

  // Mismo criterio que en `DropSelect`: cerrar eligiendo devuelve el foco al
  // disparador. Acá sólo en los DOS puntos donde el panel se cierra de verdad —
  // elegir región con valor pasa al paso «comuna» y el panel sigue abierto, así
  // que ahí mover el foco sería sacarlo de una lista que el usuario aún usa.
  const cerrarYEnfocar = useCallback(() => {
    setOpen(false)
    disparador.current?.focus()
  }, [])

  const handleRegion = (v: string) => {
    onChangeRegion(v)
    onChangeComuna('')
    if (v) setStep('comuna')
    else { cerrarYEnfocar() }
  }

  const handleComuna = (v: string) => {
    onChangeComuna(v)
    cerrarYEnfocar()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeRegion('')
    onChangeComuna('')
    setStep('region')
  }

  return (
    <div ref={ref} className="relative" style={{ flex: 1 }}>
      {/* Trigger. El <button> va superpuesto y transparente en vez de ser el
          contenedor: adentro está la X de limpiar, y un botón dentro de otro es
          inválido. La X lleva position:relative para quedar por encima. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff',
          // `--border-input` en reposo — regla 4.1. Éste es el control principal del
          // buscador y el que más depende de su borde: no tiene relleno propio.
          border: `1.5px solid ${open ? 'var(--navy-dark)' : 'var(--border-input)'}`,
          borderRadius: 'var(--sdm-radio-control)', padding: '0 16px', transition: 'border-color 0.2s', cursor: 'pointer',
          height: 46, position: 'relative',
        }}
      >
        {/* `aria-haspopup="true"`, mismo criterio que en `DropSelect`. */}
        <button
          type="button"
          ref={disparador}
          aria-labelledby={etiquetaId}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={open ? panelId : undefined}
          onClick={() => { setOpen(v => !v); setStep(region && !comuna ? 'comuna' : 'region') }}
          style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        />
        <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span id={etiquetaId} className="text-sdm-base" style={{ flex: 1, fontWeight: 300, color: hasValue ? 'var(--ink)' : 'var(--muted)', fontFamily: 'inherit', position: 'relative' }}>
          {label}
        </span>
        {hasValue && (
          <button type="button" aria-label="Quitar la región y la comuna elegidas" onClick={handleClear} style={{ position: 'relative', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
            <X aria-hidden="true" size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div id={panelId} style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', minWidth: 280, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 12px 40px rgba(15,37,53,0.12)', zIndex: 50, overflow: 'hidden' }}>

          {/* Tabs región / comuna */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button className="text-sdm-xs tracking-sdm-wide"
              onClick={() => setStep('region')}
              style={{ flex: 1, padding: '10px 0', fontWeight: step === 'region' ? 600 : 400, textTransform: 'uppercase', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: step === 'region' ? 'var(--navy-dark)' : 'var(--muted)', borderBottom: step === 'region' ? '2px solid var(--navy-dark)' : '2px solid transparent' }}
            >
              Región
            </button>
            <button className="text-sdm-xs tracking-sdm-wide"
              onClick={() => region && setStep('comuna')}
              style={{ flex: 1, padding: '10px 0', fontWeight: step === 'comuna' ? 600 : 400, textTransform: 'uppercase', border: 'none', background: 'none', cursor: region ? 'pointer' : 'not-allowed', fontFamily: 'inherit', color: step === 'comuna' ? 'var(--navy-dark)' : 'var(--muted)', borderBottom: step === 'comuna' ? '2px solid var(--navy-dark)' : '2px solid transparent', opacity: region ? 1 : 0.5 }}
            >
              Comuna
            </button>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {step === 'region' && REGIONES.map(r => (
              <button key={r.value} onClick={() => handleRegion(r.value)}
                className={`text-sdm-base ${r.value === region ? 'bg-[var(--sky-pale)] text-[var(--navy-dark)]' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--off)]'}`}
                style={{ width: '100%', padding: '11px 16px', textAlign: 'left', fontWeight: 300,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
              >
                {r.label}
                {r.value === region && <Check aria-hidden="true" size={13} style={{ color: 'var(--green-dark)' }} />}
              </button>
            ))}
            {step === 'comuna' && comunas.map(c => (
              <button key={c} onClick={() => handleComuna(c)}
                className={`text-sdm-base ${c === comuna ? 'bg-[var(--sky-pale)] text-[var(--navy-dark)]' : 'bg-transparent text-[var(--muted)] hover:bg-[var(--off)]'}`}
                style={{ width: '100%', padding: '11px 16px', textAlign: 'left', fontWeight: 300,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
              >
                {c}
                {c === comuna && <Check aria-hidden="true" size={13} style={{ color: 'var(--green-dark)' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SearchBar() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('comprar')
  const [region, setRegion] = useState('')
  const [comuna, setComuna] = useState('')
  const [tipo, setTipo] = useState('')
  const [precio, setPrecio] = useState('')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (tab === 'comprar')       params.set('estado', 'en_venta')
    if (tab === 'arrendar')      params.set('estado', 'en_arriendo')
    if (tab === 'internacional') params.set('internacional', 'true')
    if (tipo)                    params.set('tipo', tipo)
    if (region)                  params.set('region', region)
    if (comuna)                  params.set('comuna', comuna)
    if (precio)                  params.set('precio_max', precio)
    // `/propiedades` y NO `/propiedades-usadas`: esa ruta fuerza
    // `categoria=usada`, así que cualquier búsqueda —con o sin filtros—
    // escondía los 13 proyectos nuevos. El buscador no pregunta por categoría,
    // así que no debe imponer una.
    navigate(`/propiedades?${params.toString()}`)
  }

  const handleRegionChange = (v: string) => {
    setRegion(v)
    setComuna('')
  }

  return (
    /* UNA SUPERFICIE SÓLIDA SOBRE LA FOTO, NO UNA BANDA DEBAJO.
       Antes era una franja a lo ancho: `--off` en escritorio y `--navy-dark` en
       móvil. En móvil eso la dejaba colgando de un hero también oscuro, sin
       borde que la separara — se leía como parte del fondo y no como la
       herramienta principal. En escritorio no se camuflaba, pero tampoco
       destacaba: era una franja de filtros más, debajo del hero.

       Se separa por CONTRASTE DE SUPERFICIE, no por elevación: blanco sobre la
       foto, borde de 1px en `--border-input` y radio de contenedor. Nada de
       sombras difusas — el sistema usa bordes finos y esto no es una excepción
       por ser el elemento más visible del home.

       YA NO SE MONTA SOBRE EL HERO. Llevaba `marginTop: -48` para subir sobre
       el borde inferior de la foto; desde que `DualCTASection` va entre los
       dos, ese margen la metía 48 px dentro de las tarjetas de arriba y tapaba
       sus botones. El aire de arriba lo pone el relleno inferior de esa
       sección. `position` y `zIndex` se quedan: los desplegables tienen que
       pintar encima del banner y de las destacadas. */
    <div style={{ position: 'relative', zIndex: 10, padding: '0 clamp(16px,5vw,48px) 28px' }}>
      {/* SIN `overflow: hidden`, Y ESTO NO ES UN DETALLE.
          Lo puse al convertir el buscador en tarjeta, por reflejo, «para que el
          radio recorte el contenido». Recortaba los cuatro desplegables: el
          panel de Tipo mide 314px y quedaban 13 VISIBLES —ni una fila, que
          miden 45—. El buscador del Inicio dejó de servir desde ese despliegue.
          NO HACÍA FALTA PARA NADA: los dos únicos hijos de esta tarjeta son
          contenedores con `padding` y sin fondo propio, así que ninguna
          superficie llega a las esquinas y el radio de 4px no tiene qué cortar.
          Comprobado con un píxel a píxel del buscador cerrado: idéntico.
          Los paneles son `position: absolute` dentro de este árbol, así que
          bastaba con dejar de recortarlos; no hace falta portal ni `fixed`. */}
      <div style={{ background: '#fff', border: '1px solid var(--border-input)', borderRadius: 'var(--sdm-radio-contenedor)', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block" style={{ padding: '20px clamp(16px,5vw,48px)' }}>
        {/* Fila 1: pills + región/comuna + buscar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2">
            <Pill label="Comprar" active={tab === 'comprar'} onClick={() => setTab('comprar')} />
            <Pill label="Arrendar" active={tab === 'arrendar'} onClick={() => setTab('arrendar')} />
          </div>

          <RegionComunaPicker
            region={region}
            comuna={comuna}
            onChangeRegion={handleRegionChange}
            onChangeComuna={setComuna}
          />

          <button className="text-sdm-sm tracking-sdm-wide btn-green" onClick={handleSearch}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
          >
            <Search aria-hidden="true" size={14} /> Buscar
          </button>
        </div>

        {/* Fila 2: filtros opcionales */}
        <div className="flex items-center gap-3">
          <span className="text-sdm-xs tracking-sdm-wide" style={{ color: 'var(--muted)', textTransform: 'uppercase', marginRight: 4 }}>Filtrar por</span>
          <DropSelect label="Tipo · " options={TIPOS} value={tipo} onChange={setTipo} />
          <DropSelect label="Precio · " options={PRECIOS} value={precio} onChange={setPrecio} />
          {(tipo || precio || region || comuna) && (
            <button className="text-sdm-sm" onClick={() => { setTipo(''); setPrecio(''); setRegion(''); setComuna('') }}
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="md:hidden" style={{ padding: 16 }}>
        <div className="flex gap-2 mb-3">
          {([
            { key: 'comprar', label: 'Comprar' },
            { key: 'arrendar', label: 'Arrendar' },
          ] as { key: Tab; label: string }[]).map(item => (
            /* `aria-pressed` como los `Pill` de escritorio. Estos eran
               <button> sueltos y no lo llevaban: la misma asimetría que el
               rediseño cierra. */
            <button className="text-sdm-xs tracking-sdm-wide area-44" key={item.key} aria-pressed={tab === item.key} onClick={() => setTab(item.key)}
              style={{ flex: 1, padding: '7px 4px', fontWeight: 600, textTransform: 'uppercase', border: tab === item.key ? '1px solid var(--navy-dark)' : '1px solid var(--border-input)', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: tab === item.key ? 'var(--navy-dark)' : 'transparent', color: tab === item.key ? '#fff' : 'var(--muted)' }}
            >{item.label}</button>
          ))}
        </div>

        {/* Región mobile */}
        {/* El contenedor es <label> y el rótulo <span>: ya había un rótulo
            visible, solo que sin asociar. `display: block` es obligatorio en
            los dos — un <label> y un <span> son inline por defecto, y estos
            div llevaban padding, borde y marginBottom de bloque. */}
        {/* LOS <select> VAN A 16px, Y NO ES UNA ELECCIÓN TIPOGRÁFICA.
            Safari en iOS hace ZOOM automático sobre cualquier control de
            formulario con `font-size` menor a 16px, y NO vuelve al nivel
            anterior al cerrar el selector: el usuario se queda con la página
            ampliada y desplazada, y tiene que hacer pinch para volver. Con
            cuatro controles seguidos —Región, Comuna, Tipo, Precio— pasaba
            cuatro veces en la ruta principal del tráfico móvil.
            `.input-line` de globals.css ya declaraba `text-[16px]` contra la
            escala por este mismo motivo; el buscador se había quedado en 13.
            NO se usa `maximum-scale=1` en el viewport: eso apaga el zoom para
            todo el mundo, que es el anti-patrón que esto evita.
            El rótulo de encima sigue identificando el campo, así que la
            densidad visual no se resiente. */}
        <label className="mb-2" style={{ display: 'block', background: 'var(--off)', border: '1px solid var(--border-input)', borderRadius: 'var(--sdm-radio-control)', padding: '8px 12px' }}>
          <span className="text-sdm-xs tracking-sdm-wide" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 2 }}>Región</span>
          {/* `minHeight: 44` Y NO `.area-44`: sobre un <select> el pseudo-elemento
              NO se renderiza —es un elemento reemplazado— así que la clase se
              computa y no amplía nada. Medido por hit-test: 22×22 efectivo. El
              área tiene que salir del alto del control. */}
          <select value={region} onChange={e => { setRegion(e.target.value); setComuna('') }}
            style={{ minHeight: 44, background: 'transparent', border: 'none', color: 'var(--ink)', fontFamily: 'inherit', width: '100%', cursor: 'pointer', fontSize: '16px' }}>
            {REGIONES.map(r => <option key={r.value} value={r.value} style={{ color: 'var(--ink)', background: '#fff' }}>{r.label}</option>)}
          </select>
        </label>

        {/* Comuna mobile */}
        {/* UNA SOLA ATENUACIÓN POR CONTROL. El `opacity: 0.5` se queda acá, en el
            <label> que envuelve, y el <select> de dentro perdió el suyo: los dos
            juntos daban 0,25 efectivo y el campo no parecía deshabilitado sino
            ausente. La pestaña «Comuna» tenía el mismo problema por otra vía —
            `--border` como color de TEXTO, 1,18:1, y encima su propio 0.5.
            WCAG exime del contraste a los deshabilitados, así que el criterio no
            es un ratio sino que se DISTINGA del habilitado; el sistema ya fijó
            una sola regla al 50 % en globals.css y esto la respeta. */}
        <label className="mb-3" style={{ display: 'block', background: 'var(--off)', border: '1px solid var(--border-input)', opacity: region ? 1 : 0.5, borderRadius: 'var(--sdm-radio-control)', padding: '8px 12px' }}>
          <span className="text-sdm-xs tracking-sdm-wide" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 2 }}>Comuna</span>
          <select value={comuna} onChange={e => setComuna(e.target.value)} disabled={!region}
            style={{ minHeight: 44, background: 'transparent', border: 'none', color: 'var(--ink)', fontFamily: 'inherit', width: '100%', cursor: region ? 'pointer' : 'not-allowed', fontSize: '16px' }}>
            <option value="" style={{ color: 'var(--ink)', background: '#fff' }}>{region ? 'Todas las comunas' : 'Primero elige región'}</option>
            {region && getComunas(region).map(c => <option key={c} value={c} style={{ color: 'var(--ink)', background: '#fff' }}>{c}</option>)}
          </select>
        </label>

        <div className="flex gap-2 mb-3">
          {[{ label: 'Tipo', options: TIPOS, value: tipo, onChange: setTipo }, { label: 'Precio', options: PRECIOS, value: precio, onChange: setPrecio }].map(f => (
            <label key={f.label} style={{ display: 'block', flex: 1, background: 'var(--off)', border: '1px solid var(--border-input)', borderRadius: 'var(--sdm-radio-control)', padding: '8px 12px' }}>
              <span className="text-sdm-xs tracking-sdm-wide" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 2 }}>{f.label}</span>
              <select value={f.value} onChange={e => f.onChange(e.target.value)} style={{ minHeight: 44, background: 'transparent', border: 'none', color: 'var(--ink)', fontFamily: 'inherit', width: '100%', cursor: 'pointer', fontSize: '16px' }}>
                {f.options.map(o => <option key={o.value} value={o.value} style={{ color: 'var(--ink)', background: '#fff' }}>{o.label}</option>)}
              </select>
            </label>
          ))}
        </div>

        <button className="text-sdm-sm tracking-sdm-wide btn-green" onClick={handleSearch} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'var(--green-dark)', color: '#fff', border: 'none', borderRadius: 'var(--sdm-radio-control)', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
          <Search aria-hidden="true" size={14} /> Buscar
        </button>
      </div>
    </div>
    </div>
  )
}