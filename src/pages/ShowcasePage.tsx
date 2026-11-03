// Showcase de una propiedad: `/propiedades/:id/showcase`.
//
// Era `ElBarrancoShowcase.tsx`, atado a una sola propiedad: ignoraba el `:id`,
// llevaba el inglés de El Barranco como respaldo de cada texto y las fotos de
// respaldo en un objeto `IMG`. Ahora el `:id` (UUID o slug) decide qué
// propiedad se muestra, y TODO el contenido sale de `showcase_contenido` y
// `showcase_items`. Ver `src/lib/showcase.ts`.
//
// REGLA: sin dato, sin sección. Una sección se pinta solo si tiene algo que
// mostrar; un campo vacío se queda vacío. Si el `:id` no tiene contenido, la
// página es «no encontrada» (antes, cualquier id mostraba El Barranco).
//
// Lo que NO es contenido y sigue en el código, en inglés y español: los rótulos
// de la interfaz (botones, formulario, «Volver», pausa del carrusel). Todo lo
// demás —incluidos los rótulos de las tarjetas del brief y los iconos— es dato.
//
// `sc-*` son las clases de comportamiento móvil de esta página: viven en
// `mobile.css` (bloque «Showcase»), bajo 768px. En escritorio no hacen nada, y
// los estilos inline siguen siendo la fuente de verdad.

import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import SEO from '@/components/SEO'
import { supabase } from '@/lib/supabase'
import { cargarShowcase, lector } from '@/lib/showcase'
import type { Idioma, ResultadoShowcase, ShowcaseData } from '@/lib/showcase'
import { paleta, crearEstilos, investTabStyle } from '@/components/showcase/tema'
import { FlechaIzquierda } from '@/components/showcase/iconos'
import {
  TarjetaActividad, TarjetaAmenidad, TarjetaItem, BloqueFoto, ItemGaleria, BloqueFicha, EncabezadoSeccion,
} from '@/components/showcase/piezas'

const FONT_INJECT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');`

// Posiciones del mosaico de la galería para las primeras 7 fotos. Con 7 es
// exactamente el mosaico de siempre; de la 8 en adelante las fotos fluyen en
// filas nuevas, de a una columna; la última foto cierra la fila si queda incompleta.
const MOSAICO: [string, string][] = [['1 / 3', '1 / 3'], ['3', '1'], ['4', '1'], ['3', '2'], ['4', '2'], ['1', '3'], ['2 / 5', '3']]

// Secciones de tarjetas con foto, en el orden en que aparecen. Cada una tiene
// `<id>_eyebrow`, `<id>_titulo` y `<id>_intro` en showcase_contenido y sus
// ítems en showcase_items con seccion = <id>.
const SECCIONES_TARJETAS = [
  { id: 'construcciones', fondo: 'bg' },
  { id: 'energia',        fondo: 'bgMid' },
  { id: 'produccion',     fondo: 'bg' },
] as const

/**
 * Columnas de la grilla de tarjetas según cuántas hay. Con `auto-fill` a secas, 5
 * tarjetas en 4 columnas dejan una huérfana sola en la segunda fila. Se elige entre
 * 4 y 3 la cantidad que deja la última fila más llena (con 5 → 3, con 7 → 4, con 6
 * → 3), y `max(280px, …)` hace que en pantallas angostas bajen a menos columnas en
 * vez de apretarse: el mínimo de una tarjeta es 280 px.
 */
function gridTarjetas(n: number, fijas?: number): string {
  const llenado = (c: number) => (n % c === 0 ? c : n % c)
  const cols = fijas ?? (n <= 3 ? Math.max(n, 1) : llenado(4) >= llenado(3) ? 4 : 3)
  return `repeat(auto-fit, minmax(max(280px, calc((100% - ${(cols - 1) * 2}px) / ${cols})), 1fr))`
}

const PANTALLA_BASE = { background: '#0a0c0b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 6vw', textAlign: 'center', fontFamily: "'Jost', sans-serif", color: '#f0ece4' } as const

