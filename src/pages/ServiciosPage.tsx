import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useContenido } from '@/hooks/useContenido'
import ContactSection from '@/components/sections/ContactSection'
import SEO from '@/components/SEO'
import SolicitudCreditoModal from '@/components/credito/SolicitudCreditoModal'
import type { ProductoCredito } from '@/components/credito/productos'

const SLUGS = [
  { slug: 'financiamiento-personas', key: 'fin_per', titulo: 'Financiamiento Personas' },
  { slug: 'financiamiento-empresas', key: 'fin_emp', titulo: 'Financiamiento Empresas' },
  { slug: 'inversion-internacional', key: 'inv_int', titulo: 'Inversión Internacional' },
  { slug: 'bancarizacion-extranjero',key: 'banco',   titulo: 'Bancarización en el Extranjero' },
]

// ── Qué producto abre cada ficha ─────────────────────────────────────────────
//
// ERA UN BOOLEANO —`isCredito`, true para las DOS fichas de financiamiento— y
// las dos abrían el mismo modal en hipotecario. Una EMPRESA terminaba viendo un
// formulario que le pedía RUT personal, situación laboral y sueldo líquido de
// los últimos tres meses: tres campos que una sociedad no tiene.
//
// El mapa dice además lo que el booleano no podía decir: CUÁL de los cuatro
// productos arranca elegido. `productoInicial` fija el punto de partida del
// selector; el visitante puede cambiarlo.
//
// UN SLUG QUE NO ESTÉ ACÁ NO ABRE MODAL: cae a «Más información» y al scroll a
// #contacto, que es lo que ya hacían `inversion-internacional` y
// `bancarizacion-extranjero`.
//
// ─── POR QUÉ «FINANCIAMIENTO EMPRESAS» NO ESTÁ EN EL MAPA ──────────────────
//
// ES UNA DECISIÓN, NO UN OLVIDO. Su ficha describe financiamiento corporativo,
// Fogape, capital de trabajo y leasing —así lo dicen `servicio_fin_emp_desc` y
// `servicio_fin_emp_tags` en `contenido_sitio`—, y NINGUNO de los cuatro
// productos del modal cubre eso. Leaseback tampoco: leaseback no es leasing.
//
// Mandarla al modal significaría abrirle un formulario que no corresponde a lo
// que el visitante acaba de leer, que es peor que no abrir ninguno. Vuelve al
// contacto, que es el canal correcto mientras se decide qué producto va ahí.
//
// La salida es COMERCIAL, no técnica: o el modal suma productos, o la ficha se
// reescribe. Anotado en `SINCRONIA.md`.
const PRODUCTO_POR_SLUG: Record<string, ProductoCredito> = {
  'financiamiento-personas': 'hipotecario',
}

const GRADIENTS = ['var(--navy)','#1a3528','#252535','#351a1a','#2a1a35']

function parseTags(raw: string): { label: string; url: string }[] {
  if (!raw || !raw.trim()) return []
  return raw.split(',').map(t => {
    const parts = t.trim().split('|')
    return { label: parts[0]?.trim() || '', url: parts[1]?.trim() || '' }
  }).filter(t => t.label)
}

