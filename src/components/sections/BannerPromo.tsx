// Pieza promocional del home, justo debajo de los dos llamados de
// `DualCTASection`.
//
// Va en el flujo del documento, no como modal ni interstitial: Google penaliza
// los interstitials intrusivos en móvil y no vale la pena arriesgar
// posicionamiento por un banner.
//
// No se puede cerrar. Se muestra a todos los visitantes mientras
// `banner_activo` sea 'true'; se retira apagándolo desde el admin
// (Contenido → Inicio → Banner promocional).

import { Link } from 'react-router-dom'
import { useContenido } from '@/hooks/useContenido'

// Las tres franjas del logo, reutilizadas arriba de la pieza y como respaldo
// visual cuando no hay imagen cargada.
const COLORES_LOGO = ['var(--sky)', 'var(--green)', 'var(--navy-deeper)']

export default function BannerPromo() {
  const { get, listo } = useContenido()

  // `listo` y no `loading`: con semilla, el primer render YA sabe si el banner
  // va y con qué contenido, así que la pieza se pinta de una en vez de aparecer
  // ~300 ms tarde empujando todo lo que tiene debajo.
  //
  // El gate anterior esperaba a la consulta «para que la pieza no aparezca y
  // desaparezca si en la base está apagada». Ese riesgo sigue existiendo, pero
  // solo en un caso: alguien apaga el banner en el admin y nadie despliega. La
  // semilla se regenera en cada build —`prebuild` corre
  // `sync-contenido-seed.mjs` y siembra la tabla entera—, así que fuera de esa
  // ventana semilla y base coinciden.
  //
  // Se aceptó a sabiendas, y el precedente es `ServiciosPage`: ya decide qué
  // servicios ocultar leyendo la semilla, sin ningún gate, sobre el pliegue y
  // con un servicio entero en juego. Mantener la excepción solo acá era una
  // inconsistencia, no una protección.
  //
  // LA VENTANA SE CIERRA POR PROCESO, NO POR CÓDIGO: apagar el banner desde el
  // admin exige desplegar. Está avisado junto al interruptor, en Contenido.
  if (!listo) return null
  if (get('banner_activo', 'false') !== 'true') return null

  const kicker    = get('banner_kicker', 'Oportunidad comercial')
  const titulo    = get('banner_titulo', 'Oficinas en arriendo en Santiago Centro')
  const subtitulo = get('banner_subtitulo', '42 oficinas disponibles · desde 178 m² · ejes Miraflores, Ahumada y Nueva York')
  const ctaTexto  = get('banner_cta_texto', 'Ver disponibilidad')
  const ctaUrl    = get('banner_cta_url', '/propiedades/oficinas-arriendo-santiago-centro')
  const imagen    = get('banner_imagen', '')

  if (!titulo) return null

  const estiloCta: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '13px 30px',
    background: 'var(--green-dark)',
    color: '#fff',
    fontSize: 'var(--sdm-text-sm)',
    fontWeight: 500,
    letterSpacing: 'var(--sdm-tracking-wide)',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: 2,
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  }

  const esExterno = /^https?:\/\//i.test(ctaUrl)

  const cta = ctaTexto && ctaUrl ? (
    esExterno ? (
      <a href={ctaUrl} target="_blank" rel="noopener noreferrer" style={estiloCta} className="w-full md:w-auto">
        {ctaTexto}
      </a>
    ) : (
      <Link to={ctaUrl} style={estiloCta} className="w-full md:w-auto">
        {ctaTexto}
      </Link>
    )
  ) : null

  return (
    // ─── EL MARGEN SUPERIOR LO SEPARA DE LA BANDA DE ARRIBA ──────────────────
    //
    // `DualCTASection` es una banda `--navy-dark`, el mismo color que esta
    // pieza, y va justo encima. Pegadas se leen como una sola masa oscura: ya
    // pasó cuando el bloque de financiamiento era oscuro, y entonces se midió
    // que ni un filete de 1px ni separarlas por tono alcanza — `--navy-deeper`
    // contra `--navy-dark` da 1,141:1. La franja tricolor de 2px de abajo
    // tampoco: es un borde, no una separación.
    //
    // El margen deja el blanco de la página entre las dos (15,71:1 por cada
    // lado), y con las destacadas debajo la pieza vuelve a ser una banda oscura
    // ENTRE DOS SUPERFICIES CLARAS, que es donde funcionaba.
    //
    // VA ACÁ Y NO EN `HomePage` porque este componente es el único que sabe si
    // se dibuja: con el banner apagado devuelve null y el margen desaparece con
    // él. Ponerlo afuera obligaría a repetir la condición de `banner_activo` en
    // un segundo sitio.
    <section aria-label="Aviso destacado" className="mt-12 md:mt-14" style={{ width: '100%', background: 'var(--navy-dark)', borderRadius: 0 }}>
      {/* Franja con los tres colores del logo */}
      <div aria-hidden="true" style={{ display: 'flex', height: 2 }}>
        {COLORES_LOGO.map(color => (
          <span key={color} style={{ flex: 1, background: color }} />
        ))}
      </div>

      {/* Móvil: imagen arriba, contenido abajo (order invertido en desktop con
          flex-row, donde el contenido pasa a la izquierda). */}
      <div className="flex flex-col md:flex-row">

        {/* ── Imagen ──
            En móvil mide 180px de alto. En desktop `h-auto` deja que el
            flex-row la estire hasta igualar la columna de contenido. El
            contenido va en posición absoluta para que el 100% de alto no
            dependa de cómo se resolvió la altura del contenedor. */}
        <div
          className="w-full md:w-[45%] order-1 md:order-2 h-[180px] md:h-auto"
          style={{ flexShrink: 0, position: 'relative' }}
        >
          {imagen ? (
            <img
              src={imagen}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            // Respaldo: sin imagen cargada la pieza no se ve rota.
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, background: 'var(--navy-deeper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {COLORES_LOGO.map(color => (
                <span key={color} style={{ display: 'block', width: 34, height: 2, background: color }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Contenido ── */}
        <div
          className="w-full md:w-[55%] order-2 md:order-1 flex flex-col items-start justify-center md:min-h-[320px] md:border-r md:border-white/10"
          style={{
            background: 'var(--navy-dark)',
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 'clamp(16px,5vw,48px)',
            paddingRight: 'clamp(16px,5vw,48px)',
          }}
        >
          {kicker && (
            <div className="section-label section-label--light" style={{ marginBottom: 14 }}>
              {kicker}
            </div>
          )}

          <h2
            className="font-serif tracking-sdm-tight"
            style={{ fontWeight: 300, fontSize: 'clamp(var(--sdm-display-sm),4vw,var(--sdm-display-md))', color: '#fff', lineHeight: 1.1 }}
          >
            {titulo}
          </h2>

          <div aria-hidden="true" style={{ width: 44, height: 2, background: 'var(--green)', marginTop: 18, marginBottom: 18 }} />

          {subtitulo && (
            <p className="text-sdm-base" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, maxWidth: 460, marginBottom: 26 }}>
              {subtitulo}
            </p>
          )}

          {cta}
        </div>
      </div>
    </section>
  )
}
