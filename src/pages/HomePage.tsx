import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '@/hooks/useLang'
import { supabase } from '@/lib/supabase'
import { useContenido } from '@/hooks/useContenido'
import HeroSection from '@/components/sections/HeroSection'
import DualCTASection from '@/components/sections/DualCTASection'
import SearchBar from '@/components/sections/SearchBar'
import BannerPromo from '@/components/sections/BannerPromo'
import SEO from '@/components/SEO'
import ContactSection from '@/components/sections/ContactSection'
import BlogPreviewSection from '@/components/sections/BlogPreviewSection'
import PropertyCard from '@/components/ui/PropertyCard'
import Esqueleto from '@/components/ui/Esqueleto'
import SolicitudCreditoModal from '@/components/credito/SolicitudCreditoModal'
import type { Propiedad } from '@/types'

// Acá vivía SAMPLE_PROPS: seis propiedades inventadas que se pintaban hasta que
// llegaba la consulta. Ver la nota de Esqueleto.tsx y SINCRONIA.md.

// Mismas proporciones que PropertyCard —foto 4/3 y el cuerpo con p-5 lg:p-6—
// para que la grilla no cambie de alto cuando llegan las de verdad.
function EsqueletoPropiedad() {
  return (
    <div style={{ background: '#fff' }}>
      <Esqueleto aspecto="4/3" radio={0} />
      <div className="p-5 lg:p-6">
        <Esqueleto alto={26} ancho="45%" style={{ marginBottom: 10 }} />
        <Esqueleto alto={18} style={{ marginBottom: 6 }} />
        <Esqueleto alto={18} ancho="70%" style={{ marginBottom: 14 }} />
        <Esqueleto alto={16} ancho="55%" style={{ marginBottom: 16 }} />
        <div className="flex gap-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <Esqueleto alto={38} ancho={54} />
          <Esqueleto alto={38} ancho={54} />
          <Esqueleto alto={38} ancho={54} />
        </div>
      </div>
    </div>
  )
}


// Acá vivían tres testimonios inventados —María Sánchez, Carlos González,
// Isabel Ríos— que se usaban como default cuando la clave estaba vacía. Es la
// misma regla que ya cerró SAMPLE_PROPS: nada de datos de muestra en
// producción. Sin default, una ranura vacía se descarta y si no queda ninguna
// la sección no se dibuja.

