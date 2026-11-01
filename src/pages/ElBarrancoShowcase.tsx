import { useState, useEffect, useRef } from 'react'
import SEO from '@/components/SEO'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const FONT_INJECT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');`

const C = {
  bg:          '#0a0c0b',
  bgMid:       '#0f1410',
  bgCard:      'rgba(255,255,255,0.03)',
  navy:        '#1B3A5C',
  navyLight:   '#A8C4D8',
  green:       '#4CAF82',
  greenMuted:  '#2d7a58',
  cream:       '#f0ece4',
  muted:       '#7a7268',
  faint:       '#3a3530',
  border:      'rgba(168,196,216,0.15)',
  borderGreen: 'rgba(76,175,130,0.25)',
}

const IMG = {
  hero:       'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531485042_utd1zrr91v.jpg',
  aerial:     'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531465482_ftlnnwfyutk.jpg',
  aerial2:    'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531466213_ny0iz0yewi.jpg',
  hero2:      'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531472893_zj233ren18a.jpg',
  exterior:   'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583053965_mg7v97c92vq.jpeg',
  room1:      'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583055168_28dt3gtnyn8.jpeg',
  room2:      'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583055875_ia6ypl5pr1.jpeg',
  restaurant: 'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583057089_pesdipnyo4.jpeg',
  pool:       'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583058072_uv5a2s1dwqf.jpeg',
  interior1:  'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583059062_cfjhlfacay7.jpeg',
  interior2:  'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583059865_4hizucq2vzy.jpeg',
  interior3:  'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583060861_i2rbjdkn90r.jpeg',
  interior4:  'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583061970_gzzmcc1mcul.jpeg',
  interior5:  'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583062780_z5513m43my.jpeg',
  view1:      'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583063859_qqx4hhentmb.jpeg',
  view2:      'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1777583064713_zh85bb8aor.jpeg',
  nature1:    'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531522207_oi7mb8uwuhr.jpg',
  nature2:    'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/1778531531394_0wvo8zwzu3l.jpg',
}

const Icon = {
  Bed: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20V10a2 2 0 012-2h18a2 2 0 012 2v10"/><path d="M3 16h22"/>
      <path d="M7 12h4a1 1 0 011 1v3H6v-3a1 1 0 011-1z"/><path d="M1 20h26M1 23h26" strokeOpacity="0.4"/>
    </svg>
  ),
  Fork: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V3"/><path d="M12 12v13"/>
      <path d="M20 3v18M20 3c0 4-3 6-3 9h6c0-3-3-5-3-9z"/>
    </svg>
  ),
  Spa: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="12" r="5"/><path d="M14 7C14 4 17 2 20 3c0 3-2 6-6 7z"/>
      <path d="M14 7C14 4 11 2 8 3c0 3 2 6 6 7z"/><path d="M8 20c0-3.31 2.69-6 6-6s6 2.69 6 6v1H8v-1z"/>
    </svg>
  ),
  Home: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L14 3l11 9"/><path d="M6 10v13h6v-7h4v7h6V10"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3L6 16h8l-1 9 11-13h-8l1-9z"/>
    </svg>
  ),
  Car: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v3h2v1a1 1 0 002 0v-1h14v1a1 1 0 002 0v-1h2v-3h-2L19 9H9L5 17z"/>
      <circle cx="8.5" cy="17.5" r="1.5"/><circle cx="19.5" cy="17.5" r="1.5"/>
      <path d="M9.5 9l-2 8M18.5 9l2 8M9 13h10"/>
    </svg>
  ),
  Key: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="11" r="5"/><path d="M14.5 15.5L25 25"/><path d="M21 22l-2-2M24 19l-2 2"/>
    </svg>
  ),
  Badge: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L14 17.3l-5.6 2.9 1.1-6.2L5 9.6l6.2-.9L14 3z"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5"/>
    </svg>
  ),
  Wave: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round">
      <path d="M3 14c2-4 4-6 6-6s4 4 6 4 4-6 6-6"/>
      <path d="M3 20c2-4 4-6 6-6s4 4 6 4 4-6 6-6" strokeOpacity="0.4"/>
    </svg>
  ),
  Fish: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12c0 5-4 9-10 10C6 23 3 20 3 16c0-2 1-4 3-5C3 8 6 5 12 4c2 3 4 6 4 8h2l4-4v8l-4-4h-2z"/>
      <circle cx="9" cy="13" r="1" fill={C.green}/>
    </svg>
  ),
  Mountain: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 24L10 10l5 8 3-4 7 10H3z"/><path d="M18 8a2 2 0 100-4 2 2 0 000 4z"/>
    </svg>
  ),
}

