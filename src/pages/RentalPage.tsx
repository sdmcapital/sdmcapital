import { useEffect, useState } from 'react'
import SEO from '@/components/SEO'
import { Link } from 'react-router-dom'
import { useLang } from '@/hooks/useLang'
import ContactSection from '@/components/sections/ContactSection'
import { useContenido } from '@/hooks/useContenido'

const sp = { paddingLeft: 'clamp(16px, 5vw, 48px)', paddingRight: 'clamp(16px, 5vw, 48px)' }

/* El visto de «Arrienda sin complicaciones», sacado a componente para que el
   comparativo use el mismo. `--green-dark` y no `--green`: el visto es BLANCO
   encima, y ese par da 2,93:1 — la cara «fondo verde con blanco encima» de la
   regla 4.2, que es la que ya se había escapado una vez. Con `--green-dark` son
   4,85:1. Lo encontró el barrido POR FORMA; los anteriores buscaban `color:` y
   esto es `background:`. */
function Visto() {
  return (
    <div aria-hidden="true" style={{ width: 24, height: 24, minWidth: 24, background: 'var(--green-dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  )
}

export default function RentalPage() {
  const { lang } = useLang()
  const { get } = useContenido()

  const heroTitulo = get('rental_hero_titulo', 'Tu propiedad, sin preocupaciones')
  const heroSubtitulo = get('rental_hero_subtitulo', 'SDM Rental se encarga de todo: buscamos arrendatarios, cobramos las rentas y administramos tu propiedad mes a mes. Tú solo recibes los resultados.')
  const heroImg = get('rental_hero_img', '')

  const propTitulo = get('rental_prop_titulo', 'Arrienda sin complicaciones')
  const propSubtitulo = get('rental_prop_subtitulo', 'Nos encargamos de cada etapa del proceso de arriendo para que tú no tengas que preocuparte de nada.')
  const checklist = [
    get('rental_check_1', 'Buscamos y seleccionamos arrendatarios con evaluación completa.'),
    get('rental_check_2', 'Redactamos y formalizamos el contrato de arriendo.'),
    get('rental_check_3', 'Cobramos las rentas y te transferimos mensualmente.'),
    get('rental_check_4', 'Gestionamos mantenciones e incidencias por ti.'),
    get('rental_check_5', 'Informes mensuales de tu propiedad.'),
  ]
  const comisionStdPct = get('rental_comision_std_pct', '50% + 7%')
  const comisionStdDesc = get('rental_comision_std_desc', 'pago único + 7% mensual sobre el arriendo')
  const comisionPlusPct = get('rental_comision_plus_pct', '50% + 10%')
  const comisionPlusDesc = get('rental_comision_plus_desc', 'pago único + 10% mensual sobre el arriendo')

  const arrTitulo = get('rental_arr_titulo', 'Encuentra tu próximo hogar')
  const arrSubtitulo = get('rental_arr_subtitulo', 'Tenemos propiedades disponibles en arriendo en Santiago y sus alrededores. Proceso simple, transparente y sin costos ocultos.')

  const compTitulo = get('rental_comp_titulo', 'Compara tus opciones')
  // Claves `rental_std_*` y `rental_plus_*`, nuevas a propósito: las
  // `rental_comp1_*` y `rental_comp2_*` siguen en `contenido_sitio` con el texto
  // de «Arriendo Tradicional» y «Administración de Arriendo», y reusarlas haría
  // que la base pisara estos defaults hasta que alguien las reescribiera.
  // Los cinco ítems comunes viven en `rental_std_item_*`: el Plus los hereda, así
  // que «todo lo del Standard» no se puede desincronizar editando uno solo.
  const WA_STD = 'https://wa.me/56931038954?text=Hola%20Roberto%2C%20quiero%20arrendar%20mi%20propiedad%20con%20el%20Plan%20Standard%20de%20SDM%20Rental.'
  const WA_PLUS = 'https://wa.me/56931038954?text=Hola%20Roberto%2C%20quiero%20arrendar%20mi%20propiedad%20con%20el%20Plan%20Plus%20de%20SDM%20Rental%2C%20con%20seguro%20incluido.'
  const waSeguro = (url: string, porDefecto: string) => (url.startsWith('https://wa.me/') ? url : porDefecto)

  const itemsComunes = [
    get('rental_std_item_1', 'Buscamos y seleccionamos al arrendatario'),
    get('rental_std_item_2', 'Verificamos antecedentes y acreditamos renta'),
    get('rental_std_item_3', 'Redactamos y formalizamos el contrato'),
    get('rental_std_item_4', 'Cobramos las rentas y te transferimos'),
    get('rental_std_item_5', 'Gestionamos mantenciones e incidencias'),
  ].filter(Boolean)
  const planes = [
    {
      tipo: get('rental_std_tipo', 'Plan Standard'),
      precio: get('rental_std_precio', '50% + 7%'),
      precioDesc: get('rental_std_precio_desc', 'pago único al firmar + 7% mensual sobre el arriendo'),
      frase: get('rental_std_frase', 'Nos encargamos del arriendo completo, mes a mes.'),
      items: itemsComunes,
      destacadoItem: '',
      nota: '',
      cta: get('rental_std_cta', 'Quiero el Plan Standard'),
      wa: waSeguro(get('rental_std_wa', WA_STD), WA_STD),
      rotulo: '',
    },
    {
      tipo: get('rental_plus_tipo', 'Plan Plus'),
      precio: get('rental_plus_precio', '50% + 10%'),
      precioDesc: get('rental_plus_precio_desc', 'pago único al firmar + 10% mensual sobre el arriendo'),
      frase: get('rental_plus_frase', 'Todo lo del Plan Standard, con un seguro que respalda tus rentas.'),
      items: itemsComunes,
      destacadoItem: get('rental_plus_item_6', 'Seguro de rentas impagas y restitución'),
      nota: get('rental_plus_nota', 'Cubre hasta 6 meses de arriendo, más gastos comunes, servicios básicos y honorarios legales. La aprobación del siniestro la resuelve la aseguradora.'),
      cta: get('rental_plus_cta', 'Quiero el Plan Plus'),
      wa: waSeguro(get('rental_plus_wa', WA_PLUS), WA_PLUS),
      rotulo: get('rental_plus_rotulo', 'Recomendado'),
    },
  ]

  const quienesTitulo = get('rental_quienes_titulo', '20 años de experiencia a tu servicio')
  const quienesTexto = get('rental_quienes_somos', 'Contamos con más de 20 años de experiencia en el sector comercial bancario e inmobiliario. Somos especialistas en soluciones adaptadas a cada cliente, con respaldo legal en todas nuestras operaciones y una red de marketing digital que posiciona tu propiedad donde los arrendatarios te buscan.')

  return (
    <div className="min-h-screen">
      <SEO title="SDM Rental — Administración y Arriendo de Propiedades" description="Administra tu propiedad con SDM Rental. Plan Standard (50% + 7% mensual) o Plan Plus con seguro de rentas impagas (50% + 10% mensual)." url="/rental" />

      {/* Hero */}
      <div style={{ ...sp, paddingTop: 100, paddingBottom: 80, background: 'var(--navy-dark)', position: 'relative', overflow: 'hidden' }}>
        {heroImg && <img src={heroImg} alt="Hero SDM Rental" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src="/LOGO-SDM-RENTAL.png" alt="SDM Rental" style={{ height: 72, objectFit: 'contain', marginBottom: 32 }} />
          <h1 className="font-serif font-light tracking-sdm-tight" style={{ fontSize: 'clamp(32px,5vw,68px)', color: '#fff', lineHeight: 1.07, maxWidth: 700 }}>
            {heroTitulo.split(',').map((part, i, arr) => i === arr.length - 1 ? <><br /><em key={i}>{part.trim()}</em></> : part + ',')}
          </h1>
          <p className="font-light mt-6 border-l-2 pl-4 text-sdm-lg" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, borderColor: 'var(--green)', maxWidth: 520 }}>{heroSubtitulo}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap' }}>
            <a className="text-sdm-xs tracking-sdm-wide" href="#propietarios" style={{ padding: '13px 28px', background: 'var(--green-dark)', color: '#fff', textDecoration: 'none', fontWeight: 500, textTransform: 'uppercase', borderRadius: 2 }}>Soy propietario</a>
            <a className="text-sdm-xs tracking-sdm-wide" href="#arrendatarios" style={{ padding: '13px 28px', border: '1px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 500, textTransform: 'uppercase', borderRadius: 2 }}>Busco arriendo</a>
            {/* 0.55 y no 0.30 en el borde: este <a> no tiene relleno propio, así
                que el borde es lo ÚNICO que lo identifica como control —1.4.11,
                3:1—. El fondo es `--navy-dark` con la foto del hero al 18 %
                encima, y contra ese compuesto daba 2,25–2,67 según la foto.
                Con 0.55 va de 3,97 a 5,68. Es la misma opacidad que ya quedó en
                los rótulos de la tarjeta destacada. */}
          </div>
        </div>
      </div>

      {/* Quiénes Somos Rental */}
      <section style={{ ...sp, paddingTop: 72, paddingBottom: 72, background: 'var(--off)', borderBottom: '1px solid var(--border)' }}>
        <div className="section-label" style={{ marginBottom: 20 }}>Quiénes Somos</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <h2 className="font-serif font-light tracking-sdm-tight" style={{ fontSize: 'clamp(26px,4vw,42px)', color: 'var(--navy-dark)', lineHeight: 1.1 }}>{quienesTitulo}</h2>
          <p className="text-sdm-lg" style={{ fontWeight: 300, color: 'var(--muted)', lineHeight: 1.9 }}>{quienesTexto}</p>
        </div>
      </section>

      {/* Para Propietarios */}
      <section id="propietarios" style={{ ...sp, paddingTop: 80, paddingBottom: 80, borderBottom: '1px solid var(--border)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="section-label" style={{ marginBottom: 20 }}>Para Propietarios</div>
            <h2 className="font-serif font-light mb-4 tracking-sdm-tight" style={{ fontSize: 'clamp(28px,5vw,44px)', color: 'var(--navy-dark)', lineHeight: 1.1 }}>{propTitulo}</h2>
            <p className="text-sdm-lg" style={{ fontWeight: 300, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28 }}>{propSubtitulo}</p>
            {checklist.filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
                <Visto />
                <p className="text-sdm-lg" style={{ fontWeight: 300, color: 'var(--muted)', lineHeight: 1.7 }}>{item}</p>
              </div>
            ))}
            <a className="text-sdm-xs tracking-sdm-wide border border-[var(--navy-dark)] text-[var(--navy-dark)] bg-transparent hover:bg-[var(--navy-dark)] hover:text-white" href="#contacto" style={{ display: 'inline-block', marginTop: 24, padding: '13px 28px', textDecoration: 'none', fontWeight: 400, textTransform: 'uppercase', borderRadius: 2 }}
            >Quiero arrendar mi propiedad</a>
          </div>
          <div style={{ background: 'linear-gradient(160deg,var(--navy),var(--navy-dark))', borderRadius: 2, padding: '48px 40px' }}>
            {/* El eyebrow va sobre el degradado `--navy` → `--navy-dark`, no sobre
                blanco: el comentario que había aquí decía lo contrario y dejó
                `--green-dark` con 2,40:1 medido. `--green` sobre el extremo claro
                del degradado da 3,96:1, tampoco llega; este #5AB784 es `--green`
                con 15 % de blanco y da 4,70:1 en el peor punto. Literal y no token
                a propósito: es el único uso. Si aparece un segundo, se nombra. */}
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 500, textTransform: 'uppercase', color: '#5AB784', marginBottom: 24 }}>Nuestras comisiones</div>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, marginBottom: 24 }}>
              <div className="text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 400, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Plan Standard</div>
              <div className="font-serif text-sdm-display-md" style={{ color: '#fff', fontWeight: 300 }}>{comisionStdPct}</div>
              <div className="text-sdm-base" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{comisionStdDesc}</div>
            </div>
            <div>
              <div className="text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 400, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Plan Plus</div>
              <div className="font-serif text-sdm-display-md" style={{ color: '#fff', fontWeight: 300 }}>{comisionPlusPct}</div>
              <div className="text-sdm-base" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{comisionPlusDesc}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Para Arrendatarios */}
      <section id="arrendatarios" style={{ ...sp, paddingTop: 80, paddingBottom: 80, background: 'var(--off)', borderBottom: '1px solid var(--border)' }}>
        <div className="section-label" style={{ marginBottom: 20 }}>Para Arrendatarios</div>
        <h2 className="font-serif font-light mb-6 tracking-sdm-tight" style={{ fontSize: 'clamp(28px,5vw,48px)', color: 'var(--navy-dark)', lineHeight: 1.08 }}>{arrTitulo}</h2>
        <p className="text-sdm-lg" style={{ fontWeight: 300, color: 'var(--muted)', lineHeight: 1.9, maxWidth: 560, marginBottom: 40 }}>{arrSubtitulo}</p>
        <Link className="text-sdm-xs tracking-sdm-wide bg-[var(--navy-dark)] hover:bg-[var(--green-dark)]" to="/propiedades?estado=en_arriendo"
          style={{ display: 'inline-block', padding: '13px 28px', color: '#fff', textDecoration: 'none', fontWeight: 400, textTransform: 'uppercase', borderRadius: 2 }}
        >Ver propiedades en arriendo</Link>
      </section>

      {/* Comparativo */}
      <section style={{ ...sp, paddingTop: 80, paddingBottom: 80, borderBottom: '1px solid var(--border)' }}>
        <div className="section-label" style={{ marginBottom: 20 }}>¿Cuál elegir?</div>
        <h2 className="font-serif font-light mb-16 tracking-sdm-tight" style={{ fontSize: 'clamp(28px,5vw,48px)', color: 'var(--navy-dark)', lineHeight: 1.08 }}>{compTitulo}</h2>
        {/* `gap-6` real y no el truco del `gap-px` sobre fondo: ahora son dos
            tarjetas, y el rótulo RECOMENDADO cabalga el borde superior del Plus,
            así que en móvil necesita aire entre las dos para no pisar la
            Standard. `items-stretch` (el default) da la misma altura en escritorio. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {planes.map((c, i) => {
            const oscuro = i === 1
            return (
              <article
                key={c.tipo}
                className="relative flex flex-col rounded-sdm-contenedor p-8 md:p-10"
                style={{ background: oscuro ? 'var(--navy-dark)' : '#fff', border: `1px solid ${oscuro ? 'var(--navy-dark)' : 'var(--border)'}` }}
              >
                {c.rotulo && (
                  /* `--navy-dark` sobre `--green`: 5,37:1. Es el par inverso al de
                     `--green` sobre navy, y no lleva blanco encima (4.2). */
                  <div className="absolute left-8 md:left-10 top-0 -translate-y-1/2 rounded-sdm-control px-3 py-1 text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 500, textTransform: 'uppercase', background: 'var(--green)', color: 'var(--navy-dark)' }}>{c.rotulo}</div>
                )}
                <h3 className="font-serif font-light text-sdm-2xl" style={{ color: oscuro ? '#fff' : 'var(--navy-dark)' }}>{c.tipo}</h3>
                {/* Misma familia y misma escala que el precio de «Nuestras comisiones». */}
                <div className="font-serif text-sdm-display-md" style={{ color: oscuro ? '#fff' : 'var(--navy-dark)', fontWeight: 300, marginTop: 20 }}>{c.precio}</div>
                <div className="text-sdm-base" style={{ fontWeight: 300, color: oscuro ? 'rgba(255,255,255,0.55)' : 'var(--muted)', marginTop: 4 }}>{c.precioDesc}</div>
                <p className="text-sdm-base" style={{ fontWeight: 300, color: oscuro ? '#fff' : 'var(--muted)', lineHeight: 1.7, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${oscuro ? 'rgba(255,255,255,0.1)' : 'var(--border)'}` }}>{c.frase}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0' }}>
                  {c.items.map(item => (
                    <li key={item} style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Visto />
                      <span className="text-sdm-base" style={{ fontWeight: 300, color: oscuro ? '#fff' : 'var(--muted)', lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                  {c.destacadoItem && (
                    <li style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'flex-start' }}>
                      <Visto />
                      <span className="text-sdm-base" style={{ fontWeight: 500, color: 'var(--green)', lineHeight: 1.6 }}>{c.destacadoItem}</span>
                    </li>
                  )}
                </ul>
                {c.nota && <p className="text-sdm-sm" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 4 }}>{c.nota}</p>}
                <div className="mt-auto pt-8">
                  <a
                    href={c.wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${oscuro ? 'btn-inverse' : 'btn-primary'} w-full justify-center whitespace-nowrap md:px-4 lg:w-auto lg:px-6 min-h-[44px]`}
                    style={{ textDecoration: 'none' }}
                  >{c.cta}</a>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <ContactSection />
    </div>
  )
}