// ─── TESTIMONIOS ──────────────────────────────────────────────────────────────
//
// Era un carrusel de cinco con rotación automática, flechas, contador 01/05 y
// puntos. Quedaron DOS, así que la rotación se fue entera y con ella todos sus
// controles: sin movimiento no hay nada que pausar, y 2.2.2 deja de aplicar.
//
// Se quitaron los tres firmados por «Equipo SDM» porque no eran testimonios
// sino casos narrados por la empresa, y duplicaban el bloque de blog que está
// justo debajo — uno de ellos era literalmente el teaser de un artículo, con
// enlace a ese artículo. Las claves 3 a 8 siguen disponibles en el admin para
// testimonios reales futuros; el filtro por `texto` las ignora mientras estén
// vacías.
function Testimonios({ get, t }: { get: (k: string, d: string) => string; t: ReturnType<typeof useLang>['t'] }) {
  const items = [1,2,3,4,5,6,7,8].map(n => ({
    texto: get(`testimonial_${n}_texto`, ''),
    autor: get(`testimonial_${n}_autor`, ''),
    url:   get(`testimonial_${n}_url`, ''),
  })).filter(i => i.texto)

  if (items.length === 0) return null

  return (
    <section style={{ paddingLeft: 'clamp(16px,5vw,48px)', paddingRight: 'clamp(16px,5vw,48px)', paddingTop: 56, paddingBottom: 56 }}>
      {/* El título sube al centro, donde están los de las demás secciones del
          home. Sigue siendo <h2>: mismo nivel que antes, así que la jerarquía
          de la tanda 4 no se mueve. */}
      <div className="text-center mb-8">
        <div className="section-label" style={{ marginBottom: 12, justifyContent: 'center' }}>{t.sections.testimonios.label}</div>
        <h2 className="font-serif font-light tracking-sdm-tight" style={{ fontSize: 'clamp(var(--sdm-display-sm),4vw,var(--sdm-display-md))', color: 'var(--navy-dark)', lineHeight: 1.1 }}>
          {get('testimonios_titulo', 'Palabras de nuestros clientes')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto" style={{ maxWidth: 980 }}>
        {items.map((item, i) => {
          // El autor viene como «Nombre · Ciudad, País» en una sola cadena. Se
          // parte por el primer `·` para poder tratarlos distinto. Ojo: en la
          // base hay un doble espacio antes del separador, de ahí el trim.
          const corte = item.autor.indexOf('·')
          const nombre = (corte >= 0 ? item.autor.slice(0, corte) : item.autor).trim()
          const lugar  = corte >= 0 ? item.autor.slice(corte + 1).trim() : ''
          // El rótulo del enlace sale del dominio: si mañana un testimonio
          // apunta a otro sitio, lo dice en vez de mentir.
          let donde = 'Ver la publicación'
          try { const h = new URL(item.url).hostname.replace(/^www\./, '')
            donde = h.includes('instagram') ? 'Ver en Instagram' : h.includes('linkedin') ? 'Ver en LinkedIn' : h.includes('sdmcapital') ? 'Leer el artículo' : `Ver en ${h}` } catch { /* sin url */ }

          return (
            <div key={i} className="bg-[var(--off)]" style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '24px 28px 26px', display: 'flex', gap: 16 }}>
              {/* Ornamento, no texto: `aria-hidden` porque no hay nada que
                  leer. Va en --green-dark (4,64:1 sobre --off) y no en --sky,
                  que sobre este fondo da 1,73:1 y sería invisible.

                  A la IZQUIERDA del texto y no encima: apilado se comía una
                  fila entera de 56px por tarjeta y la sección no bajaba de los
                  490px que había que mejorar. */}
              <span aria-hidden="true" className="font-serif" style={{ color: 'var(--green-dark)', fontSize: 44, lineHeight: 0.85, flexShrink: 0 }}>&rdquo;</span>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p className="text-sdm-base" style={{ fontWeight: 300, color: 'var(--ink)', lineHeight: 1.75, marginBottom: 18, flex: 1 }}>
                  {item.texto}
                </p>

                <div className="text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)' }}>
                  {nombre}
                </div>
                {lugar && (
                  <div className="text-sdm-sm" style={{ fontWeight: 300, color: 'var(--muted)' }}>{lugar}</div>
                )}

                {item.url && (
                  <a className="text-sdm-sm tracking-sdm-wide inline-flex items-center gap-1.5 hover:text-[var(--navy-dark)]"
                    href={item.url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${donde}: testimonio de ${nombre} (se abre en una pestaña nueva)`}
                    style={{ marginTop: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--green-dark)', textDecoration: 'none', minHeight: 32, alignSelf: 'flex-start' }}>
                    {donde}<ExternalLink aria-hidden="true" size={13} strokeWidth={2} />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── FINANCIAMIENTO ───────────────────────────────────────────────────────────
//
// La sección suelta «¿El banco te dijo no?» ya no vive acá: es la tarjeta
// izquierda de `DualCTASection`, que va justo debajo del buscador. Las claves
// `financiamiento_*` quedan en la base sin que nadie las lea; el texto vigente
// está en `dual_credito_*`.

export default function HomePage() {
  const { t } = useLang()
  const { get } = useContenido()
  const [props, setProps] = useState<Propiedad[]>([])
  const [cargandoProps, setCargandoProps] = useState(true)
  const [creditoOpen, setCreditoOpen] = useState(false)

  // Los IDs de las destacadas salen de `useContenido`, no de una consulta
  // propia: así vienen sembrados en index.html y la selección ya es la correcta
  // en el primer render, en vez de resolverse a los ~300ms. El efecto depende
  // del valor, así que si la consulta en vivo trae otro —semilla vieja, o el
  // admin acaba de guardar— se vuelve a pedir con los IDs buenos.
  const destacadasIds = get('home_destacadas_ids', '')

  useEffect(() => {
    let ignorar = false

    // Las que tienen destacada=true. Es el camino cuando no hay selección
    // manual, y también el respaldo si los IDs guardados ya no existen.
    const porBandera = () => {
      supabase.from('propiedades').select('*').eq('destacada', true).neq('activo', false).limit(6)
        .then(({ data }) => {
          if (ignorar) return
          // Sin datos no se pinta nada. Antes quedaban las seis de muestra en
          // pantalla, para siempre si la consulta fallaba.
          if (data && data.length > 0) setProps(data)
          setCargandoProps(false)
        },
        // Red de seguridad: se comprobó que ante un fallo de red supabase
        // RESUELVE con `{ error }` en vez de rechazar, así que esta rama casi
        // nunca corre. Queda para que un rechazo raro no deje la grilla con los
        // seis esqueletos puestos, que sería otra forma de mentir sobre lo que
        // está pasando.
        () => { if (!ignorar) setCargandoProps(false) })
    }

    let ids: string[] = []
    try {
      const guardado: unknown = destacadasIds ? JSON.parse(destacadasIds) : []
      if (Array.isArray(guardado)) ids = guardado.filter((x): x is string => typeof x === 'string')
    } catch {
      // Un valor mal formado en la base no puede dejar el home sin destacadas:
      // antes este JSON.parse iba suelto y una comilla de más tiraba el efecto
      // entero, sin destacadas y sin respaldo.
      ids = []
    }

    if (ids.length === 0) { porBandera(); return () => { ignorar = true } }

    supabase.from('propiedades').select('*').in('id', ids).neq('activo', false)
      .then(({ data }) => {
        if (ignorar) return
        if (data && data.length > 0) {
          // Respetar el orden de los IDs guardados
          setProps(ids.map(id => data.find(p => p.id === id)).filter(Boolean) as Propiedad[])
          setCargandoProps(false)
        } else {
          porBandera()
        }
      },
      () => { if (!ignorar) setCargandoProps(false) })

    return () => { ignorar = true }
  }, [destacadasIds])

  // Acá vivía `finImg`, la foto de apoyo del bloque de financiamiento: era
  // una alcancía rosada de banco de imágenes, que dice
  // banca minorista justo donde SDM vende asesoría. `financiamiento_imagen`
  // queda huérfana en la base y su campo del admin se retira — un editor que
  // modifica algo que ya no se dibuja es una trampa, igual que `hero_location`.

  // TRES DESTACADAS EN MÓVIL, SEIS EN ESCRITORIO.
  //
  // El `.slice` sigue siendo intencional —el Inicio muestra una selección, no
  // todo el catálogo—; lo que cambia es que el número dependa del ancho. Debajo
  // de 768px la grilla ya cae a UNA columna por `mobile.css`, así que seis
  // fichas eran una torre de scroll antes de llegar a lo que sigue.
  //
  // 768px es el mismo corte que usa `mobile.css`, no un número nuevo.
  //
  // NO ALTERA `home_destacadas_ids`: `props` ya viene en el orden de esa clave
  // —`ids.map(id => data.find(...))` en el efecto de arriba—, así que cortar por
  // los 3 primeros da los 3 primeros de la lista que eligió el admin, no una
  // selección arbitraria.
  // 767.98 Y NO 768, para que el corte coincida con el de `mobile.css`. Con
  // `max-width: 768px` los dos discrepaban justo en 768: acá daba `true` —o sea
  // 3 destacadas— mientras la hoja de estilos ya pintaba la grilla de DOS
  // columnas del tramo tablet. Tres tarjetas en dos columnas dejan una fila
  // huérfana de una. Con el mismo corte, 768 es tablet para los dos: 6 tarjetas
  // en 2 columnas, tres filas limpias.
  const [cuantasDestacadas, setCuantasDestacadas] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches ? 3 : 6
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    const alCambiar = () => setCuantasDestacadas(mq.matches ? 3 : 6)
    alCambiar()
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])


  return (
    <div>
      <SEO
        title="Inversión Inmobiliaria Chile & Internacional"
        description="Tu socio confiable en bienes raíces. Más de 15 años conectando personas con oportunidades inmobiliarias en Chile y Paraguay. Financiamiento sin pagos adelantados."
        url="/"
      />
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Search bar — JUSTO DESPUÉS del hero: sube 48px sobre la foto */}
      <SearchBar />

      {/* 3. Gestión crediticia + SDM Rental — después del buscador (primero lo
             que se vende) y POR ENCIMA del banner, que se apaga desde el admin.
             Ver la nota del componente */}
      <DualCTASection onSolicitarCredito={() => setCreditoOpen(true)} />

      {/* 4. Banner promocional — se controla desde Contenido → Inicio */}
      <BannerPromo />

      {/* 5. Propiedades destacadas */}
      <section className="py-12 lg:py-24">
        <div style={{ paddingLeft: 'clamp(16px,5vw,48px)', paddingRight: 'clamp(16px,5vw,48px)' }}>
          <div className="mb-8 lg:mb-12" style={{ textAlign: 'center' }} >
            <div className="section-label" style={{ marginBottom: 12, justifyContent: 'center' }}>
              {get('props_label', t.sections.propiedades.label)}
            </div>
            <h2 className="font-serif font-light tracking-sdm-tight" style={{ fontSize: 'clamp(var(--sdm-display-sm),4vw,var(--sdm-display-md))', color: 'var(--navy-dark)', lineHeight: 1.08 }}>
              {get('props_titulo', 'Oportunidades')} <em>{get('props_titulo_em', 'en Chile')}</em>
            </h2>
            <p className="text-sdm-base" style={{ fontWeight: 300, color: 'var(--muted)', marginTop: 8, lineHeight: 1.8 }}>
              {get('props_sub', t.sections.propiedades.sub)}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* `.btn-primary` y no `.btn-text`: es la acción principal del
                bloque y en versalitas con un filete fino no se leía como algo
                pulsable. Se usa el vocabulario que ya existe en vez de inventar
                un tratamiento nuevo.
                Navy sobre el blanco de la sección: 15.71:1. Y queda distinto del
                «Ver todos los artículos →» del bloque de blog, que sigue siendo
                un enlace subrayado porque ahí la acción principal es entrar al
                artículo, no ir al índice. */}
            <Link to="/propiedades" className="btn-primary mt-4 min-h-[44px]">
              {get('props_ver_todas', t.sections.propiedades.verTodas)}
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)' }}>
          {cargandoProps && Array.from({ length: cuantasDestacadas }, (_, i) => <EsqueletoPropiedad key={`esq-${i}`} />)}
          {!cargandoProps && props.slice(0, cuantasDestacadas).map((p, i, arr) => {
            const remainder = arr.length % 3
            const isLast = i === arr.length - 1
            return (
              <div key={p.id} style={{ background: '#fff', gridColumn: remainder === 1 && isLast ? 'span 3' : undefined }}>
                <PropertyCard propiedad={p} index={i} />
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. Internacional — temporalmente oculta */}

      {/* 7. Testimonios */}
      <Testimonios get={get} t={t} />

      {/* 8. Blog preview */}
      <BlogPreviewSection />

      {/* 9. Contacto */}
      <ContactSection />
      {creditoOpen && <SolicitudCreditoModal onClose={() => setCreditoOpen(false)} />}
    </div>
  )
}
