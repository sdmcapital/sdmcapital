import { useState, useEffect, useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Banknote, Building2, ClipboardList, CreditCard, ExternalLink, FileText, HeartHandshake, KeyRound, LogOut, Lock, Menu, MessageCircle, PenLine, Tag, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePointerSort } from '@/components/admin/useDragSort'
import Mensajes from '@/pages/admin/Mensajes'
import Blog from '@/pages/admin/Blog'
import Equipo from '@/pages/admin/Equipo'
import Asociados from '@/pages/admin/Asociados'
import PaginasLegales from '@/pages/admin/PaginasLegales'
import Contenido from '@/pages/admin/Contenido'
import Barranco from '@/pages/admin/Barranco'
import Rental from '@/pages/admin/Rental'
import Vende from '@/pages/admin/Vende'
import Propiedades from '@/pages/admin/Propiedades'
import { CotizacionesAdmin } from '@/components/cotizaciones/CotizacionesAdmin'
import { TarjetasEquipo } from '@/components/tarjetas/TarjetasEquipo'

type Tab = 'propiedades' | 'blog' | 'equipo' | 'asociados' | 'mensajes' | 'contenido' | 'barranco' | 'cotizaciones' | 'tarjetas' | 'legal' | 'rental' | 'vende'

// ─── AUTH ─────────────────────────────────────────────────────────────────────
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

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-dark)' }}>
      <div className="bg-white p-12 w-full max-w-sm" style={{ borderRadius: 2 }}>
        <div className="logo-stripes mb-6"><div className="logo-stripe logo-stripe--sky" /><div className="logo-stripe logo-stripe--green" /><div className="logo-stripe logo-stripe--navy" /></div>
        <h1 className="font-serif font-light mb-1 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>Admin</h1>
        <p className="text-sdm-base" style={{ color: 'var(--muted)', marginBottom: 28 }}>SDM Capital · Panel de gestión</p>
        <form onSubmit={login} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-line" placeholder="admin@sdmcapital.cl" autoComplete="username" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Contraseña</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-line" placeholder="••••••••" autoComplete="current-password" />
          </label>
          {error && <p className="text-sdm-sm" style={{ color: 'var(--error)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary justify-center mt-2">{loading ? 'Ingresando…' : 'Ingresar →'}</button>
        </form>
      </div>
    </div>
  )
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const DEFAULT_TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'propiedades',  label: 'Propiedades',     icon: Building2 },
  { key: 'cotizaciones', label: 'Cotizaciones',    icon: ClipboardList },
  { key: 'blog',         label: 'Blog',            icon: FileText },
  { key: 'equipo',       label: 'Equipo',          icon: Users },
  { key: 'asociados',    label: 'Asociados',       icon: HeartHandshake },
  { key: 'mensajes',     label: 'Mensajes',        icon: MessageCircle },
  { key: 'contenido',    label: 'Textos del sitio',icon: PenLine },
  { key: 'barranco',     label: 'El Barranco',     icon: Building2 },
  { key: 'tarjetas',     label: 'Tarjetas',        icon: CreditCard },
  { key: 'legal',        label: 'Páginas Legales', icon: Lock },
  { key: 'rental',       label: 'Rental',          icon: KeyRound },
  { key: 'vende',        label: 'Vende con nosotros', icon: Tag },
]

const STORAGE_KEY = 'sdm_admin_tab_order'

function loadTabOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_TABS
    const order: string[] = JSON.parse(saved)
    const sorted = order.map(key => DEFAULT_TABS.find(t => t.key === key)).filter(Boolean) as typeof DEFAULT_TABS
    DEFAULT_TABS.forEach(t => { if (!sorted.find(s => s.key === t.key)) sorted.push(t) })
    return sorted
  } catch { return DEFAULT_TABS }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { authed, checking } = useAdminAuth()
  const [tab, setTab] = useState<Tab>('propiedades')
  const [tabs, setTabs] = useState(loadTabOrder)
  const [menuAbierto, setMenuAbierto] = useState(false)

  // El sidebar no usa `useDragSort` sino solo su mecánica: su orden vive en
  // localStorage y en este estado local, no llega por props, así que la
  // sincronización que hace `useDragSort` acá sobraría y pelearía.
  const { arrastrando, filaProps, manijaProps } = usePointerSort(tabs, setTabs, next =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(t => t.key))))

  // Alto real del header, medido justo antes de abrir el cajón. Ver el comentario
  // del efecto: mientras el cajón está abierto el header deja de ser `sticky` y
  // pasa a `fixed`, y este número es el relleno que compensa que salga del flujo.
  const header = useRef<HTMLDivElement>(null)
  const [altoHeader, setAltoHeader] = useState(0)
  const abrirMenu = () => {
    setAltoHeader(header.current?.getBoundingClientRect().height ?? 0)
    setMenuAbierto(true)
  }

  // El cajón se cierra con Escape y mientras está abierto el fondo no scrollea.
  // Solo corre mientras está abierto, y en escritorio nunca se abre, así que ni
  // el listener ni el bloqueo existen ahí.
  useEffect(() => {
    if (!menuAbierto) return

    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAbierto(false) }
    window.addEventListener('keydown', alTeclear)

    // Se guarda lo que había, no un valor fijo. Si mañana alguien pone algo en
    // body desde otro lado, o si este efecto se interrumpe a mitad, el sitio
    // tiene que volver exactamente a como estaba y no a un `overflow: visible`
    // inventado por nosotros.
    const estilo = document.body.style
    const previo = {
      overflow: estilo.overflow, position: estilo.position,
      top: estilo.top, left: estilo.left, right: estilo.right, width: estilo.width,
    }
    const scrollPrevio = window.scrollY

    // `overflow: hidden` sobre body NO alcanza en iOS: Safari sigue scrolleando
    // el documento igual. Lo único que lo detiene es sacar el body del flujo con
    // `position: fixed`, y eso tiene un precio — el body deja de estar
    // desplazado, así que hay que compensarlo con `top: -scrollY` para que la
    // página se vea donde estaba, y devolver el scroll a mano al cerrar. Sin
    // esas dos cosas el cajón te deja arriba del todo cada vez que lo cierras.
    //
    // Y hay un segundo precio, medido: con esto el header sticky se va de la
    // pantalla. No es un defecto de esta técnica sino de todas — `sticky` ES
    // función del scroll, y si el documento deja de scrollear el header vuelve a
    // su posición natural, que a scroll 1200 está 1200 px por encima del
    // viewport. Comprobado con las tres variantes (`position: fixed`,
    // `overflow: hidden` en body, y en html + body): las tres dan
    // header.top = −1200. Por eso mientras el cajón está abierto el header pasa
    // a `fixed` y el contenedor lleva un relleno de su alto, para que el
    // contenido no salte al sacarlo del flujo.
    estilo.overflow = 'hidden'
    estilo.position = 'fixed'
    estilo.top = `-${scrollPrevio}px`
    estilo.left = '0'
    estilo.right = '0'
    estilo.width = '100%'

    return () => {
      window.removeEventListener('keydown', alTeclear)
      Object.assign(estilo, previo)
      // `instant` a propósito: globals.css pone `scroll-behavior: smooth` en
      // html, y sin esto la vuelta a la posición se ve como un salto animado.
      window.scrollTo({ top: scrollPrevio, behavior: 'instant' })
    }
  }, [menuAbierto])

  if (checking) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-dark)' }}><div className="font-serif italic text-sdm-xl" style={{ color: 'rgba(255,255,255,0.7)' }}>Verificando sesión…</div></div>
  if (!authed)  return <LoginForm />

  return (
    // --admin-header-h es la ÚNICA definición de la altura del header. La usan
    // el propio header (que la fuerza de lg para arriba) y el aside, que se
    // posiciona justo debajo. Antes eran dos números sueltos: el header medía
    // 79,5 px y el aside arrancaba en 57, así que el header le tapaba los
    // primeros 22 px. Medido con getBoundingClientRect: 79,50 px.
    <div className="min-h-screen bg-[var(--off)]"
      style={{ '--admin-header-h': '80px', paddingTop: menuAbierto ? altoHeader : undefined } as React.CSSProperties}>
      <div ref={header}
        className={`bg-white border-b border-[var(--border)] px-4 lg:px-8 py-4 flex items-center justify-between z-40 lg:h-[var(--admin-header-h)] ${menuAbierto ? 'fixed top-0 left-0 right-0' : 'sticky top-0'}`}>
        <div className="flex items-center gap-3">
          <button onClick={abrirMenu} aria-label="Abrir menú" aria-expanded={menuAbierto}
            className="lg:hidden flex items-center justify-center -ml-1 p-1"
            style={{ color: 'var(--navy-dark)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Menu aria-hidden="true" size={22} strokeWidth={1.75} />
          </button>
          <div className="logo-stripes"><div className="logo-stripe logo-stripe--sky"/><div className="logo-stripe logo-stripe--green"/><div className="logo-stripe logo-stripe--navy"/></div>
          <div>
            <div className="font-serif text-sdm-xl tracking-sdm-wide" style={{ color: 'var(--navy-dark)' }}>SDM Capital</div>
            <div className="hidden lg:block text-sdm-xs tracking-sdm-wide" style={{ color: 'var(--muted)', textTransform: 'uppercase' }}>Panel Admin</div>
          </div>
        </div>
        <div className="flex items-center gap-4 lg:gap-5">
          <a className="text-sdm-sm tracking-sdm-wide" href="/" target="_blank" title="Ver sitio" style={{ color: 'var(--muted)', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="hidden lg:inline">Ver sitio </span><ExternalLink size={14} strokeWidth={2} /></a>
          <button className="text-sdm-sm tracking-sdm-wide" onClick={() => supabase.auth.signOut()} title="Cerrar sesión" style={{ color: 'var(--muted)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="hidden lg:inline">Cerrar sesión</span><LogOut aria-hidden="true" size={14} strokeWidth={2} className="lg:hidden" /></button>
        </div>
      </div>

      {/* Backdrop del cajón. Solo existe en móvil y con el cajón abierto. */}
      {menuAbierto && (
        <div onClick={() => setMenuAbierto(false)} aria-hidden
          className="lg:hidden fixed inset-0 z-40" style={{ background: 'rgba(15,37,53,0.45)' }} />
      )}

      <div className="flex overflow-visible">
        {/* Debajo de lg es un cajón que se superpone; de lg para arriba, el
            sidebar fijo de siempre, anclado bajo el header.

            `h-screen h-[100dvh]`, LOS DOS, Y EN ESE ORDEN.
            En iOS `100vh` es el viewport GRANDE —el de las barras retraídas—,
            así que este cajón medía ~800 px cuando lo visible eran ~680. Sus
            789 px de contenido CABÍAN dentro de esos 800, de modo que
            `overflow-y-auto` no tenía nada que scrollear y los últimos ~110 px
            quedaban detrás de la barra de Safari: se veía «Ficha para cliente»
            —que termina en 681— y no se llegaba a «Agentes» ni a «Captación».
            El rebote hacia arriba era el gesto sin ancestro scrollable, contra
            el `body` en `position: fixed` del bloqueo del cajón.

            NO ERA EL `overflow-x: hidden` QUE ROMPE `sticky`: los tres sitios
            donde vive esa regla —html y body en `globals.css`, body en
            `mobile.css`— están en `clip`, y ninguna regla de `mobile.css`
            alcanza a este `<aside>`. Se revisaron los once selectores sueltos
            del archivo.

            `100dvh` es el viewport dinámico y mide lo que de verdad se ve.
            `h-screen` se queda como respaldo para navegadores sin `dvh`
            (anteriores a Safari 15.4 / Chrome 108). En un SE ya funcionaba
            —789 no cabe en 667— y por eso el bug solo salía en pantallas
            grandes.

            EL RESPALDO VA CON `supports-[...]`, Y NO COMO `h-screen h-[100dvh]`
            A SECAS. Medido sobre el CSS compilado: Tailwind emite
            `.h-\[100dvh\]` en el offset 15841 y `.h-screen` en el 15935, o sea
            el valor arbitrario ANTES. Con la misma especificidad gana la
            última, así que el par escrito así dejaba `100vh` pisando al `dvh` y
            el arreglo no habría hecho nada. El orden en el `className` no
            decide nada: decide el orden en la hoja. `@supports` sale del
            empate porque se emite después y añade su propia condición.

            De `lg` para arriba manda `lg:h-[calc(100vh-...)]`, que va dentro de
            su media query y por tanto después en el CSS: ahí no hay barras
            dinámicas y `100vh` es lo correcto.

            `overscrollBehavior: 'contain'` corta la propagación del gesto al
            documento cuando se llega al tope. Mismo recurso que ya usan
            `ReservaModal` y `SolicitudCreditoModal`. */}
        <aside style={{ overscrollBehavior: 'contain' }}
          className={`fixed left-0 top-0 h-screen supports-[height:100dvh]:h-[100dvh] w-64 z-50 overflow-y-auto bg-white border-r border-[var(--border)] py-6 transition-transform duration-200 lg:transition-none lg:w-56 lg:z-30 lg:top-[var(--admin-header-h)] lg:h-[calc(100vh-var(--admin-header-h))] lg:translate-x-0 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="lg:hidden flex items-center justify-between" style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Secciones</span>
            <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú"
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="flex text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', padding: '0 16px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8, alignItems: 'center', gap: 6 }}>
            <svg width="10" height="14" viewBox="0 0 10 14" fill="var(--muted)"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="7" r="1.5"/><circle cx="8" cy="7" r="1.5"/><circle cx="2" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/></svg>
            Arrastra para ordenar
          </div>
          {tabs.map((t, i) => (
            // <button> y no <div>: cambia de pestaña, así que trae foco, Enter
            // y Espacio sin código. `filaProps` solo esparce data-*,
            // onPointerDown y onClickCapture, que funcionan igual acá.
            // `aria-current` marca la pestaña activa, que hasta ahora solo se
            // distinguía por el color y el borde izquierdo.
            <button key={t.key} type="button" {...filaProps(i)}
              aria-current={tab === t.key ? 'page' : undefined}
              onClick={() => { setTab(t.key); setMenuAbierto(false) }} className="flex items-center gap-3 transition-all duration-150 text-sdm-sm"
              style={{ width: '100%', textAlign: 'left', border: 'none', fontFamily: 'inherit', padding: '11px 16px', fontWeight: tab === t.key ? 600 : 300, color: tab === t.key ? 'var(--navy-dark)' : 'var(--muted)', background: tab === t.key ? 'var(--sky-pale)' : 'transparent', borderLeft: tab === t.key ? '3px solid var(--green)' : '3px solid transparent', cursor: 'grab', userSelect: 'none', opacity: arrastrando === i ? 0.45 : 1 }}>
              {/* El relleno le da al dedo un blanco de ~20x36 sobre un icono de
                  8x12; los márgenes negativos se lo devuelven a la fila para que
                  no crezca. */}
              <span {...manijaProps} className="flex items-center" style={{ ...manijaProps.style, padding: '12px 6px', margin: '-12px -2px -12px -6px', flexShrink: 0 }}>
                <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" style={{ opacity: 0.3 }}><circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/><circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/><circle cx="2" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/></svg>
              </span>
              <t.icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {t.label}
            </button>
          ))}
          {/* ── Herramientas ── */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', padding: '0 16px 8px' }}>Herramientas</div>
            <RouterLink className="text-sdm-sm text-[var(--muted)] hover:text-[var(--navy-dark)] hover:bg-[var(--sky-pale)]" to="/admin/ficha-cliente" onClick={() => setMenuAbierto(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontWeight: 300, textDecoration: 'none', borderLeft: '3px solid transparent', transition: 'all 0.15s' }}>
              <FileText size={15} style={{ flexShrink: 0 }} />
              Ficha para cliente
            </RouterLink>
            <RouterLink className="text-sdm-sm text-[var(--muted)] hover:text-[var(--navy-dark)] hover:bg-[var(--sky-pale)]" to="/admin/agentes" onClick={() => setMenuAbierto(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontWeight: 300, textDecoration: 'none', borderLeft: '3px solid transparent', transition: 'all 0.15s' }}>
              <Users size={15} style={{ flexShrink: 0 }} />
              Agentes
            </RouterLink>
            <RouterLink className="text-sdm-sm text-[var(--muted)] hover:text-[var(--navy-dark)] hover:bg-[var(--sky-pale)]" to="/admin/captacion" onClick={() => setMenuAbierto(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontWeight: 300, textDecoration: 'none', borderLeft: '3px solid transparent', transition: 'all 0.15s' }}>
              <MessageCircle size={15} style={{ flexShrink: 0 }} />
              Captación
            </RouterLink>
            {/* `Banknote` y no `CreditCard`: ese ya es el de «Tarjetas», y dos
                entradas con el mismo icono se buscan mal en una lista lateral. */}
            <RouterLink className="text-sdm-sm text-[var(--muted)] hover:text-[var(--navy-dark)] hover:bg-[var(--sky-pale)]" to="/admin/solicitudes" onClick={() => setMenuAbierto(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontWeight: 300, textDecoration: 'none', borderLeft: '3px solid transparent', transition: 'all 0.15s' }}>
              <Banknote size={15} style={{ flexShrink: 0 }} />
              Solicitudes de crédito
            </RouterLink>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-8 xl:p-10 lg:ml-56">
          {/* Las pestañas son estado de React, no rutas, así que el salto a
              Contenido que ofrece la etiqueta de Propiedades viaja como
              callback desde acá. */}
          {tab === 'propiedades'  && <Propiedades onIrAContenido={() => setTab('contenido')} />}
          {tab === 'cotizaciones' && <CotizacionesAdmin />}
          {tab === 'blog'         && <Blog />}
          {tab === 'equipo'       && <Equipo />}
          {tab === 'asociados'    && <Asociados />}
          {tab === 'mensajes'     && <Mensajes />}
          {tab === 'contenido'    && <Contenido />}
          {tab === 'barranco'     && <Barranco />}
          {tab === 'tarjetas'     && <TarjetasEquipo />}
          {tab === 'legal'        && <PaginasLegales />}
          {tab === 'rental'       && <Rental />}
          {tab === 'vende'        && <Vende />}
        </main>
      </div>
    </div>
  )
}