export default function ServiciosPage() {
  const { slug } = useParams<{ slug?: string }>()
  const { get } = useContenido()
  // `null` = cerrado. Guardar el producto en vez de un booleano es lo que
  // permite que el modal sepa con cuál arrancar sin un segundo estado.
  const [creditoAbierto, setCreditoAbierto] = useState<ProductoCredito | null>(null)

  useEffect(() => {
    if (slug) {
      setTimeout(() => {
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [slug])

  const visible = SLUGS.filter(s => get('servicio_' + s.key + '_visible', 'true') !== 'false')

  return (
    <div>
      {/* CANONICAL A `/servicios` TAMBIÉN EN LAS CUATRO HIJAS, Y ES CORRECTO.
          `/servicios/:slug` NO es una página propia: renderiza exactamente este
          componente con los mismos cuatro bloques y solo hace `scrollIntoView`
          al ancla. Medido en producción: las cinco rutas devuelven 1.287
          caracteres de texto, el mismo hash y el mismo <h1>.
          Con canonical a sí mismas, Google indexaría cinco URLs con contenido
          idéntico. Que compartan título y descripción tampoco es un defecto:
          describen la misma página. */}
      <SEO
        title="Servicios"
        description="Inversión inmobiliaria en Chile e internacional, financiamiento hipotecario y bancarización."
        url="/servicios"
      />
      <div className="px-8 lg:px-12 pt-14 pb-12 border-b border-[var(--border)]" style={{ background: 'var(--navy-dark)' }}>
        <div className="section-label section-label--light" style={{ marginBottom: 18 }}>Lo que hacemos</div>
        <h1 className="font-serif font-light tracking-sdm-tight" style={{ fontSize: 'clamp(var(--sdm-display-sm),5vw,var(--sdm-display-lg))', color: '#fff', lineHeight: 1.07 }}>
          Nuestros <em>servicios</em>
        </h1>
        <p className="font-light mt-5 text-sdm-lg" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.9, maxWidth: 480 }}>
          Soluciones integrales en inversión inmobiliaria y financiamiento, tanto en Chile como en Paraguay.
        </p>
      </div>
      <div>
        {visible.map((s, i) => {
          const titulo = get('servicio_' + s.key + '_titulo', s.titulo)
          const desc   = get('servicio_' + s.key + '_desc', '')
          const img    = get('servicio_' + s.key + '_imagen', '')
          const tags   = parseTags(get('servicio_' + s.key + '_tags', ''))
          const num    = String(i + 1).padStart(2, '0')
          const flip   = i % 2 !== 0
          const producto = PRODUCTO_POR_SLUG[s.slug]
          return (
            <div key={s.slug} id={s.slug}
              className="grid grid-cols-1 md:grid-cols-2 gap-px border-b border-[var(--border)]"
              /* SIN `scrollMarginTop`: lo cubre `html.ruta-publica` con
                 `scroll-padding-top`, en globals.css. Tenerlo acá TAMBIÉN no era
                 redundante sino un defecto — `scroll-padding` del contenedor y
                 `scroll-margin` del destino se SUMAN, y este anclaje habría
                 aterrizado con 182px de hueco en vez de 91. */
              style={{ background: 'var(--border)' }}>
              <div className={'bg-white px-8 lg:px-14 py-14' + (flip ? ' lg:order-2' : '')}>
                <div className="font-serif mb-5 text-sdm-display-md" style={{ fontWeight: 300, color: 'var(--border)' }}>{num}</div>
                <div style={{ width: 28, height: 2, background: 'var(--green)', marginBottom: 16 }} />
                <h2 className="font-serif font-light mb-4 text-sdm-display-md" style={{ color: 'var(--navy-dark)' }}>{titulo}</h2>
                {desc ? <p className="font-light mb-8 text-sdm-lg" style={{ color: 'var(--muted)', lineHeight: 1.9, maxWidth: 420 }}>{desc}</p> : null}
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {tags.map((tag, ti) => tag.url
                      ? <a key={ti} href={tag.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[13px] tracking-[1.5px] uppercase border" style={{ borderColor: 'var(--green-dark)', color: 'var(--green-dark)', borderRadius: 1, textDecoration: 'none' }}>{tag.label} ↗</a>
                      : <span key={ti} className="px-3 py-1.5 text-[13px] tracking-[1.5px] uppercase border" style={{ borderColor: 'var(--border)', color: 'var(--muted)', borderRadius: 1 }}>{tag.label}</span>
                    )}
                  </div>
                ) : null}
                <button
                  onClick={() => producto
                    ? setCreditoAbierto(producto)
                    : document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-primary inline-flex"
                >
                  {producto ? 'Solicita tu evaluación gratuita' : 'Más información'}
                </button>
              </div>
              <div className={'flex items-center justify-center overflow-hidden' + (flip ? ' lg:order-1' : '')}
                style={{ minHeight: 340, background: 'linear-gradient(160deg,' + (GRADIENTS[i] || 'var(--navy)') + ',var(--navy-dark))' }}>
                {img ? <img loading="lazy" decoding="async" src={img} alt={titulo} className="w-full h-full object-cover" style={{ minHeight: 340 }} /> : <span className="font-serif italic text-sdm-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>{titulo}</span>}
              </div>
            </div>
          )
        })}
      </div>
      <ContactSection />
      {creditoAbierto && <SolicitudCreditoModal productoInicial={creditoAbierto} onClose={() => setCreditoAbierto(null)} />}
    </div>
  )
}
