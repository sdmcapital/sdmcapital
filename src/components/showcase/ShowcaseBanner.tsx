import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { paleta } from '@/components/showcase/tema'

// Banner de la ficha de propiedad que lleva a su showcase.
//
// Era `ElBarrancoBanner`, con el UUID de El Barranco escrito en el código y la
// lectura sobre la tabla vieja. Ahora cualquier ficha puede llevarlo: se pinta
// SOLO si esa propiedad tiene `publicado = 'true'` en showcase_contenido. Una
// propiedad con showcase a medio armar (como La Colmena hoy) no muestra banner.
//
// Una consulta por propiedad, compartida entre las dos instancias de la ficha
// (la de arriba y la de abajo): la ficha de CUALQUIER propiedad pasa por acá, así
// que dos peticiones por visita a cada una serían un costo sin contrapartida.

type DatosBanner = { publicado: boolean; titulo: string; acento: string; fotos: Record<string, string> }

const CLAVES = ['publicado', 'hero_titulo', 'tema_acento', 'banner_detalle_foto', 'banner_foto']
const cache = new Map<string, Promise<DatosBanner | null>>()

function cargarBanner(propiedadId: string): Promise<DatosBanner | null> {
  let p = cache.get(propiedadId)
  if (!p) {
    p = Promise.resolve(
      supabase.from('showcase_contenido').select('clave, valor').eq('propiedad_id', propiedadId).in('clave', CLAVES),
    ).then(({ data, error }) => {
      if (error || !data || data.length === 0) return null
      const v: Record<string, string> = {}
      for (const { clave, valor } of data as { clave: string; valor: string }[]) v[clave] = valor
      return {
        publicado: v.publicado === 'true',
        titulo: v.hero_titulo || '',
        acento: paleta(v.tema_acento).acento,
        fotos: { banner_detalle_foto: v.banner_detalle_foto || '', banner_foto: v.banner_foto || '' },
      }
    }, () => null)
    cache.set(propiedadId, p)
  }
  return p
}

export default function ShowcaseBanner({ propiedadId, clave = 'banner_detalle_foto' }: { propiedadId: string; clave?: 'banner_detalle_foto' | 'banner_foto' }) {
  const [datos, setDatos] = useState<DatosBanner | null>(null)

  useEffect(() => {
    let vivo = true
    cargarBanner(propiedadId).then(d => { if (vivo) setDatos(d) })
    return () => { vivo = false }
  }, [propiedadId])

  if (!datos || !datos.publicado || !datos.titulo) return null

  const bgUrl = datos.fotos[clave]
  const acento = datos.acento

  return (
    <div className="px-8 lg:px-12">
      <Link to={`/propiedades/${propiedadId}/showcase`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          margin: '40px 0',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#0a0c0b',
          border: '1px solid rgba(168,196,216,0.2)',
        }}>
          {/* Imagen de fondo — solo si hay URL (sin flash mientras carga) */}
          {bgUrl && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.35,
            }} />
          )}

          {/* ─── VELO ENTRE LA FOTO Y EL TEXTO ────────────────────────────────
              EL COLOR NO ES EL PROBLEMA. `#4CAF82` —el acento de El Barranco—
              sobre el negro de su marca da 7,25:1: su uso es correcto. Lo que
              rompe el contraste es la FOTO al 35 % que va encima de ese negro y
              lo aclara. Contra el compuesto, el verde caía a 2,78 con una foto
              clara y a 2,30 con una blanca. El subtítulo `#A8C4D8` también
              fallaba —3,42 y 4,13—.

              MISMO ENFOQUE QUE EL HERO: una capa de degradado propia entre la
              foto y el contenido, en vez de bajar el `opacity: 0.35` de la
              imagen. Bajarlo apagaría la fotografía ENTERA para resolver las dos
              zonas donde hay texto.

              PERO NO LA MISMA FORMA: el banner tiene tinta en los DOS extremos
              —el eyebrow a la izquierda y el CTA «View Full Showcase» a la
              derecha—, y un degradado direccional dejaría el CTA sin cubrir. Por
              eso es SIMÉTRICO: fuerte en los dos bordes, más suave en el centro,
              que es justo la franja donde no hay nada escrito.

              Medido en el borde (0.62), contra las cuatro luminancias de foto,
              PARA EL ACENTO `#4CAF82` (umbral 4,5):

                              blanca  clara  media  oscura
                #4CAF82         5,17   5,50   6,37    7,07   ✅
                #A8C4D8         7,69   8,19   9,47   10,52   ✅

              ⚠ ESTA MEDICIÓN VALE SOLO PARA ESE ACENTO. El acento ahora sale del
              dato (`tema_acento`): otra propiedad que active su banner con otro
              color —el oliva `#7A8B5A` de La Colmena es más oscuro, así que
              rinde peor contra una foto clara— tiene que volver a medirse sobre
              el compuesto real antes de poner `publicado = 'true'`.

              El negro del velo es el `#0a0c0b` del propio banner. */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(100deg,rgba(10,12,11,0.62) 0%,rgba(10,12,11,0.46) 50%,rgba(10,12,11,0.62) 100%)',
          }} />

          {/* Contenido */}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '40px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            <div>
              <p className="text-sdm-xs" style={{ fontFamily: "'Jost', sans-serif",
                fontWeight: 300,
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                color: acento,
                margin: '0 0 10px' }}>
                SDM Capital · Exclusive Listing
              </p>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(22px, 3vw, 34px)',
                fontWeight: 300,
                color: '#f0ece4',
                margin: '0 0 6px',
                lineHeight: 1.1,
              }}>
                {datos.titulo}
              </p>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(15px, 2vw, 20px)',
                fontWeight: 300,
                color: '#A8C4D8',
                margin: 0,
              }}>
                Explore the full property experience
              </p>
            </div>

            {/* ─── EL BORDE DEL CTA VA SÓLIDO, Y NINGÚN ALFA LO ARREGLABA ─────
                Un color semitransparente sobre un fondo variable (base + foto
                al 35 % + velo) NO puede garantizar contraste: al subir el alfa
                se acerca al verde sólido y al bajarlo al fondo; el máximo que
                alcanza es justamente el del sólido. La única salida es fijar el
                color, y se usa el MISMO acento que ya llevan el eyebrow y la
                etiqueta de este CTA.

                Medido para `#4CAF82` sobre el compuesto real, contra las cuatro
                luminancias de foto (255 · 220 · 128 · 40) y en los tres puntos
                del velo:

                                      blanca  clara  media  oscura
                  a=0.46 (centro)       4,23   4,68   5,91    6,98
                  a=0.53 (el CTA)       4,63   5,03   6,11    7,02
                  a=0.62 (borde)        5,17   5,50   6,37    7,07

                **Peor caso 4,23:1**, contra un umbral de 3 (1.4.11). Mismo
                aviso de arriba: la tabla es de ese acento. */}
            <div className="text-sdm-xs" style={{ display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 32px',
              border: `1px solid ${acento}`,
              color: acento,
              fontFamily: "'Jost', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap' }}>
              View Full Showcase
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5"/>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