export default function ShowcasePage() {
  const { id } = useParams<{ id: string }>()
  const [res, setRes] = useState<ResultadoShowcase | null>(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = FONT_INJECT
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    if (!id) { setRes({ estado: 'no-existe' }); return }
    let vivo = true
    setRes(null)
    cargarShowcase(id).then(r => { if (vivo) setRes(r) })
    return () => { vivo = false }
  }, [id])

  if (!res) return <div style={PANTALLA_BASE} aria-busy="true" />

  if (res.estado !== 'ok') {
    const error = res.estado === 'error'
    return (
      <div style={PANTALLA_BASE}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(32px, 6vw, 56px)', margin: 0 }}>
          {error ? "We couldn't load this page" : 'Page not found'}
        </h1>
        {error
          ? <button type="button" onClick={() => window.location.reload()} style={{ background: 'none', border: '1px solid rgba(168,196,216,0.3)', color: '#f0ece4', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Jost', sans-serif", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>Try again</button>
          : <Link to="/propiedades" style={{ color: '#A8C4D8', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>Back to the properties</Link>}
      </div>
    )
  }

  return <ShowcaseVista key={res.data.propiedadId} data={res.data} />
}

function ShowcaseVista({ data }: { data: ShowcaseData }) {
  const navigate = useNavigate()
  const { propiedadId, propiedad, contenido, items } = data

  // La paleta y los estilos salen del dato.
  const C = useMemo(() => paleta(contenido.tema_acento, contenido.tema_texto_desc), [contenido.tema_acento, contenido.tema_texto_desc])
  const S = useMemo(() => crearEstilos(C), [C])

  const [lang, setLang] = useState<Idioma>(contenido.idioma_default === 'es' ? 'es' : 'en')
  const { t, c, ti } = lector(contenido, lang)
  const L = (seccion: string) => items[seccion] ?? []
  const es = lang === 'es'

  const [slide, setSlide]         = useState(0)
  const [reinicio, setReinicio]   = useState(0)
  const [form, setForm]           = useState({ name: '', email: '', message: '' })
  const [envio, setEnvio]         = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')

  // ── Qué hay para mostrar ──
  const titulo = c('hero_titulo') || propiedad?.titulo || ''
  const slides = L('hero').map(i => i.img).filter((x): x is string => !!x)

  const stats = L('destino_stats')
  const fotoDestino = c('destination_foto')
  const hayDestino = !!(t('dest_eyebrow') || t('dest_titulo') || t('destination_p1') || t('destination_p2') || fotoDestino || stats.length)

  const actividades = L('actividades')
  const hayActividades = !!(t('exp_eyebrow') || t('exp_titulo') || t('act_p') || actividades.length)

  const fotosProp = L('propiedad_fotos').filter(i => i.img)
  const amenidades = L('amenidades')
  const hayCabeceraProp = !!(t('prop_eyebrow') || t('prop_titulo') || t('propiedad_desc'))
  const hayPropiedad = hayCabeceraProp || fotosProp.length > 0 || amenidades.length > 0

  const brief = L('brief')
  const hayStory = !!(t('story_p1') || t('story_p2') || t('story_p3') || t('brief_upside_titulo') || t('brief_upside_texto'))
  const hayBrief = brief.length > 0 || !!(t('brief_legal_titulo') || t('brief_legal_texto'))
  const hayInversion = hayStory || hayBrief
  const [investTab, setInvestTab] = useState<'story' | 'brief'>(hayStory ? 'story' : 'brief')

  const bloquesFicha = c('ficha_bloques').split(',').map(s => s.trim()).filter(Boolean)
    .map(slug => ({
      slug,
      title: t(`ficha_${slug}_titulo`),
      rows: L(`ficha_${slug}`).map(it => ({ id: it.id, k: ti(it, 'titulo'), v: ti(it, 'valor') })).filter(r => r.k || r.v),
    }))
    .filter(b => b.rows.length > 0)
  const hayFicha = bloquesFicha.length > 0

  const galeria = L('galeria').filter(i => i.img)

  // 2.2.2: rota cada 5,5 s indefinidamente, así que hace falta poder pararlo.
  // Nace pausado si el sistema pide menos movimiento.
  const [pausado, setPausado] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  // `reinicio` sube cuando el visitante salta a una foto concreta: el efecto se
  // vuelve a ejecutar y el temporizador arranca de cero, en vez de dejar que la
  // foto elegida cambie a los pocos milisegundos.
  useEffect(() => {
    if (pausado || slides.length < 2) return
    const timer = setInterval(() => setSlide(s => (s + 1) % slides.length), 5500)
    return () => clearInterval(timer)
  }, [pausado, slides.length, reinicio])

  const goSlide = (i: number) => { setSlide(i); setReinicio(r => r + 1) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (envio === 'enviando') return
    setEnvio('enviando')
    // Mismo patrón que el formulario de contacto del sitio (`ContactSection`):
    // un INSERT anónimo en `contacto_mensajes`, que la bandeja del admin ya lee.
    // `propiedad_interes` dice de qué showcase viene. NO se escribe en `leads`:
    // esa tabla es del Worker de Sofía (conversaciones de WhatsApp, `status` suyo).
    const { error } = await supabase.from('contacto_mensajes').insert([{
      nombre: form.name.trim(),
      email: form.email.trim(),
      mensaje: form.message.trim(),
      propiedad_interes: titulo,
    }])
    if (error) {
      // Se queda el formulario con lo escrito: perderlo sería peor que el error.
      console.error('[showcase] no se pudo enviar la consulta', error)
      setEnvio('error')
      return
    }
    setEnvio('ok')
  }

  const piePropio = c('footer_texto') || `SDM Capital Real Estate${titulo ? ` · ${titulo}` : ''}`
  const filaContacto = !!(t('contact_eyebrow') || t('contact_titulo') || c('precio_display') || t('precio_sub') || t('contacto_parrafo') || c('contacto_empresa') || c('contacto_telefono'))

  return (
    // `lang` en el contenedor, y no en el <html>.
    //
    // El <html lang="es"> de index.html es fijo y nadie lo actualiza, pero esta
    // pagina arranca en el idioma del dato —ingles por defecto— y sirve todo su
    // texto en ese idioma. Un lector de pantalla lo pronunciaria con fonemas
    // espanoles. Marcar el contenedor alcanza: `lang` se hereda, asi que toda la
    // seccion queda en el idioma correcto, y el resto del sitio sigue en es.
    // Cambia con el selector EN/ES sin tocar nada mas.
    <div className="sitio-publico sc-page" lang={lang} style={S.page}>
      {/* El titulo del SEO sigue al idioma activo: un titulo en espanol para una
          pagina que se ve en ingles descoloca en la pestana y al compartir. */}
      <SEO
        title={t('seo_titulo') || titulo || undefined}
        description={t('seo_descripcion') || undefined}
        url={`/propiedades/${propiedad?.slug || propiedadId}/showcase`}
        type="article"
      />

      {/* ── Language toggle ──
          Escritorio: flota fijo arriba a la derecha. `sc-bar` no tiene estilo
          propio fuera de móvil y, al ser su hijo `fixed`, no ocupa espacio.
          Móvil: `mobile.css` lo vuelve una barra pegajosa de ancho completo, con
          fondo sólido y EN el flujo, para que no se superponga al título. */}
      {/* Modo reforzado (`C.refuerzo`): el selector vive en un navbar fijo de todo el
          ancho, con fondo sólido propio, y no flota sobre las fotos: su contraste no
          depende de lo que pase por detrás. La barra es `position: fixed`, así que se
          deja un espaciador de su misma altura (48 px) arriba del hero. */}
      <div className={C.refuerzo ? 'sc-bar sc-bar--nav' : 'sc-bar'}>
        <div className="sc-toggle" style={{ position: C.refuerzo ? 'static' : 'fixed', top: 20, right: 24, zIndex: 200, display: 'flex', overflow: 'hidden', border: '1px solid rgba(168,196,216,0.2)' }}>
          {(['en', 'es'] as const).map(l => (
            <button className="text-sdm-xs" key={l} onClick={() => setLang(l)} style={{ padding: '7px 13px',
              background: lang === l ? C.acento : (C.refuerzo ? C.bg : 'rgba(10,12,11,0.75)'),
              border: 'none',
              color: lang === l ? C.tinta : (C.refuerzo ? 'rgba(240,236,228,0.9)' : 'rgba(240,236,228,0.55)'),
              fontFamily: "'Jost', sans-serif", fontWeight: 500,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s', backdropFilter: 'blur(8px)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {C.refuerzo && <div aria-hidden="true" style={{ height: 48 }} />}

      {/* ── HERO ── */}
      <section className="sc-hero" style={S.hero}>
        {slides.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${slides[slide % slides.length]})`, backgroundSize: 'cover', backgroundPosition: 'center 40%', transition: 'background-image 1.2s ease' }} />
        )}
        <div style={S.heroOverlay} />
        <div className="sc-hero-content" style={S.heroContent}>
          {t('hero_eyebrow') && <p style={S.heroEyebrow}>{t('hero_eyebrow')}</p>}
          <h1 style={S.heroTitle}>{titulo}</h1>
          {t('hero_subtitulo') && <p style={S.heroSubtitle}>{t('hero_subtitulo')}</p>}
          {t('hero_tagline') && <p className="sc-leading" style={S.heroDesc}>{t('hero_tagline')}</p>}
          <div className="sc-hero-actions" style={S.heroActions}>
            <a href="#contact" className="sc-btn" style={S.btnPrimary}>{es ? 'Solicitar información' : 'Request Information'}</a>
            {hayBrief && (
              <a href="#investment" className="sc-btn" style={S.btnGhost} onClick={() => setInvestTab('brief')}>{es ? 'Ver resumen financiero' : 'View Investment Brief'}</a>
            )}
          </div>
        </div>
        {slides.length > 1 && (
          <div style={{ ...S.heroDots, display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* El nombre sigue al idioma activo. */}
            <button
              type="button"
              onClick={() => setPausado(p => !p)}
              aria-label={pausado
                ? (es ? 'Reanudar el cambio automático de fotos' : 'Resume the automatic photo change')
                : (es ? 'Pausar el cambio automático de fotos'   : 'Pause the automatic photo change')}
              className="area-44"
              style={{ width: 20, height: 20, marginRight: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,12,11,0.6)', border: 'none', borderRadius: '50%', color: C.cream, cursor: 'pointer', padding: 0 }}
            >
              {pausado
                ? <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M0 0l8 4.5L0 9z"/></svg>
                : <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><rect x="0" y="0" width="3" height="9"/><rect x="5" y="0" width="3" height="9"/></svg>}
            </button>
            {slides.map((_, i) => (
              <button key={i} onClick={() => goSlide(i)} aria-label={es ? `Foto ${i + 1} de ${slides.length}` : `Slide ${i + 1} of ${slides.length}`} style={{ width: i === slide ? 24 : 6, height: 6, background: i === slide ? C.acento : 'rgba(240,236,228,0.25)', borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
            ))}
          </div>
        )}
      </section>

      {/* ── DESTINATION ── */}
      {hayDestino && (
        <section className="sc-section" style={{ ...S.section, maxWidth: 1300, margin: '0 auto' }}>
          <div className="sc-grid-2 sc-dest" style={{ display: 'grid', gridTemplateColumns: fotoDestino ? '1fr 1fr' : '1fr', gap: 72, alignItems: 'center' }}>
            <div>
              <EncabezadoSeccion S={S} eyebrow={t('dest_eyebrow')} titulo={t('dest_titulo')} />
              {t('destination_p1') && <p className="sc-leading" style={S.bodyText}>{t('destination_p1')}</p>}
              {t('destination_p2') && <p className="sc-leading" style={{ ...S.bodyText, marginTop: t('destination_p1') ? 20 : 0 }}>{t('destination_p2')}</p>}
              {stats.length > 0 && (
                <div className="sc-stats" style={S.statRow}>
                  {stats.map(it => (
                    <div key={it.id} className="sc-stat">
                      <span className="sc-stat-num" style={S.statNum}>{ti(it, 'valor')}</span>
                      <span className="sc-stat-label" style={S.statLabel}>{ti(it, 'titulo')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {fotoDestino && <img loading="lazy" decoding="async" src={fotoDestino} alt={c('destination_foto_alt')} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} />}
          </div>
        </section>
      )}

      {/* ── ACTIVITIES ── */}
      {hayActividades && (
        <section className={`sc-section${hayDestino ? ' sc-section--flush' : ''}`} style={{ padding: hayDestino ? '0 6vw 100px' : '100px 6vw' }}>
          <EncabezadoSeccion S={S} eyebrow={t('exp_eyebrow')} titulo={t('exp_titulo')} filete={false} tituloStyle={{ maxWidth: 500 }} />
          {actividades.length > 0 && (
            <div className="sc-activities" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(actividades.length, 3)}, 1fr)`, gap: 2, marginTop: 56 }}>
              {actividades.map(a => <TarjetaActividad key={a.id} C={C} img={a.img ?? ''} title={ti(a, 'titulo')} sub={ti(a, 'descripcion')} icono={a.icono} />)}
            </div>
          )}
          {t('act_p') && (
            <p className="text-sdm-base sc-leading" style={{ ...S.bodyText, maxWidth: 680, marginTop: 40, opacity: 0.8 }}>{t('act_p')}</p>
          )}
        </section>
      )}

      {/* ── PROPERTY ── */}
      {hayPropiedad && (
        <section className="sc-section" style={{ background: C.bgMid, padding: '100px 6vw' }}>
          <EncabezadoSeccion S={S} eyebrow={t('prop_eyebrow')} titulo={t('prop_titulo')} />
          {t('propiedad_desc') && <p className="sc-leading" style={S.bodyText}>{t('propiedad_desc')}</p>}

          {fotosProp.length > 0 && (
            <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: fotosProp.length > 1 ? '1fr 1fr' : '1fr', gap: 2, marginTop: hayCabeceraProp ? 56 : 0 }}>
              {fotosProp.map(i => <BloqueFoto key={i.id} src={i.img as string} />)}
            </div>
          )}

          {amenidades.length > 0 && (
            <div className="sc-amenities" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(amenidades.length, 4)}, 1fr)`, gap: 1, marginTop: hayCabeceraProp || fotosProp.length > 0 ? 56 : 0 }}>
              {amenidades.map(a => <TarjetaAmenidad key={a.id} S={S} C={C} titulo={ti(a, 'titulo')} desc={ti(a, 'descripcion')} icono={a.icono} />)}
            </div>
          )}
        </section>
      )}

      {/* ── CONSTRUCCIONES · ENERGÍA · PRODUCCIÓN ── */}
      {SECCIONES_TARJETAS.map(({ id: sec, fondo }) => {
        const lista = L(sec)
        const eyebrow = t(`${sec}_eyebrow`), tit = t(`${sec}_titulo`), intro = t(`${sec}_intro`)
        if (!eyebrow && !tit && !intro && lista.length === 0) return null
        return (
          <section key={sec} className="sc-section" style={{ background: fondo === 'bgMid' ? C.bgMid : C.bg, padding: '100px 6vw' }}>
            <EncabezadoSeccion S={S} eyebrow={eyebrow} titulo={tit} />
            {intro && <p className="sc-leading" style={S.bodyText}>{intro}</p>}
            {lista.length > 0 && (() => {
              const margen = eyebrow || tit || intro ? 56 : 0
              const tarjeta = (it: typeof lista[number]) => <TarjetaItem key={it.id} S={S} C={C} img={it.img} fotos={it.fotos ?? []} titulo={ti(it, 'titulo')} desc={ti(it, 'descripcion')} icono={it.icono} />
              // TODAS con foto (los edificios): grilla de 2 columnas, filas de la misma
              // altura. La foto absorbe la diferencia de texto (ver `TarjetaItem`), así
              // que no queda hueco ni tarjeta estirada con un bloque vacío.
              if (lista.length >= 2 && lista.every(i => i.img)) {
                return (
                  <div className="sc-cards" style={{ display: 'grid', gridTemplateColumns: gridTarjetas(lista.length, 2), gap: 2, marginTop: margen }}>
                    {lista.map(it => <TarjetaItem key={it.id} S={S} C={C} ancha img={it.img} fotos={it.fotos ?? []} titulo={ti(it, 'titulo')} desc={ti(it, 'descripcion')} icono={it.icono} />)}
                  </div>
                )
              }
              // Con fotos de por medio las tarjetas miden distinto, y en una grilla por FILAS la corta
              // deja un hueco oscuro debajo (o se estira a la más alta, con un bloque vacío). En
              // columnas tipo mosaico se apilan sin huecos y solo el borde inferior queda irregular.
              // `columns: N 280px` = hasta N columnas de al menos 280 px: baja sola a 2 y a 1.
              if (lista.some(i => i.img)) {
                const n = Math.min(lista.length, lista.length >= 7 ? 4 : 3)
                return (
                  <div className="sc-cards sc-cards--mosaico" style={{ columns: `${n} 280px`, columnGap: 2, marginTop: margen }}>
                    {lista.map(it => <div key={it.id} style={{ breakInside: 'avoid', marginBottom: 2 }}>{tarjeta(it)}</div>)}
                  </div>
                )
              }
              // Todas de texto (energía): se estiran parejas en una grilla por filas.
              return (
                <div className="sc-cards" style={{ display: 'grid', gridTemplateColumns: gridTarjetas(lista.length), gap: 2, marginTop: margen }}>
                  {lista.map(tarjeta)}
                </div>
              )
            })()}
          </section>
        )
      })}

      {/* ── INVESTMENT ── */}
      {hayInversion && (
        <section id="investment" className="sc-section" style={{ background: C.bg, padding: '100px 6vw', ...(C.refuerzo ? { scrollMarginTop: 48 } : {}) }}>
          <EncabezadoSeccion S={S} eyebrow={t('opp_eyebrow')} titulo={t('opp_titulo')} />

          {/* Pestañas solo si hay las dos cosas que alternar. */}
          {hayStory && hayBrief && (
            <div className="sc-tabs" style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 56 }}>
              <button style={investTabStyle(C, investTab === 'story')} onClick={() => setInvestTab('story')}>{t('opp_tab_story') || (es ? 'La historia' : 'The Story')}</button>
              <button style={investTabStyle(C, investTab === 'brief')} onClick={() => setInvestTab('brief')}>{t('opp_tab_brief') || (es ? 'Resumen de inversión' : 'Investment Brief')}</button>
            </div>
          )}

          {hayStory && investTab === 'story' && (
            <div style={{ maxWidth: 700 }}>
              {t('story_p1') && <p className="text-sdm-xl sc-leading" style={{ ...S.bodyText, color: C.navyLight, marginBottom: 24 }}>{t('story_p1')}</p>}
              {t('story_p2') && <p className="sc-leading" style={S.bodyText}>{t('story_p2')}</p>}
              {t('story_p3') && <p className="sc-leading" style={{ ...S.bodyText, marginTop: 24 }}>{t('story_p3')}</p>}
              {(t('brief_upside_titulo') || t('brief_upside_texto')) && (
                <div className="sc-box" style={{ ...S.upsideBox, marginTop: 48 }}>
                  {t('brief_upside_titulo') && <p style={S.upsideTitle}>{t('brief_upside_titulo')}</p>}
                  {t('brief_upside_texto') && <p className="sc-leading" style={{ ...S.bodyText, color: C.muted }}>{t('brief_upside_texto')}</p>}
                </div>
              )}
            </div>
          )}

          {hayBrief && investTab === 'brief' && (
            <>
              {brief.length > 0 && (
                <div className="sc-brief" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(brief.length, 3)}, 1fr)`, gap: 1, marginBottom: 2 }}>
                  {brief.map(it => (
                    <div key={it.id} className="sc-brief-card" style={S.briefCard}>
                      <div style={S.briefNum}>{ti(it, 'valor')}</div>
                      <div style={S.briefLabel}>{ti(it, 'titulo')}</div>
                      <div style={S.briefNote}>{ti(it, 'descripcion')}</div>
                    </div>
                  ))}
                </div>
              )}
              {(t('brief_legal_titulo') || t('brief_legal_texto')) && (
                <div className="sc-box" style={S.upsideBox}>
                  {t('brief_legal_titulo') && <p style={S.upsideTitle}>{t('brief_legal_titulo')}</p>}
                  {t('brief_legal_texto') && <p className="sc-leading" style={{ ...S.bodyText, color: C.muted }}>{t('brief_legal_texto')}</p>}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── PROPERTY DETAILS ── */}
      {hayFicha && (
        <section className="sc-section" style={{ ...S.section, background: C.bgMid }}>
          <EncabezadoSeccion S={S} eyebrow={t('details_eyebrow')} titulo={t('details_titulo')} filete={false} />
          {bloquesFicha.length > 1 && bloquesFicha.length % 2 === 1 ? (
            // Número impar de bloques (3): en una grilla de 2 columnas el último queda solo con un
            // hueco al lado. En columnas se apilan sin hueco. Con número par se mantiene la grilla.
            <div className="sc-ficha-cols" style={{ columns: '2 420px', columnGap: 1, marginTop: t('details_eyebrow') || t('details_titulo') ? 56 : 0 }}>
              {bloquesFicha.map(b => <div key={b.slug} style={{ breakInside: 'avoid', marginBottom: 1 }}><BloqueFicha S={S} title={b.title} rows={b.rows} /></div>)}
            </div>
          ) : (
            <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: bloquesFicha.length > 1 ? '1fr 1fr' : '1fr', gap: 1, marginTop: t('details_eyebrow') || t('details_titulo') ? 56 : 0 }}>
              {bloquesFicha.map(b => <BloqueFicha key={b.slug} S={S} title={b.title} rows={b.rows} />)}
            </div>
          )}
        </section>
      )}

      {/* ── GALLERY ── */}
      {galeria.length > 0 && (
        <section className="sc-section" style={{ padding: '100px 6vw' }}>
          <EncabezadoSeccion S={S} eyebrow={t('gallery_eyebrow')} titulo={t('gallery_titulo')} filete={false} tituloStyle={{ marginBottom: 48 }} />
          {galeria.length >= MOSAICO.length ? (
            <div className="sc-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 200px)', ...(galeria.length > MOSAICO.length ? { gridAutoRows: '200px' } : {}), gap: 3 }}>
              {galeria.map((g, i) => {
                // De la 8.ª en adelante las fotos fluyen de a 4 por fila. Si la última fila queda
                // incompleta, la última foto se ensancha para cerrarla: sin hueco.
                const ultimaEnFilaIncompleta = i === galeria.length - 1 && i >= MOSAICO.length && (galeria.length - MOSAICO.length) % 4 !== 0
                const col = MOSAICO[i]?.[0] ?? (ultimaEnFilaIncompleta ? `span ${5 - ((galeria.length - MOSAICO.length) % 4)}` : undefined)
                return <ItemGaleria key={g.id} img={g.img as string} col={col} row={MOSAICO[i]?.[1]} />
              })}
            </div>
          ) : (
            // Con menos de 7 fotos el mosaico dejaría huecos: grilla pareja.
            <div className="sc-gallery" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(galeria.length, 3)}, 1fr)`, gridAutoRows: '240px', gap: 3 }}>
              {galeria.map(g => <ItemGaleria key={g.id} img={g.img as string} />)}
            </div>
          )}
        </section>
      )}

      {/* ── CONTACT ── */}
      <section id="contact" className="sc-section sc-contact" style={{ ...(C.refuerzo ? { scrollMarginTop: 48 } : {}), padding: '100px 6vw 120px', display: 'grid', gridTemplateColumns: filaContacto ? '1fr 1fr' : '1fr', gap: 80, alignItems: 'start', borderTop: `1px solid ${C.border}` }}>
        {filaContacto && (
          <div>
            {t('contact_eyebrow') && <p style={S.eyebrow}>{t('contact_eyebrow')}</p>}
            {t('contact_titulo') && <h2 style={{ ...S.sectionTitle, fontSize: 'clamp(32px, 4vw, 54px)' }}>{t('contact_titulo')}</h2>}
            {c('precio_display') && (
              <div className="sc-price" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(40px, 5.5vw, 76px)', color: C.navyLight, lineHeight: 1, margin: '24px 0 8px' }}>
                {c('precio_display')}
              </div>
            )}
            {t('precio_sub') && (
              <p className="text-sdm-xs" style={{ fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.muted, marginBottom: 40 }}>{t('precio_sub')}</p>
            )}
            {t('contacto_parrafo') && <p className="sc-leading" style={S.bodyText}>{t('contacto_parrafo')}</p>}
            {(c('contacto_empresa') || c('contacto_telefono')) && (
              <div style={{ marginTop: 40 }}>
                {c('contacto_empresa') && <p className="text-sdm-sm" style={{ fontWeight: 300, color: C.muted, marginBottom: 4 }}>{c('contacto_empresa')}</p>}
                {c('contacto_telefono') && <p className="text-sdm-lg" style={{ fontWeight: 400, color: C.acento }}>{c('contacto_telefono')}</p>}
              </div>
            )}
          </div>
        )}

        <div>
          {envio === 'ok' ? (
            <div style={{ paddingTop: 40 }}>
              <p className="text-sdm-display-md" style={{ ...S.sectionTitle }}>{es ? 'Gracias.' : 'Thank you.'}</p>
              <p className="sc-leading" style={S.bodyText}>{es ? 'Hemos recibido tu mensaje y nos pondremos en contacto pronto.' : "We've received your message and will be in touch shortly."}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {[
                { label: es ? 'Nombre completo'    : 'Full name',     key: 'name',  type: 'text' },
                { label: es ? 'Correo electrónico' : 'Email address', key: 'email', type: 'email' },
              ].map(({ label, key, type }) => (
                <label key={key} style={{ display: 'block', marginBottom: 24 }}>
                  {/* S.formLabel se queda en el <span>: lleva letterSpacing
                      0.3em y textTransform uppercase, y S.formInput no fija
                      ninguna de las dos. En el <label> se heredarían al texto
                      que el visitante escribe. */}
                  <span style={S.formLabel}>{label}</span>
                  <input type={type} required style={S.formInput} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </label>
              ))}
              <label style={{ display: 'block', marginBottom: 32 }}>
                <span style={S.formLabel}>{es ? 'Mensaje' : 'Message'}</span>
                <textarea rows={4} style={S.formTextarea} value={form.message} placeholder={es ? 'Cuéntanos tu interés en esta propiedad...' : 'Tell us about your interest in this property...'} onChange={e => setForm({ ...form, message: e.target.value })} />
              </label>
              <button type="submit" className="sc-btn" disabled={envio === 'enviando'} style={{ ...S.btnPrimary, opacity: envio === 'enviando' ? 0.7 : 1, cursor: envio === 'enviando' ? 'wait' : 'pointer' }}>
                {envio === 'enviando' ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar consulta' : 'Send Inquiry')}
              </button>
              {envio === 'error' && (
                <p role="alert" className="sc-leading" style={{ ...S.bodyText, marginTop: 20, color: C.cream }}>
                  {es
                    ? `No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo${c('contacto_telefono') ? `, o llámanos al ${c('contacto_telefono')}` : ''}.`
                    : `We couldn't send your message. Please check your connection and try again${c('contacto_telefono') ? `, or call us at ${c('contacto_telefono')}` : ''}.`}
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <span style={S.footerText}>© {new Date().getFullYear()} {piePropio}</span>
        <button style={S.backBtn} onClick={() => navigate(`/propiedades/${propiedad?.slug || propiedadId}`)}>
          <FlechaIzquierda />
          {es ? 'Volver a la propiedad' : 'Back to the property'}
        </button>
      </footer>

    </div>
  )
}
