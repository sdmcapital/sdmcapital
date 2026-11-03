// Piezas presentacionales del showcase. No saben de datos ni de idioma: reciben
// el texto ya resuelto, la paleta y los estilos.

import { useState } from 'react'
import { Icono } from './iconos'
import { thumbUrl } from '@/lib/imagenes'
import type { Estilos, Paleta } from './tema'

export function TarjetaActividad({ C, img, title, sub, icono }: { C: Paleta; img: string; title: string; sub: string; icono?: string | null }) {
  // MODO REFORZADO (ver tema.ts): el rótulo es texto de 11 px sobre una FOTO, y el acento puro sobre una foto clara no
  // llega a 4,5:1 con el degradado de siempre (medido: 3,1:1 en la tarjeta de pesca de El Barranco). Con el modo
  // activo el rótulo va en el acento aclarado y el degradado sostiene más arriba. Sin él, la tarjeta es la de siempre.
  const velo = C.refuerzo
    ? 'linear-gradient(to top, rgba(10,12,11,0.94) 0%, rgba(10,12,11,0.78) 38%, transparent 72%)'
    : 'linear-gradient(to top, rgba(10,12,11,0.88) 0%, transparent 60%)'
  return (
    <div className="group" style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', cursor: 'default' }}>
      {img && <img loading="lazy" decoding="async" src={img} alt={title} className="transition-transform duration-500 group-hover:scale-[1.06]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s ease' }} />}
      <div style={{ position: 'absolute', inset: 0, background: velo, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28 }}>
        {icono && <div style={{ marginBottom: 10 }}><Icono nombre={icono} color={C.acento} /></div>}
        <div className="text-sdm-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: C.cream, lineHeight: 1.2 }}>{title}</div>
        {sub && <div className="text-sdm-xs" style={{ fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.refuerzo ? C.acentoHero : C.acento, marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  )
}

/** Amenidad: tarjeta de texto, con su icono. Es la de El Barranco, sin cambios. */
export function TarjetaAmenidad({ S, C, titulo, desc, icono }: { S: Estilos; C: Paleta; titulo: string; desc: string; icono?: string | null }) {
  return (
    <div className="sc-amenity" style={S.amenityCard}>
      <Icono nombre={icono} color={C.acento} />
      <div style={S.amenityTitle}>{titulo}</div>
      {desc && <div style={S.amenityDesc}>{desc}</div>}
    </div>
  )
}

/** Ítem de las secciones nuevas (construcciones, energía, producción): foto
 *  arriba si la hay, una franja con las fotos adicionales si las hay, y debajo
 *  icono, título y descripción. Sin foto es una tarjeta de texto, sin hueco ni
 *  recuadro vacío donde iría la imagen. */
export function TarjetaItem({ S, C, img, fotos = [], titulo, desc, icono, ancha = false }: { S: Estilos; C: Paleta; img?: string | null; fotos?: string[]; titulo: string; desc: string; icono?: string | null; ancha?: boolean }) {
  return (
    // `ancha`: tarjeta en una grilla de 2 columnas donde todas llevan foto. La
    // tarjeta se estira a la altura de la fila (la grilla la iguala) y es la FOTO
    // la que absorbe la diferencia —se recorta un poco más o menos con
    // `object-fit: cover`—, así que ninguna tarjeta queda con un bloque vacío bajo
    // el texto. Foto 16:10 en vez de 4:3: más baja, menos vertical.
    <div className="group" style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, ...(ancha ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}) }}>
      {img && (
        <div style={{ overflow: 'hidden', aspectRatio: ancha ? '16/10' : '4/3', ...(ancha ? { position: 'relative', flex: '1 1 auto' } : {}) }}>
          <img loading="lazy" decoding="async" src={img} alt="" className="transition-transform duration-500 group-hover:scale-[1.05]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease', ...(ancha ? { position: 'absolute', inset: 0 } : {}) }} />
        </div>
      )}
      {img && fotos.length > 0 && (
        // Miniaturas de 400 px: cada una ocupa a lo sumo un tercio de la tarjeta.
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(fotos.length, 3)}, 1fr)`, gap: 2, marginTop: 2 }}>
          {fotos.map(f => (
            <div key={f} style={{ overflow: 'hidden', aspectRatio: fotos.length === 1 ? '16/9' : '4/3' }}>
              <img loading="lazy" decoding="async" src={thumbUrl(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      )}
      <div className="sc-amenity" style={{ padding: '28px 28px 36px' }}>
        <Icono nombre={icono} color={C.acento} />
        <div style={S.amenityTitle}>{titulo}</div>
        {desc && <div style={S.amenityDesc}>{desc}</div>}
      </div>
    </div>
  )
}

export function BloqueFoto({ src }: { src: string }) {
  return (
    <div className="group" style={{ overflow: 'hidden', aspectRatio: '16/9' }}>
      <img loading="lazy" decoding="async" src={src} alt="" className="transition-transform duration-500 group-hover:scale-[1.04]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} />
    </div>
  )
}

export function ItemGaleria({ img, col, row }: { img: string; col?: string; row?: string }) {
  return (
    <div className="group" style={{ gridColumn: col, gridRow: row, overflow: 'hidden' }}>
      <img loading="lazy" decoding="async" src={img} alt="" className="transition-transform duration-500 group-hover:scale-[1.05]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} />
    </div>
  )
}

export function BloqueFicha({ S, title, rows }: { S: Estilos; title: string; rows: { id: string; k: string; v: string }[] }) {
  return (
    <div className="sc-ficha" style={S.fichaBlock}>
      {title && <div style={S.fichaBlockTitle}>{title}</div>}
      {rows.map(({ id, k, v }) => (
        <div key={id} className="sc-ficha-row" style={S.fichaRow}>
          <span style={S.fichaKey}>{k}</span>
          <span className="sc-ficha-val" style={S.fichaVal}>{v}</span>
        </div>
      ))}
    </div>
  )
}

/** Eyebrow + título + filete de una sección. Cada pieza solo si hay dato. */
export function EncabezadoSeccion({ S, eyebrow, titulo, filete = true, tituloStyle }: { S: Estilos; eyebrow: string; titulo: string; filete?: boolean; tituloStyle?: React.CSSProperties }) {
  return (
    <>
      {eyebrow && <p style={S.eyebrow}>{eyebrow}</p>}
      {titulo && <h2 style={{ ...S.sectionTitle, ...tituloStyle }}>{titulo}</h2>}
      {filete && (eyebrow || titulo) && <hr style={S.divider} />}
    </>
  )
}

/**
 * Video de YouTube con carga diferida: hasta que el visitante pulsa NO hay iframe, así que no se
 * descarga nada de Google (ni scripts ni cookies) en cada visita. Antes de pulsar es la miniatura
 * del video y un botón de reproducción propio, en el acento de la propiedad; al pulsar se monta el
 * iframe (`youtube-nocookie.com`) ya con reproducción automática. Proporción 16:9 fija.
 */
export function VideoDiferido({ C, id, titulo, etiquetaPlay }: { C: Paleta; id: string; titulo: string; etiquetaPlay: string }) {
  const [activo, setActivo] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: C.bgMid, overflow: 'hidden' }}>
      {activo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      ) : (
        <button type="button" onClick={() => setActivo(true)} aria-label={`${etiquetaPlay}: ${titulo}`} className="group"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, border: 0, cursor: 'pointer', background: 'none', display: 'block' }}>
          <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,11,0.55) 0%, rgba(10,12,11,0.1) 55%)' }} />
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:scale-110"
            style={{ position: 'absolute', top: '50%', left: '50%', width: 72, height: 72, marginTop: -36, marginLeft: -36, borderRadius: '50%', background: C.acento, color: C.tinta, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px rgba(10,12,11,0.35)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
    </div>
  )
}
