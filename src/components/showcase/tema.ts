// Paleta y estilos del showcase.
//
// LA PALETA SALE DEL DATO. Todas las propiedades comparten el mismo fondo casi
// negro y los mismos neutros; lo que cambia de una a otra es el ACENTO, que se
// lee de `showcase_contenido.tema_acento` (un `#rrggbb`). El verde `#4CAF82` es la
// marca de El Barranco y vive en SU fila, no en este archivo; La Colmena lleva el
// oliva `#7A8B5A`.
//
// Contraste, medido: el texto del acento se pinta sobre `bg`, `bgMid` y sobre una
// tarjeta (`bgCard`) encima de cualquiera de los dos; el botón pinta `tinta` sobre
// el acento. Para el oliva #7A8B5A:
//     texto sobre bg 5,30 · sobre bgMid 5,03 · sobre tarjeta/bgMid 4,71 (el peor)
//     botón y selector de idioma activo (tinta sobre acento) 5,30
// Todos ≥ 4,5:1. Para el verde de El Barranco, 7,25 · 6,88 · 6,45 · 7,25.
//
// Un acento nuevo hay que medirlo antes de usarlo: no cualquier color pasa. Si
// falta o no es un `#rrggbb`, el showcase usa `ACENTO_POR_DEFECTO`, un azul claro
// neutro que pasa con holgura (> 9:1), en vez de dejar la página sin color.

import type { CSSProperties } from 'react'

export const ACENTO_POR_DEFECTO = '#A8C4D8'

export const BASE = {
  bg:       '#0a0c0b',
  bgMid:    '#0f1410',
  bgCard:   'rgba(255,255,255,0.03)',
  navyLight:'#A8C4D8',
  cream:    '#f0ece4',
  muted:    '#7a7268',
  // `faint` da ~1,5:1 sobre el fondo: no lo usa nada, queda para lo que deba ser
  // deliberadamente apagado y no sea texto.
  faint:    '#3a3530',
  // Etiquetas, notas y copyright: texto pequeño que sí hay que leer (rótulos de
  // las stats, notas del brief, línea del pie). 5,38:1 sobre el fondo.
  dim:      '#8c857b',
  border:   'rgba(168,196,216,0.15)',
  // Texto sobre el acento (botón primario, selector de idioma activo).
  tinta:    '#0a0c0b',
}

export type Paleta = typeof BASE & { acento: string; bordeAcento: string }

export function paleta(acento?: string): Paleta {
  const hex = acento && /^#[0-9a-f]{6}$/i.test(acento) ? acento : ACENTO_POR_DEFECTO
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return { ...BASE, acento: hex, bordeAcento: `rgba(${r},${g},${b},0.25)` }
}

export type Estilos = Record<string, CSSProperties>

export function crearEstilos(C: Paleta): Estilos {
  return {
    page: { fontFamily: "'Jost', sans-serif", background: C.bg, color: C.cream, minHeight: '100vh', overflowX: 'hidden' },
    hero: { position: 'relative', height: '100vh', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
    heroOverlay: { position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(10,12,11,0.96) 0%, rgba(10,12,11,0.35) 55%, rgba(10,12,11,0.15) 100%)` },
    heroContent: { position: 'relative', zIndex: 2, padding: '0 6vw 64px', maxWidth: 860 },
    heroEyebrow: { fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.4em', textTransform: 'uppercase', color: C.acento, marginBottom: 20 },
    heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(52px, 8vw, 100px)', lineHeight: 1.0, margin: '0 0 8px', color: C.cream },
    heroSubtitle: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 36px)', color: C.navyLight, margin: '0 0 32px' },
    heroDesc: { fontWeight: 300, fontSize: 'var(--sdm-text-base)', lineHeight: 1.85, color: 'rgba(255,255,255,0.85)', maxWidth: 480, margin: '0 0 44px' },
    heroActions: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' },
    btnPrimary: { background: C.acento, color: C.tinta, border: 'none', padding: '14px 36px', fontFamily: "'Jost', sans-serif", fontWeight: 500, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' },
    btnGhost: { background: 'transparent', color: C.cream, border: `1px solid rgba(168,196,216,0.3)`, padding: '14px 36px', fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
    heroDots: { position: 'absolute', bottom: 28, right: '6vw', display: 'flex', gap: 8, zIndex: 3 },
    section: { padding: '100px 6vw' },
    eyebrow: { fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.4em', textTransform: 'uppercase', color: C.acento, marginBottom: 16 },
    sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 1.1, margin: '0 0 24px', color: C.cream },
    divider: { width: 40, height: 1, background: C.acento, margin: '0 0 32px', border: 'none', opacity: 0.7 },
    bodyText: { fontWeight: 300, fontSize: 'var(--sdm-text-lg)', lineHeight: 1.9, color: C.muted, maxWidth: 560 },
    statRow: { display: 'flex', gap: 52, marginTop: 52, flexWrap: 'wrap' },
    statNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-lg)', fontWeight: 300, color: C.navyLight, lineHeight: 1, display: 'block' },
    statLabel: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.dim, marginTop: 6, display: 'block' },
    amenityCard: { padding: '36px 28px', background: C.bgCard, borderTop: `1px solid ${C.border}` },
    amenityTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-text-xl)', fontWeight: 400, color: C.cream, margin: '14px 0 6px' },
    amenityDesc: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.muted, lineHeight: 1.65 },
    briefCard: { padding: '40px 32px', background: C.bgCard, borderTop: `1px solid ${C.bordeAcento}` },
    briefNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-lg)', fontWeight: 300, color: C.navyLight, lineHeight: 1, marginBottom: 8 },
    briefLabel: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 },
    briefNote: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.dim, lineHeight: 1.7 },
    upsideBox: { border: `1px solid ${C.border}`, padding: '40px 48px', marginTop: 2 },
    upsideTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-sm)', fontWeight: 300, color: C.navyLight, marginBottom: 16 },
    fichaBlock: { padding: '32px 40px', background: C.bgCard, borderTop: `1px solid ${C.border}` },
    fichaBlockTitle: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: C.acento, marginBottom: 20 },
    fichaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
    fichaKey: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.muted },
    fichaVal: { fontSize: 'var(--sdm-text-sm)', fontWeight: 400, color: C.cream, textAlign: 'right' },
    footer: { padding: '32px 6vw', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
    footerText: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.dim, letterSpacing: '0.08em' },
    backBtn: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Jost', sans-serif" },
    formLabel: { display: 'block', fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 },
    formInput: { width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(168,196,216,0.2)`, padding: '10px 0', color: C.cream, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-base)', boxSizing: 'border-box' },
    formTextarea: { width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(168,196,216,0.2)`, padding: '10px 0', color: C.cream, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-base)', resize: 'none', boxSizing: 'border-box', minHeight: 80 },
  }
}

// Estilo dinámico — fuera de `crearEstilos` porque es una función, no un CSSProperties.
export const investTabStyle = (C: Paleta, active: boolean): CSSProperties => ({
  padding: '12px 28px', background: 'transparent', border: 'none',
  borderBottom: active ? `1px solid ${C.acento}` : '1px solid transparent',
  color: active ? C.cream : C.muted, fontFamily: "'Jost', sans-serif", fontWeight: 300,
  fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase',
  cursor: 'pointer', marginBottom: -1, transition: 'all 0.2s',
})