const S: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Jost', sans-serif", background: C.bg, color: C.cream, minHeight: '100vh', overflowX: 'hidden' },
  hero: { position: 'relative', height: '100vh', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  heroOverlay: { position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(10,12,11,0.96) 0%, rgba(10,12,11,0.35) 55%, rgba(10,12,11,0.15) 100%)` },
  heroContent: { position: 'relative', zIndex: 2, padding: '0 6vw 64px', maxWidth: 860 },
  heroEyebrow: { fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.4em', textTransform: 'uppercase', color: C.green, marginBottom: 20 },
  heroTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(52px, 8vw, 100px)', lineHeight: 1.0, margin: '0 0 8px', color: C.cream },
  heroSubtitle: { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 36px)', color: C.navyLight, margin: '0 0 32px' },
  heroDesc: { fontWeight: 300, fontSize: 'var(--sdm-text-base)', lineHeight: 1.85, color: 'rgba(255,255,255,0.85)', maxWidth: 480, margin: '0 0 44px' },
  heroActions: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' },
  btnPrimary: { background: C.green, color: '#0a0c0b', border: 'none', padding: '14px 36px', fontFamily: "'Jost', sans-serif", fontWeight: 500, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' },
  btnGhost: { background: 'transparent', color: C.cream, border: `1px solid rgba(168,196,216,0.3)`, padding: '14px 36px', fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  heroDots: { position: 'absolute', bottom: 28, right: '6vw', display: 'flex', gap: 8, zIndex: 3 },
  section: { padding: '100px 6vw' },
  eyebrow: { fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.4em', textTransform: 'uppercase', color: C.green, marginBottom: 16 },
  sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 1.1, margin: '0 0 24px', color: C.cream },
  divider: { width: 40, height: 1, background: C.green, margin: '0 0 32px', border: 'none', opacity: 0.7 },
  bodyText: { fontWeight: 300, fontSize: 'var(--sdm-text-lg)', lineHeight: 1.9, color: C.muted, maxWidth: 560 },
  statRow: { display: 'flex', gap: 52, marginTop: 52, flexWrap: 'wrap' },
  statNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-lg)', fontWeight: 300, color: C.navyLight, lineHeight: 1, display: 'block' },
  statLabel: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.faint, marginTop: 6, display: 'block' },
  amenityCard: { padding: '36px 28px', background: C.bgCard, borderTop: `1px solid ${C.border}` },
  amenityTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-text-xl)', fontWeight: 400, color: C.cream, margin: '14px 0 6px' },
  amenityDesc: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.muted, lineHeight: 1.65 },
  briefCard: { padding: '40px 32px', background: C.bgCard, borderTop: `1px solid ${C.borderGreen}` },
  briefNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-lg)', fontWeight: 300, color: C.navyLight, lineHeight: 1, marginBottom: 8 },
  briefLabel: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 },
  briefNote: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.faint, lineHeight: 1.7 },
  upsideBox: { border: `1px solid ${C.border}`, padding: '40px 48px', marginTop: 2 },
  upsideTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 'var(--sdm-display-sm)', fontWeight: 300, color: C.navyLight, marginBottom: 16 },
  fichaBlock: { padding: '32px 40px', background: C.bgCard, borderTop: `1px solid ${C.border}` },
  fichaBlockTitle: { fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: C.green, marginBottom: 20 },
  fichaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` },
  fichaKey: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.muted },
  fichaVal: { fontSize: 'var(--sdm-text-sm)', fontWeight: 400, color: C.cream, textAlign: 'right' },
  footer: { padding: '32px 6vw', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  footerText: { fontSize: 'var(--sdm-text-sm)', fontWeight: 300, color: C.faint, letterSpacing: '0.08em' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Jost', sans-serif" },
  formLabel: { display: 'block', fontSize: 'var(--sdm-text-xs)', fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 },
  formInput: { width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(168,196,216,0.2)`, padding: '10px 0', color: C.cream, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-base)', boxSizing: 'border-box' as const },
  formTextarea: { width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(168,196,216,0.2)`, padding: '10px 0', color: C.cream, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-base)', resize: 'none' as const, boxSizing: 'border-box' as const, minHeight: 80 },
}

// Estilo dinámico — fuera de S porque es una función, no un CSSProperties.
const investTabStyle = (active: boolean): React.CSSProperties => ({ padding: '12px 28px', background: 'transparent', border: 'none', borderBottom: active ? `1px solid ${C.green}` : '1px solid transparent', color: active ? C.cream : C.muted, fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: 'var(--sdm-text-xs)', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: -1, transition: 'all 0.2s' })

export default function ElBarrancoShowcase() {
  const navigate = useNavigate()
  const [slide, setSlide]           = useState(0)
  const [investTab, setInvestTab]   = useState<'story' | 'brief'>('story')
  const [formSent, setFormSent]     = useState(false)
  const [form, setForm]             = useState({ name: '', email: '', message: '' })
  const [cms, setCms]               = useState<Record<string, string>>({})
  const [cmsLoading, setCmsLoading] = useState(true)
  const [lang, setLang]             = useState<'en' | 'es'>('en')
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  // EN default; uses key_es if lang=es and value exists
  const t = (key: string, fallback: string) => {
    const esKey = `${key}_es`
    return lang === 'es' && cms[esKey] ? cms[esKey] : (cms[key] || fallback)
  }
  // for images and numbers — no ES variant
  const c = (key: string, fallback: string) => cms[key] || fallback

  const heroSlides = [
    c('hero_img_1', IMG.hero),
    c('hero_img_2', IMG.aerial),
    c('hero_img_3', IMG.hero2),
    c('hero_img_4', IMG.view1),
  ]

  const activities = [
    { img: c('act_1_img', IMG.nature1), title: t('actividad_1_titulo', 'Whitewater Rafting'), sub: t('actividad_1_sub', 'Class V+ · Río Futaleufú'),      Icon: Icon.Wave },
    { img: c('act_2_img', IMG.view2),   title: t('actividad_2_titulo', 'Fly Fishing'),         sub: t('actividad_2_sub', 'World-class trout · Patagonia'), Icon: Icon.Fish },
    { img: c('act_3_img', IMG.nature2), title: t('actividad_3_titulo', 'Trekking & Riding'),   sub: t('actividad_3_sub', 'Valle Las Escalas · Glaciers'),  Icon: Icon.Mountain },
  ]

  const amenities = [
    { IconComp: Icon.Bed,   title: t('amenidad_1_titulo', '10 Rooms'),         desc: t('amenidad_1_desc', '24 m² each, en-suite, fully furnished') },
    { IconComp: Icon.Fork,  title: t('amenidad_2_titulo', 'Restaurant'),       desc: t('amenidad_2_desc', '40 covers, full bar, liquor license') },
    { IconComp: Icon.Spa,   title: t('amenidad_3_titulo', 'Wellness'),         desc: t('amenidad_3_desc', 'Pool 5×7, sauna, massage room') },
    { IconComp: Icon.Home,  title: t('amenidad_4_titulo', 'Residence'),        desc: t('amenidad_4_desc', "Separate 2BD/2BA owner's house + office") },
    { IconComp: Icon.Bolt,  title: t('amenidad_5_titulo', 'Infrastructure'),   desc: t('amenidad_5_desc', '17kW generator, pellet boiler, laundry') },
    { IconComp: Icon.Car,   title: t('amenidad_6_titulo', 'Parking'),          desc: t('amenidad_6_desc', '5 vehicle capacity on-site') },
    { IconComp: Icon.Key,   title: t('amenidad_7_titulo', 'Turnkey Sale'),     desc: t('amenidad_7_desc', 'All furniture & equipment included') },
    { IconComp: Icon.Badge, title: t('amenidad_8_titulo', 'Registered Brand'), desc: t('amenidad_8_desc', 'El Barranco — INAPI certified') },
  ]

  useEffect(() => {
    supabase.from('showcase_barranco').select('clave, valor').then(({ data }) => {
      if (data) {
        const loaded: Record<string, string> = {}
        data.forEach(({ clave, valor }: { clave: string; valor: string }) => { loaded[clave] = valor })
        setCms(loaded)
      }
      setCmsLoading(false)
    }, () => setCmsLoading(false))
  }, [])

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = FONT_INJECT
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  // 2.2.2: rota cada 5,5s indefinidamente, así que hace falta poder pararlo.
  // Nace pausado si el sistema pide menos movimiento.
  const [pausado, setPausado] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const startCarousel = () => {
    if (interval.current) clearInterval(interval.current)
    if (pausado) return
    interval.current = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 5500)
  }
  useEffect(() => {
    if (cmsLoading) return
    startCarousel()
    return () => { if (interval.current) clearInterval(interval.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `startCarousel` se redefine en cada render, así que con ella en el array el efecto correría en cada render: limpiaría el `setInterval` y lo volvería a armar desde cero antes de cumplir los 5500 ms, y el carrusel no pasaría nunca de la primera lámina. Lo que debe reiniciarlo es `cmsLoading` y `pausado`, que ya están.
  }, [cmsLoading, pausado])

  const goSlide = (i: number) => { setSlide(i); startCarousel() }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSent(true)
  }

  if (cmsLoading) return (
    <div style={{ background: '#0a0c0b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&display=swap');`}</style>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(32px, 6vw, 56px)', color: '#f0ece4', letterSpacing: '0.06em', margin: 0, opacity: 0.85 }}>
        El Barranco
      </p>
    </div>
  )

  return (
    // `lang` en el contenedor, y no en el <html>.
    //
    // El <html lang="es"> de index.html es fijo y nadie lo actualiza, pero esta
    // pagina arranca en INGLES —el estado local parte en 'en'— y sirve todo su
    // texto en ingles. Un lector de pantalla lo pronunciaria con fonemas
    // espanoles: «The Barranco» sonando como si fuera castellano.
    //
    // Marcar el contenedor alcanza: `lang` se hereda, asi que toda la seccion
    // queda en el idioma correcto, y el resto del sitio sigue en es. Cambia con
    // el selector EN/ES sin tocar nada mas.
    //
    // `bx-*` son las clases de comportamiento móvil de esta página: viven en
    // `mobile.css` (bloque «Showcase El Barranco»), bajo 768px. En escritorio no
    // hacen nada, y los estilos inline de arriba siguen siendo la fuente de verdad.
    <div className="sitio-publico bx-page" lang={lang} style={S.page}>
      {/* En ingles porque la pagina arranca en ingles: el estado `lang` parte en
          'en' y solo cambia si el visitante pulsa ES. Un titulo en espanol para
          una pagina que se ve en ingles descoloca en la pestana y al compartir. */}
      <SEO
        title={lang === 'es' ? 'Hotel El Barranco · Futaleufú' : 'Hotel El Barranco · Futaleufú, Patagonia'}
        description={lang === 'es'
          ? 'Hotel boutique y restaurante en operación en Futaleufú, Patagonia. 25 años de historia, en venta con SDM Capital.'
          : 'A fully operational boutique hotel and restaurant in Futaleufú, Patagonia. 25 years of history, for sale with SDM Capital.'}
        url="/propiedades/hotel-restaurante-futaleufu-futaleufu-10d/showcase"
        type="article"
      />

      {/* ── Language toggle ──
          Escritorio: flota fijo arriba a la derecha. `bx-bar` no tiene estilo
          propio fuera de móvil y, al ser su hijo `fixed`, no ocupa espacio.
          Móvil: `mobile.css` lo vuelve una barra pegajosa de ancho completo, con
          fondo sólido y EN el flujo, para que no se superponga al título. */}
      <div className="bx-bar">
        <div className="bx-toggle" style={{ position: 'fixed', top: 20, right: 24, zIndex: 200, display: 'flex', overflow: 'hidden', border: '1px solid rgba(168,196,216,0.2)' }}>
          {(['en', 'es'] as const).map(l => (
            <button className="text-sdm-xs" key={l} onClick={() => setLang(l)} style={{ padding: '7px 13px',
              background: lang === l ? C.green : 'rgba(10,12,11,0.75)',
              border: 'none',
              color: lang === l ? '#0a0c0b' : 'rgba(240,236,228,0.55)',
              fontFamily: "'Jost', sans-serif", fontWeight: 500,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s', backdropFilter: 'blur(8px)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="bx-hero" style={S.hero}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroSlides[slide]})`, backgroundSize: 'cover', backgroundPosition: 'center 40%', transition: 'background-image 1.2s ease' }} />
        <div style={S.heroOverlay} />
        <div className="bx-hero-content" style={S.heroContent}>
          <p style={S.heroEyebrow}>SDM Capital · Exclusive Listing · Futaleufú, Patagonia</p>
          <h1 style={S.heroTitle}>{c('hero_titulo', 'Hotel El Barranco')}</h1>
          <p style={S.heroSubtitle}>{t('hero_subtitulo', 'Where the river meets the mountains')}</p>
          <p className="bx-leading" style={S.heroDesc}>{t('hero_tagline', "A fully operational boutique hotel and restaurant with 25 years of history, positioned at the gateway to one of the world's premier adventure destinations. Offered turnkey — ready to continue, ready to grow.")}</p>
          <div className="bx-hero-actions" style={S.heroActions}>
            <a href="#contact" className="bx-btn" style={S.btnPrimary}>{lang === 'es' ? 'Solicitar información' : 'Request Information'}</a>
            <a href="#investment" className="bx-btn" style={S.btnGhost} onClick={() => setInvestTab('brief')}>{lang === 'es' ? 'Ver resumen financiero' : 'View Investment Brief'}</a>
          </div>
        </div>
        <div style={{ ...S.heroDots, display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* El nombre sigue al idioma activo: esta página arranca en inglés y
              un rótulo fijo en español no lo leería nadie de los que la usan. */}
          <button
            type="button"
            onClick={() => setPausado(p => !p)}
            aria-label={pausado
              ? (lang === 'es' ? 'Reanudar el cambio automático de fotos' : 'Resume the automatic photo change')
              : (lang === 'es' ? 'Pausar el cambio automático de fotos'   : 'Pause the automatic photo change')}
            className="area-44"
            style={{ width: 20, height: 20, marginRight: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,12,11,0.6)', border: 'none', borderRadius: '50%', color: C.cream, cursor: 'pointer', padding: 0 }}
          >
            {pausado
              ? <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><path d="M0 0l8 4.5L0 9z"/></svg>
              : <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor"><rect x="0" y="0" width="3" height="9"/><rect x="5" y="0" width="3" height="9"/></svg>}
          </button>
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} aria-label={lang === 'es' ? `Foto ${i + 1} de ${heroSlides.length}` : `Slide ${i + 1} of ${heroSlides.length}`} style={{ width: i === slide ? 24 : 6, height: 6, background: i === slide ? C.green : 'rgba(240,236,228,0.25)', borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
          ))}
        </div>
      </section>

      {/* ── DESTINATION ── */}
      <section className="bx-section" style={{ ...S.section, maxWidth: 1300, margin: '0 auto' }}>
        <div className="bx-grid-2 bx-dest" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <p style={S.eyebrow}>{t('dest_eyebrow', 'The Destination')}</p>
            <h2 style={S.sectionTitle}>{t('dest_titulo', 'Futaleufú — A world unto itself')}</h2>
            <hr style={S.divider} />
            <p className="bx-leading" style={S.bodyText}>
              {t('destination_p1', 'Nested deep within Chilean Patagonia, Futaleufú is a name whispered among adventurers across the globe. Its river — a torrent of glacial turquoise — carries Class V+ rapids through valleys of impossible beauty. The kind of place that changes people.')}
            </p>
            <p className="bx-leading" style={{ ...S.bodyText,marginTop: 20 }}>
              {t('destination_p2', 'El Barranco has welcomed guests at the center of it all for over two decades. Anglers from Montana, kayakers from Europe, families discovering Patagonia for the first time. The destination does the marketing. The hotel delivers the experience.')}
            </p>
            <div className="bx-stats" style={S.statRow}>
              {[
                { num: c('dest_stat1_num', '25+'),      label: t('dest_stat_1_label', 'Years in operation') },
                { num: c('dest_stat2_num', 'Class V+'), label: t('dest_stat_2_label', 'River rating') },
                { num: c('dest_stat3_num', '10'),       label: t('dest_stat_3_label', 'Hotel rooms') },
              ].map(({ num, label }) => (
                <div key={label} className="bx-stat">
                  <span className="bx-stat-num" style={S.statNum}>{num}</span>
                  <span className="bx-stat-label" style={S.statLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <img loading="lazy" decoding="async" src={c('destination_foto', IMG.exterior)} alt="Futaleufú aerial view" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover' }} />
        </div>
      </section>

      {/* ── ACTIVITIES ── */}
      <section className="bx-section bx-section--flush" style={{ padding: '0 6vw 100px' }}>
        <p style={S.eyebrow}>{t('exp_eyebrow', 'The Experience')}</p>
        <h2 style={{ ...S.sectionTitle, maxWidth: 500 }}>{t('exp_titulo', 'Adventures at your doorstep')}</h2>
        <div className="bx-activities" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: 56 }}>
          {activities.map((a) => <ActivityCard key={a.title} {...a} />)}
        </div>
        <p className="text-sdm-base bx-leading" style={{ ...S.bodyText, maxWidth: 680, marginTop: 40, opacity: 0.8 }}>
          {t('act_p', "Beyond the river: guided fly fishing on Lago Lonconao and Río Espolón, family floating, horseback riding through Valle Las Escalas, trekking to hidden glacier lakes, and kayaking across Patagonia's most pristine waterways.")}
        </p>
      </section>

      {/* ── PROPERTY ── */}
      <section className="bx-section" style={{ background: C.bgMid, padding: '100px 6vw' }}>
        <p style={S.eyebrow}>{t('prop_eyebrow', 'The Property')}</p>
        <h2 style={S.sectionTitle}>{t('prop_titulo', 'Rooms, Restaurant & Amenities')}</h2>
        <hr style={S.divider} />
        <p className="bx-leading" style={S.bodyText}>
          {t('propiedad_desc', 'Designed in mountain architecture, El Barranco offers 10 fully equipped rooms — each approximately 24 m² with en-suite bathroom — alongside a 40-seat restaurant rooted in Patagonian cuisine. Lamb, trout, regional produce. The kind of table guests remember.')}
        </p>

        <div className="bx-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 56 }}>
          {[
            c('prop_foto1', IMG.room1),
            c('prop_foto2', IMG.restaurant),
            c('prop_foto3', IMG.room2),
            c('prop_foto4', IMG.pool),
          ].map((src, i) => <PhotoBlock key={i} src={src} />)}
        </div>

        <div className="bx-amenities" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginTop: 56 }}>
          {amenities.map(({ IconComp, title, desc }) => (
            <div key={title} className="bx-amenity" style={S.amenityCard}>
              <IconComp />
              <div style={S.amenityTitle}>{title}</div>
              <div style={S.amenityDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INVESTMENT ── */}
      <section id="investment" className="bx-section" style={{ background: C.bg, padding: '100px 6vw' }}>
        <p style={S.eyebrow}>{t('opp_eyebrow', 'The Opportunity')}</p>
        <h2 style={S.sectionTitle}>{t('opp_titulo', 'An asset built to scale')}</h2>
        <hr style={S.divider} />

        <div className="bx-tabs" style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 56 }}>
          <button style={investTabStyle(investTab === 'story')} onClick={() => setInvestTab('story')}>{t('opp_tab_story', 'The Story')}</button>
          <button style={investTabStyle(investTab === 'brief')} onClick={() => setInvestTab('brief')}>{t('opp_tab_brief', 'Investment Brief')}</button>
        </div>

        {investTab === 'story' && (
          <div style={{ maxWidth: 700 }}>
            <p className="text-sdm-xl bx-leading" style={{ ...S.bodyText, color: C.navyLight, marginBottom: 24 }}>
              {t('story_p1', "A business that runs itself for half the year — imagine what you could do with the other half.")}
            </p>
            <p className="bx-leading" style={S.bodyText}>{t('story_p2', "El Barranco currently operates only during peak season (6 months) due to the health of its current owners. The infrastructure is complete, the brand is established, the market is ready. A new operator stepping in with full-year ambition faces no capital expenditure barrier — only upside.")}</p>
            <p className="bx-leading" style={{ ...S.bodyText,marginTop: 24 }}>{t('story_p3', "Futaleufú's position as a year-round destination is growing. Winter fly fishing, wellness retreats, and off-season adventure travel represent untapped revenue lines that the existing installation can absorb immediately.")}</p>
            <div className="bx-box" style={{ ...S.upsideBox, marginTop: 48 }}>
              <p style={S.upsideTitle}>{t('brief_upside_titulo', 'The growth path is clear')}</p>
              <p className="bx-leading" style={{ ...S.bodyText,color: C.muted }}>
                {t('brief_upside_texto', 'Extend operations to 8–12 months · Develop winter and wellness programming · Partner with international adventure operators already active in the region · Leverage 25 years of brand equity and an established digital presence.')}
              </p>
            </div>
          </div>
        )}

        {investTab === 'brief' && (
          <>
            <div className="bx-brief" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, marginBottom: 2 }}>
              {[
                { num: c('brief_precio',  'USD 3M'),    label: lang === 'es' ? 'Precio de venta'       : 'Asking price',        note: c('brief_note1', 'UF 68,000 — all assets, inventory, brand & IP included') },
                { num: c('brief_revenue', '$181M'),     label: lang === 'es' ? 'Ingresos peak (CLP)'   : 'Peak revenue (CLP)',  note: c('brief_note2', '2022 — operating only 6 months of the year') },
                { num: c('brief_meses',   '6 → 12'),   label: lang === 'es' ? 'Meses de operación'    : 'Months of operation', note: c('brief_note3', 'Current vs. full-year potential with no additional capex') },
                { num: c('brief_guests',  '1,975'),     label: lang === 'es' ? 'Huéspedes (mejor año)' : 'Guests (best year)',  note: c('brief_note4', '2022 — from a 10-room boutique hotel') },
                { num: c('brief_terreno', '1,100 m²'), label: lang === 'es' ? 'Superficie total'      : 'Total land area',     note: c('brief_note5', '650 m² built · established 2000 · north orientation') },
                { num: '2%',                             label: lang === 'es' ? 'Comisión corredora'   : 'Broker commission',   note: c('brief_note6', 'SDM Capital Real Estate · +56 9 3103 8954') },
              ].map(({ num, label, note }) => (
                <div key={label} className="bx-brief-card" style={S.briefCard}>
                  <div style={S.briefNum}>{num}</div>
                  <div style={S.briefLabel}>{label}</div>
                  <div style={S.briefNote}>{note}</div>
                </div>
              ))}
            </div>
            <div className="bx-box" style={S.upsideBox}>
              <p style={S.upsideTitle}>{t('brief_legal_titulo', 'Legal standing')}</p>
              <p className="bx-leading" style={{ ...S.bodyText,color: C.muted }}>
                {t('brief_legal_texto', 'Property documentation current · Active commercial restaurant license (including spirits) · Hotel operating license · INAPI registered brand · Tax ID Rol 33-006 · Minor areas pending regularization: massage room, sauna, laundry (standard process, no operational impact). Staff of 6–7 available to continue with new ownership.')}
              </p>
            </div>
          </>
        )}
      </section>

      {/* ── PROPERTY DETAILS ── */}
      <section className="bx-section" style={{ ...S.section, background: C.bgMid }}>
        <p style={S.eyebrow}>{t('details_eyebrow', 'Property Details')}</p>
        <h2 style={S.sectionTitle}>{t('details_titulo', 'Technical overview')}</h2>
        <div className="bx-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 56 }}>
          <FichaBlock title={t('details_tab_infra', 'Infrastructure')} rows={[
            [t('ficha_infra_1_key', 'Land area'),           t('ficha_infra_1_val', '1,100 m²')],
            [t('ficha_infra_2_key', 'Built area'),          t('ficha_infra_2_val', '~650 m²')],
            [t('ficha_infra_3_key', 'Year built'),          t('ficha_infra_3_val', '2000')],
            [t('ficha_infra_4_key', 'Orientation'),         t('ficha_infra_4_val', 'North')],
            [t('ficha_infra_5_key', 'Rooms'),               t('ficha_infra_5_val', '10 (24 m² + en-suite each)')],
            [t('ficha_infra_6_key', 'Restaurant capacity'), t('ficha_infra_6_val', '40 guests')],
            [t('ficha_infra_7_key', 'Pool'),                t('ficha_infra_7_val', '5 × 7 m')],
          ]} />
          <FichaBlock title={t('details_tab_equip', 'Equipment Included')} rows={[
            [t('ficha_equip_1_key', 'Kitchen'),      t('ficha_equip_1_val', 'Industrial ovens, range, blast chiller')],
            [t('ficha_equip_2_key', 'Cold storage'), t('ficha_equip_2_val', 'Walk-in fridges & freezers')],
            [t('ficha_equip_3_key', 'Dishwashing'),  t('ficha_equip_3_val', 'Industrial dishwasher + dough mixer')],
            [t('ficha_equip_4_key', 'Laundry'),      t('ficha_equip_4_val', 'Washers, dryer, industrial press')],
            [t('ficha_equip_5_key', 'Energy'),       t('ficha_equip_5_val', 'Pellet boiler + 17kW generator')],
            [t('ficha_equip_6_key', 'Amenities'),    t('ficha_equip_6_val', 'Pool equipment, sauna, massage room')],
            [t('ficha_equip_7_key', 'Furniture'),    t('ficha_equip_7_val', 'All rooms, restaurant, common areas')],
          ]} />
          <FichaBlock title={t('details_tab_legal', 'Legal')} rows={[
            [t('ficha_legal_1_key', 'Title deed'),          t('ficha_legal_1_val', 'Current')],
            [t('ficha_legal_2_key', 'Restaurant license'),  t('ficha_legal_2_val', 'Active (incl. spirits)')],
            [t('ficha_legal_3_key', 'Hotel license'),       t('ficha_legal_3_val', 'Active')],
            [t('ficha_legal_4_key', 'Brand registration'),  t('ficha_legal_4_val', 'INAPI — El Barranco')],
            [t('ficha_legal_5_key', 'Tax ID (Rol)'),        t('ficha_legal_5_val', '33-006')],
            [t('ficha_legal_6_key', 'Address'),             t('ficha_legal_6_val', "B. O'Higgins 172, Futaleufú")],
          ]} />
          <FichaBlock title={t('details_tab_ops', 'Operations')} rows={[
            [t('ficha_ops_1_key', 'Current season'),    t('ficha_ops_1_val', '6 months/year (peak)')],
            [t('ficha_ops_2_key', 'Potential season'),  t('ficha_ops_2_val', '8–12 months/year')],
            [t('ficha_ops_3_key', 'Staff'),             t('ficha_ops_3_val', '6–7 people')],
            [t('ficha_ops_4_key', 'Sale type'),         t('ficha_ops_4_val', 'Turnkey — immediate takeover')],
            [t('ficha_ops_5_key', "Owner's residence"), t('ficha_ops_5_val', 'Separate 2BD/2BA house')],
            [t('ficha_ops_6_key', 'Asking price'),      t('ficha_ops_6_val', 'UF 68,000 (~USD 3,000,000)')],
          ]} />
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section className="bx-section" style={{ padding: '100px 6vw' }}>
        <p style={S.eyebrow}>{t('gallery_eyebrow', 'Gallery')}</p>
        <h2 style={{ ...S.sectionTitle, marginBottom: 48 }}>{t('gallery_titulo', 'The property in images')}</h2>
        <div className="bx-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 200px)', gap: 3 }}>
          <GalleryItem img={c('gallery_1', IMG.exterior)}  col="1 / 3" row="1 / 3" />
          <GalleryItem img={c('gallery_2', IMG.interior1)} col="3"     row="1" />
          <GalleryItem img={c('gallery_3', IMG.interior2)} col="4"     row="1" />
          <GalleryItem img={c('gallery_4', IMG.interior3)} col="3"     row="2" />
          <GalleryItem img={c('gallery_5', IMG.interior4)} col="4"     row="2" />
          <GalleryItem img={c('gallery_6', IMG.view1)}     col="1"     row="3" />
          <GalleryItem img={c('gallery_7', IMG.view2)}     col="2 / 5" row="3" />
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="bx-section bx-contact" style={{ padding: '100px 6vw 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start', borderTop: `1px solid ${C.border}` }}>
        <div>
          <p style={S.eyebrow}>{t('contact_eyebrow', 'Exclusive Listing')}</p>
          <h2 style={{ ...S.sectionTitle, fontSize: 'clamp(32px, 4vw, 54px)' }}>
            {t('contact_titulo', 'Begin your conversation')}
          </h2>
          <div className="bx-price" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 'clamp(40px, 5.5vw, 76px)', color: C.navyLight, lineHeight: 1, margin: '24px 0 8px' }}>
            {c('precio_display', 'USD 3,000,000')}
          </div>
          <p className="text-sdm-xs" style={{ fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.muted, marginBottom: 40 }}>
            {t('precio_sub', 'UF 68,000 · Turnkey · Futaleufú, Chile')}
          </p>
          <p className="bx-leading" style={S.bodyText}>
            {t('contacto_parrafo', 'Boutique hospitality assets with validated operations, a registered brand, and full infrastructure in world-class adventure destinations do not come to market often.')}
          </p>
          <div style={{ marginTop: 40 }}>
            <p className="text-sdm-sm" style={{ fontWeight: 300, color: C.muted, marginBottom: 4 }}>{c('contacto_empresa', 'SDM Capital Real Estate')}</p>
            <p className="text-sdm-lg" style={{ fontWeight: 400, color: C.green }}>{c('contacto_telefono', '+56 9 3103 8954')}</p>
          </div>
        </div>

        <div>
          {formSent ? (
            <div style={{ paddingTop: 40 }}>
              <p className="text-sdm-display-md" style={{ ...S.sectionTitle }}>{lang === 'es' ? 'Gracias.' : 'Thank you.'}</p>
              <p className="bx-leading" style={S.bodyText}>{lang === 'es' ? 'Hemos recibido tu mensaje y nos pondremos en contacto pronto.' : "We've received your message and will be in touch shortly."}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {[
                { label: lang === 'es' ? 'Nombre completo'    : 'Full name',     key: 'name',  type: 'text' },
                { label: lang === 'es' ? 'Correo electrónico' : 'Email address', key: 'email', type: 'email' },
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
                <span style={S.formLabel}>{lang === 'es' ? 'Mensaje' : 'Message'}</span>
                <textarea rows={4} style={S.formTextarea} value={form.message} placeholder={lang === 'es' ? 'Cuéntanos tu interés en esta propiedad...' : 'Tell us about your interest in this property...'} onChange={e => setForm({ ...form, message: e.target.value })} />
              </label>
              <button type="submit" className="bx-btn" style={S.btnPrimary}>{lang === 'es' ? 'Enviar consulta' : 'Send Inquiry'}</button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <span style={S.footerText}>© {new Date().getFullYear()} SDM Capital Real Estate · Hotel El Barranco · Futaleufú, Chile</span>
        <button style={S.backBtn} onClick={() => navigate('/propiedades/hotel-restaurante-futaleufu-futaleufu-10d')}>
          <Icon.ArrowLeft />
          {lang === 'es' ? 'Volver a la propiedad' : 'Back to the property'}
        </button>
      </footer>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityCard({ img, title, sub, Icon: IconComp }: { img: string; title: string; sub: string; Icon: () => JSX.Element }) {
  return (
    <div className="group" style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', cursor: 'default' }}>
      <img loading="lazy" decoding="async" src={img} alt={title} className="transition-transform duration-500 group-hover:scale-[1.06]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s ease' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,11,0.88) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28 }}>
        <div style={{ marginBottom: 10 }}><IconComp /></div>
        <div className="text-sdm-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: C.cream, lineHeight: 1.2 }}>{title}</div>
        <div className="text-sdm-xs" style={{ fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.green, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

function PhotoBlock({ src }: { src: string }) {
  return (
    <div className="group" style={{ overflow: 'hidden', aspectRatio: '16/9' }}>
      <img loading="lazy" decoding="async" src={src} alt="" className="transition-transform duration-500 group-hover:scale-[1.04]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} />
    </div>
  )
}

function GalleryItem({ img, col, row }: { img: string; col: string; row: string }) {
  return (
    <div className="group" style={{ gridColumn: col, gridRow: row, overflow: 'hidden' }}>
      <img loading="lazy" decoding="async" src={img} alt="" className="transition-transform duration-500 group-hover:scale-[1.05]" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} />
    </div>
  )
}

function FichaBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="bx-ficha" style={S.fichaBlock}>
      <div style={S.fichaBlockTitle}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="bx-ficha-row" style={S.fichaRow}>
          <span style={S.fichaKey}>{k}</span>
          <span className="bx-ficha-val" style={S.fichaVal}>{v}</span>
        </div>
      ))}
    </div>
  )
}
