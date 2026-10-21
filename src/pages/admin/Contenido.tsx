// Pestaña "Contenido" del admin — todo el texto del sitio público, guardado en
// `contenido_sitio` como pares clave-valor.
//
// Las claves de `contenido_sitio` NO se renombran. Las del banner promocional
// (`banner_activo`, `banner_titulo`, `banner_subtitulo`, `banner_cta_texto`,
// `banner_cta_url`) además no tienen migración: las crea este panel con el
// primer guardado, y `BannerPromo` las lee vía `useContenido` con los mismos
// valores por defecto.
//
// Extraída de AdminPage.tsx sin cambios de comportamiento: mismos estilos,
// mismas queries. Los emojis pasaron a iconos de lucide-react más tarde. La clave de pestaña sigue siendo 'contenido' — el orden de las
// pestañas se persiste en localStorage y renombrarla borraría esa preferencia.
//
// `CarouselPhotoManager` y `HomeDestacadasSelector` viajan en este archivo
// porque solo los usa este panel. Van a nivel de módulo, nunca anidados dentro
// de Contenido: definirlos adentro los recrea en cada render y React remonta el
// árbol entero (ver SINCRONIA.md).

import { useState, useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BarChart3, Briefcase, Check, GripVertical, Info, Pause, X, Building, Camera, Eye, EyeOff, FileText, FolderTree, HeartHandshake, Home, Image, MapPin, MessageCircle, Smartphone, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePointerSort } from '@/components/admin/useDragSort'
import { avisarError } from '@/lib/errores'
import { subirImagen } from '@/lib/subirImagen'
import { invalidateContenidoCache } from '@/hooks/useContenido'
import { thumbUrl } from '@/lib/imagenes'
import type { Propiedad } from '@/types'
import { Sec, Full } from '@/components/admin/layout'
import { Field, FieldGroup, Inp, Txa, Sel } from '@/components/admin/campos'

// ── Aviso de despliegue ──────────────────────────────────────────────────────
//
// Va junto a los interruptores que OCULTAN algo del sitio público —el banner del
// inicio y la visibilidad de cada servicio—, y solo junto a esos.
//
// El motivo, en corto: esas piezas se pintan desde la semilla que el build deja
// escrita en `index.html`, así que el primer render las decide sin esperar a la
// consulta. Guardar el interruptor cambia la base, pero la semilla que hay
// publicada sigue diciendo lo de antes hasta el siguiente despliegue: quien
// entre en el medio ve la pieza asomar un instante antes de que la consulta la
// retire.
//
// EL TEXTO NO EXPLICA NADA DE ESTO A PROPÓSITO. A quien administra el sitio no
// le sirve entender la semilla; le sirve saber que tiene que pedir un
// despliegue. Se dice qué hacer, no cómo funciona.
// `donde` llega CON su preposición —«del inicio», «de la página de Servicios»—
// y no suelto: con la preposición fija en la plantilla salía «se retira de el
// inicio». El castellano contrae, así que la preposición es parte del dato.
function AvisoDespliegue({ donde }: { donde: string }) {
  return (
    <p className="text-sdm-sm" style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '10px 2px 0', display: 'flex', gap: 8 }}>
      <Info size={15} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }} />
      <span>
        Al ocultarlo se retira {donde}, pero hasta el próximo despliegue seguirá
        asomando un instante a quien entre justo en ese momento. Si necesitas que
        desaparezca del todo, <strong>pide que se despliegue el sitio</strong>.
      </span>
    </p>
  )
}
import { SaveBtn, Guardado } from '@/components/admin/acciones'
import { ImageUploader } from '@/components/admin/ImageUploader'

const HERO_KEYS = ['hero_imagen_url','hero_imagen_url_2','hero_imagen_url_3','hero_imagen_url_4','hero_imagen_url_5'] as const
const HERO_POS_KEYS = ['hero_pos_1','hero_pos_2','hero_pos_3','hero_pos_4','hero_pos_5'] as const

const POSITION_OPTIONS = [
  { value: 'center center', label: 'Centro' },
  { value: 'center top',    label: 'Centro arriba' },
  { value: 'center bottom', label: 'Centro abajo' },
  { value: 'left center',   label: 'Izquierda' },
  { value: 'right center',  label: 'Derecha' },
  { value: '50% 20%',       label: 'Alto (20%)' },
  { value: '50% 30%',       label: 'Alto (30%)' },
  { value: '50% 40%',       label: 'Medio-alto' },
  { value: '50% 60%',       label: 'Medio-bajo' },
  { value: '50% 70%',       label: 'Bajo (70%)' },
  { value: '50% 80%',       label: 'Bajo (80%)' },
]

function CarouselPhotoManager({ d, setD }: { d: Record<string, string>; setD: (fn: (prev: Record<string, string>) => Record<string, string>) => void }) {
  const [uploading, setUploading] = useState<number | null>(null)

  const urls    = HERO_KEYS.map(k => d[k] || '')
  const setUrls = (newUrls: string[]) => {
    const update: Record<string, string> = {}
    HERO_KEYS.forEach((k, i) => { update[k] = newUrls[i] || '' })
    setD(prev => ({ ...prev, ...update }))
  }

  // `urls` no es un useState propio sino una vista de `d`, así que el hook
  // necesita un setter que entienda las dos formas de SetStateAction y las
  // vuelva a escribir sobre las HERO_KEYS.
  const aplicarOrden: Dispatch<SetStateAction<string[]>> = accion =>
    setD(prev => {
      const actuales = HERO_KEYS.map(k => prev[k] || '')
      const next = typeof accion === 'function' ? accion(actuales) : accion
      const update: Record<string, string> = {}
      HERO_KEYS.forEach((k, i) => { update[k] = next[i] || '' })
      return { ...prev, ...update }
    })

  // Sin trabajo al soltar: el reordenamiento en vivo ya dejó el orden escrito
  // en `d`, y a Supabase se sube cuando se guarda el panel.
  const { arrastrando, filaProps, manijaProps } = usePointerSort(urls, aplicarOrden, () => {})

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 1280
        let { width, height } = img
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.75)
      }
      img.src = url
    })

  const upload = async (i: number, file: File) => {
    setUploading(i)
    const r = await subirImagen(file, 'hero')
    if (r) { const next = [...urls]; next[i] = r.url; setUrls(next) }
    setUploading(null)
  }

  const remove = (i: number) => {
    const next = [...urls].filter((_, idx) => idx !== i)
    while (next.length < 5) next.push('')
    setUrls(next)
  }

  const filled = urls.filter(Boolean)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {urls.map((url, i) => (
          <div key={i}>
            {/* Las ranuras vacías no llevan filaProps: ni se arrastran ni son
                destino, igual que antes con `draggable={!!url}`. */}
            <div
              {...(url ? filaProps(i) : {})}
              style={{ opacity: arrastrando === i ? 0.45 : 1, borderRadius: 4, border: url ? '2px solid var(--border)' : '2px dashed var(--border)', background: url ? 'transparent' : 'var(--off)', cursor: url ? 'grab' : 'default', overflow: 'hidden', position: 'relative', aspectRatio: '16/9', minHeight: 80 }}
            >
              {url ? (
                <>
                  <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: d[HERO_POS_KEYS[i]] || 'center center', display: 'block' }} />
                  <div className="text-sdm-xs" style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontWeight: 700, width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div {...manijaProps} style={{ ...manijaProps.style, position: 'absolute', top: 6, right: 28, background: 'rgba(0,0,0,0.5)', borderRadius: 3, padding: '2px 4px' }}>
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="white" opacity="0.8"><circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/><circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/><circle cx="2" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/></svg>
                  </div>
                  <button className="text-sdm-sm" onClick={() => remove(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(226,75,74,0.85)', border: 'none', borderRadius: 3, color: '#fff', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><X aria-hidden="true" size={14} strokeWidth={2} /></button>
                </>
              ) : (
                <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4 }}>
                  {uploading === i
                    ? <span className="text-sdm-xs" style={{ color: 'var(--muted)' }}>Subiendo…</span>
                    : <><span className="text-sdm-xl" style={{ color: 'var(--muted)' }}>+</span><span className="text-sdm-xs tracking-sdm-wide" style={{ color: 'var(--muted)', textTransform: 'uppercase' }}>Foto {i + 1}</span></>
                  }
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading !== null} onChange={e => { const f = e.target.files?.[0]; if (f) upload(i, f) }} />
                </label>
              )}
            </div>
            {url && (
              // aria-label y no rótulo visible: es un control por foto, dentro
              // de una celda de 100px. Un rótulo repetido siete veces sería
              // ruido, y el número de foto da el contexto que hace falta.
              <select className="text-sdm-xs"
                aria-label={`Posición de la foto ${i + 1}`}
                value={d[HERO_POS_KEYS[i]] || 'center center'}
                onChange={e => setD(prev => ({ ...prev, [HERO_POS_KEYS[i]]: e.target.value }))}
                style={{ width: '100%', marginTop: 4, padding: '4px 6px', border: '1px solid var(--border-input)', borderRadius: 3, color: 'var(--navy-dark)', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {POSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
      {filled.length === 0
        ? <p className="text-sdm-sm" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sube al menos una foto para activar el carrusel.</p>
        : <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>{filled.length} foto{filled.length > 1 ? 's' : ''} en el carrusel · Arrastra para reordenar</p>
      }
    </div>
  )
}

function HomeDestacadasSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [allProps, setAllProps] = useState<Propiedad[]>([])
  const [selected, setSelected] = useState<Propiedad[]>([])
  useEffect(() => {
    supabase.from('propiedades').select('id,titulo,imagen_principal,imagenes,precio_uf,a_consultar,activo,tipo,comuna')
      .neq('activo', false).order('created_at', { ascending: false })
      .then(({ data }) => setAllProps((data || []) as Propiedad[]))
  }, [])

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(value || '[]')
      const ordered = ids.map(id => allProps.find(p => p.id === id)).filter(Boolean) as Propiedad[]
      setSelected(ordered)
    } catch { setSelected([]) }
  }, [value, allProps])

  const ids = selected.map(p => p.id)

  const add = (p: Propiedad) => {
    if (selected.length >= 6 || ids.includes(p.id)) return
    const next = [...selected, p]
    setSelected(next)
    onChange(JSON.stringify(next.map(x => x.id)))
  }

  const remove = (id: string) => {
    const next = selected.filter(p => p.id !== id)
    setSelected(next)
    onChange(JSON.stringify(next.map(x => x.id)))
  }

  const { arrastrando, filaProps, manijaProps } = usePointerSort(selected, setSelected,
    next => onChange(JSON.stringify(next.map(x => x.id))))

  const thumb = (p: Propiedad) => thumbUrl(p.imagen_principal || p.imagenes?.[0] || '')
  const precio = (p: Propiedad) => p.a_consultar ? 'A consultar' : p.precio_uf ? `UF ${p.precio_uf.toLocaleString('es-CL')}` : '—'
  const available = allProps.filter(p => !ids.includes(p.id))

  return (
    <div>
      <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginBottom: 16 }}>Elige hasta <strong>6 propiedades</strong> para el Inicio. Arrastra para reordenar.</p>
      <div style={{ marginBottom: 24 }}>
        <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 10 }}>Seleccionadas ({selected.length}/6)</div>
        {selected.length === 0 && <div className="text-sdm-sm bg-[var(--off)]" style={{ padding: '16px', borderRadius: 4, color: 'var(--muted)', textAlign: 'center' }}>Todavía no hay destacadas. Elige hasta 6 propiedades para mostrar en el Inicio.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selected.map((p, i) => (
            <div key={p.id} {...filaProps(i)}
              style={{ opacity: arrastrando === i ? 0.45 : 1, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, cursor: 'grab' }}>
              <span {...manijaProps} className="flex items-center" style={{ ...manijaProps.style, padding: 10, margin: '-10px -4px -10px -10px', flexShrink: 0 }}>
                <GripVertical size={14} strokeWidth={2} style={{ color: 'var(--muted)' }} />
              </span>
              <span className="text-sdm-sm" style={{ fontWeight: 700, color: 'var(--green-dark)', minWidth: 20 }}>{i + 1}</span>
              {thumb(p) && <img src={thumb(p)} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sdm-sm" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</div>
                <div className="text-sdm-xs" style={{ color: 'var(--muted)' }}>{p.comuna} · {precio(p)}</div>
              </div>
              <button className="text-sdm-xl" onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          ))}
        </div>
      </div>
      {selected.length < 6 && (
        <div>
          <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 10 }}>Disponibles — clic para agregar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, maxHeight: 400, overflowY: 'auto', padding: 4 }}>
            {available.map(p => (
              <button type="button" className="bg-[var(--off)] border border-transparent hover:border-[var(--green-dark)] hover:bg-[var(--admin-ok-fondo)]" key={p.id} onClick={() => add(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                {thumb(p) && <img src={thumb(p)} alt="" style={{ width: 40, height: 32, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div className="text-sdm-sm" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</div>
                  <div className="text-sdm-xs" style={{ color: 'var(--muted)' }}>{precio(p)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Contenido() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [pagina, setPagina] = useState<'inicio'|'testimonios'|'quienes'|'servicios'|'asociados'|'blog'|'contacto'>('inicio')
  const scrollPositions = useRef<Record<string, number>>({})

  const handlePaginaChange = (key: typeof pagina) => {
    scrollPositions.current[pagina] = window.scrollY
    setPagina(key)
    setTimeout(() => { window.scrollTo({ top: scrollPositions.current[key] || 0 }) }, 50)
  }

  const [d, setD] = useState({
    hero_imagen_url: '', hero_imagen_url_2: '', hero_imagen_url_3: '', hero_imagen_url_4: '', hero_imagen_url_5: '',
    hero_kicker: 'Inversión inmobiliaria · Chile & Paraguay',
    hero_titulo_1: 'Tu socio', hero_titulo_2: 'en bienes', hero_titulo_3: 'raíces',
    hero_subtitulo: 'Más de 15 años conectando personas con oportunidades inmobiliarias en Chile y Paraguay. Financiamiento sin pagos adelantados.',
    stats_propiedades: '120', stats_anios: '15', stats_paises: '10', stats_clientes: '500',
    banner_activo: 'false',
    banner_kicker: 'Oportunidad comercial',
    banner_imagen: '',
    banner_titulo: 'Oficinas en arriendo en Santiago Centro',
    banner_subtitulo: '42 oficinas disponibles · desde 178 m² · ejes Miraflores, Ahumada y Nueva York',
    banner_cta_texto: 'Ver disponibilidad',
    banner_cta_url: '/propiedades/oficinas-arriendo-santiago-centro',
    dual_credito_label: 'Gestión crediticia',
    dual_credito_titulo: '¿El banco te dijo no?',
    dual_credito_body: 'Hacemos la evaluación hipotecaria y te acompañamos en todo el proceso. Sin pagos adelantados.',
    dual_credito_meta: 'Roberto Urrutia · Director Comercial · +20 años en banca',
    dual_credito_cta: 'Solicita tu preevaluación gratuita',
    dual_rental_label: 'SDM Rental',
    dual_rental_titulo: '¿Necesitas arrendar tu propiedad?',
    dual_rental_body: 'Buscamos al arrendatario, verificamos sus antecedentes y administramos el arriendo mes a mes.',
    dual_rental_meta: 'Comisión 50% de un mes al firmar · Administración 7% mensual',
    dual_rental_cta: 'Quiero arrendar mi propiedad',
    testimonial_1_texto: 'SDM Capital hizo posible el sueño de mi familia de adquirir nuestra primera vivienda en Santiago.',
    testimonial_1_autor: 'María Sánchez · Santiago, Chile', testimonial_1_url: '',
    testimonial_2_texto: 'Como inversionista internacional, SDM Capital simplificó todo el proceso.',
    testimonial_2_autor: 'Carlos González · Miami, Florida, EE. UU.', testimonial_2_url: '',
    testimonial_3_texto: 'Su conocimiento del mercado y atención personalizada hicieron que el proceso fuera completamente libre de estrés.',
    testimonial_3_autor: 'Isabel Ríos · Viña del Mar, Chile', testimonial_3_url: '',
    testimonial_4_texto: '', testimonial_4_autor: '', testimonial_4_url: '',
    testimonial_5_texto: '', testimonial_5_autor: '', testimonial_5_url: '',
    testimonial_6_texto: '', testimonial_6_autor: '', testimonial_6_url: '',
    testimonial_7_texto: '', testimonial_7_autor: '', testimonial_7_url: '',
    testimonial_8_texto: '', testimonial_8_autor: '', testimonial_8_url: '',
    testimonios_titulo: 'Palabras de nuestros clientes',
    testimonios_subtitulo: 'La satisfacción de nuestros clientes es nuestra mejor carta de presentación.',
    props_label: 'Selección editorial', catalogo_orden: 'manual', home_destacadas_ids: '[]',
    props_titulo: 'Oportunidades', props_titulo_em: 'en Chile',
    props_sub: 'Propiedades curadas por nuestro equipo de expertos.',
    props_ver_todas: 'Ver todas las propiedades',
    qs_titulo: 'Tu socio confiable en bienes raíces',
    qs_subtitulo: 'SDM Capital es una empresa chilena especializada en inversión inmobiliaria y gestión de financiamiento, con más de 15 años conectando personas con oportunidades únicas.',
    qs_historia_1: 'SDM Capital nació con una visión clara: democratizar el acceso a inversiones inmobiliarias de calidad para personas y empresas en Chile.',
    qs_historia_2: 'A lo largo de más de 15 años, hemos construido una red de socios y alianzas estratégicas que nos permite ofrecer oportunidades únicas en Chile y Paraguay.',
    qs_historia_3: 'Hoy somos referentes en gestión de financiamiento y asesoría inmobiliaria, con un equipo de expertos comprometidos con los resultados de cada cliente.',
    servicios_intro: 'Soluciones integrales en inversión inmobiliaria y financiamiento, tanto en Chile como en Paraguay.',
    servicio_inv_int_titulo: 'Inversión Internacional', servicio_inv_int_visible: 'true',
    servicio_inv_int_desc: 'Accede a oportunidades inmobiliarias en EE.UU., España, República Dominicana, Uruguay y más.',
    servicio_inv_int_tags: 'Estados Unidos,España,Rep. Dominicana,Uruguay',
    servicio_inv_cl_titulo: 'Inversión en Chile', servicio_inv_cl_visible: 'true',
    servicio_inv_cl_desc: 'Casas, departamentos, oficinas, parcelas y proyectos comerciales en todo Chile.',
    servicio_inv_cl_tags: 'R. Metropolitana,Valparaíso,Coquimbo,Los Lagos',
    servicio_fin_per_titulo: 'Financiamiento Personas', servicio_fin_per_visible: 'true',
    servicio_fin_per_desc: 'Gestión de crédito hipotecario y consumo para personas naturales. Sin pagos adelantados.',
    servicio_fin_per_tags: 'Chile,Internacional',
    servicio_fin_emp_titulo: 'Financiamiento Empresas', servicio_fin_emp_visible: 'true',
    servicio_fin_emp_desc: 'Soluciones de financiamiento corporativo y leasing inmobiliario para empresas de todos los tamaños.',
    servicio_fin_emp_tags: 'Chile,Internacional',
    servicio_banco_titulo: 'Bancarización en el Extranjero', servicio_banco_visible: 'false',
    servicio_banco_desc: 'Te ayudamos a abrir cuentas bancarias y acceder a servicios financieros en el extranjero.',
    servicio_banco_tags: 'EE.UU.,España,Uruguay,Rep. Dominicana',
    quienes_imagen_historia: '',
    servicio_inv_int_imagen: '', servicio_inv_cl_imagen: '',
    servicio_fin_per_imagen: '', servicio_fin_emp_imagen: '', servicio_banco_imagen: '',
    asociados_intro: 'Trabajamos con una red selecta de socios estratégicos que nos permiten ofrecer a nuestros clientes el mejor servicio integral en cada etapa del proceso inmobiliario y financiero.',
    asociados_cta: 'Si tu empresa comparte nuestros valores de excelencia y transparencia, nos encantaría explorar una colaboración estratégica.',
    blog_titulo: 'Blog SDM Capital',
    blog_subtitulo: 'Noticias, análisis y tendencias del mercado inmobiliario en Chile y Paraguay.',
    empresa_nombre: 'SDM Capital', tagline: 'Tu socio confiable en bienes raíces.',
    footer_tagline: 'Tu socio confiable en bienes raíces.',
    direccion: 'Av. Apoquindo 5583, Las Condes, Santiago',
    // Estaban cruzados: telefono_1 traía el número que en la base es
    // telefono_2, y telefono_2 uno que ya no existe. telefono_1 es el de
    // WhatsApp — la clave `whatsapp` normalizada da el mismo número.
    telefono_1: '+56 9 3747 8846', telefono_2: '+56 9 3103 8954',
    email: 'contacto@sdmcapital.cl', horario: 'Lunes a Viernes · 09:00 – 18:00',
    whatsapp: '56937478846',
    facebook: 'https://www.facebook.com/sdmcapitalrestate',
    instagram: 'https://instagram.com/sdmcapital',
    tiktok: 'https://www.tiktok.com/@sdmcapital_realestate',
    linkedin: 'https://www.linkedin.com/company/sdmcapital/',
  })

  const set = (k: string) => (v: string) => setD(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    supabase.from('contenido_sitio').select('clave, valor').then(({ data }) => {
      if (data && data.length > 0) {
        const loaded: Record<string, string> = {}
        data.forEach(({ clave, valor }) => { loaded[clave] = valor })
        setD(prev => ({ ...prev, ...loaded }))
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('contenido_sitio').upsert(
      Object.entries(d).map(([clave, valor]) => ({ clave, valor })),
      { onConflict: 'clave' }
    )
    setSaving(false)
    if (avisarError('No se pudo guardar el contenido del sitio', error)) return
    invalidateContenidoCache()
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const PAGINAS = [
    { key: 'inicio', label: 'Inicio', icon: Home }, { key: 'testimonios', label: 'Testimonios', icon: MessageCircle },
    { key: 'quienes', label: 'Quiénes Somos', icon: Users }, { key: 'servicios', label: 'Servicios', icon: Briefcase },
    { key: 'asociados', label: 'Asociados', icon: HeartHandshake }, { key: 'blog', label: 'Blog', icon: FileText },
    { key: 'contacto', label: 'Contacto y Redes', icon: MapPin },
  ] as const

  return (
    <div>
      <div className="flex flex-col items-start gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <h2 className="font-serif font-light text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>Textos del sitio</h2>
        <div className="flex items-center gap-4">
          <Guardado visible={saved} />
          <SaveBtn onClick={save} loading={saving} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {PAGINAS.map(p => (
          <button className="text-sdm-sm" key={p.key} onClick={() => handlePaginaChange(p.key)}
            style={{ padding: '8px 16px', fontWeight: pagina === p.key ? 600 : 300, borderRadius: 2, border: pagina === p.key ? '2px solid var(--green)' : '1px solid var(--border-input)', background: pagina === p.key ? 'var(--green)' : '#fff', color: pagina === p.key ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            <p.icon size={14} strokeWidth={2} />{p.label}
          </button>
        ))}
      </div>

      {pagina === 'inicio' && <>
        <Sec title={<><Image size={18} strokeWidth={1.75} />Fotos del hero — Carrusel</>}>
          <Full>
            <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.7 }}>Sube hasta 5 fotos. <strong>Arrastra para reordenar.</strong></p>
            <CarouselPhotoManager d={d as unknown as Record<string, string>} setD={setD as unknown as (fn: (prev: Record<string, string>) => Record<string, string>) => void} />
          </Full>
        </Sec>
        <Sec title={<><FileText size={18} strokeWidth={1.75} />Título y subtítulo del hero</>}>
          <Field label="Línea 1"><Inp value={d.hero_titulo_1} onChange={set('hero_titulo_1')} /></Field>
          <Field label="Línea 2"><Inp value={d.hero_titulo_2} onChange={set('hero_titulo_2')} /></Field>
          <Field label="Línea 3 (negrita)"><Inp value={d.hero_titulo_3} onChange={set('hero_titulo_3')} /></Field>
          <Field label="Kicker superior"><Inp value={d.hero_kicker} onChange={set('hero_kicker')} /></Field>
          <Full><Field label="Subtítulo"><Txa value={d.hero_subtitulo} onChange={set('hero_subtitulo')} rows={2} /></Field></Full>
        </Sec>
        <Sec title={<><BarChart3 size={18} strokeWidth={1.75} />Estadísticas animadas</>}>
          <Field label="Propiedades"><Inp type="number" value={d.stats_propiedades} onChange={set('stats_propiedades')} /></Field>
          <Field label="Años de experiencia"><Inp type="number" value={d.stats_anios} onChange={set('stats_anios')} /></Field>
          <Field label="Países"><Inp type="number" value={d.stats_paises} onChange={set('stats_paises')} /></Field>
          <Field label="Clientes satisfechos"><Inp type="number" value={d.stats_clientes} onChange={set('stats_clientes')} /></Field>
        </Sec>
        {(() => {
          const activo = d.banner_activo === 'true'
          return (
            <Sec title={<>{activo ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}Banner promocional</>}>
              <Full>
                <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginBottom: 16, lineHeight: 1.7 }}>
                  Pieza que aparece en el inicio, justo debajo de los dos llamados (crédito y Rental). Se muestra a todos los
                  visitantes mientras esté activa: para retirarla, apaga este switch.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: activo ? 'var(--admin-ok-fondo)' : 'var(--error-fondo)', borderRadius: 4, border: `1px solid ${activo ? 'var(--admin-ok)' : 'var(--error)'}`, marginBottom: 8 }}>
                  {/* `role="switch"` y no `aria-pressed`: es un interruptor de
                      encendido/apagado, no un botón que queda hundido. Sin esto
                      el lector solo decía «botón». */}
                  <button role="switch" aria-checked={activo} aria-label="Mostrar el banner promocional"
                    onClick={() => setD(p => ({ ...p, banner_activo: activo ? 'false' : 'true' }))}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: activo ? 'var(--green)' : '#ccc', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, left: activo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                  </button>
                  {/* `--error` y no `var(--error)`. No era un fallo de contraste —sobre
                      `var(--error-fondo)` daba 4,45 y el token da 5,81— sino de sistema: el
                      proyecto tiene UN rojo de error, elegido midiendo su distancia
                      a `--estado-vendida` bajo daltonismo, y un segundo rojo suelto
                      reabre justo ese problema. El `var(--admin-ok)` de al lado queda
                      pendiente: es el otro verde fuera de la paleta. */}
                  <span className="text-sdm-sm" style={{ fontWeight: 500, color: activo ? 'var(--admin-ok)' : 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{activo ? <><Check size={14} strokeWidth={2} />Visible en el inicio</> : <><Pause size={14} strokeWidth={2} />Oculto</>}</span>
                </div>
                <AvisoDespliegue donde="del inicio" />
              </Full>
              <Full><Field label="Kicker (etiqueta superior)"><Inp value={d.banner_kicker} onChange={set('banner_kicker')} /></Field></Full>
              <Full><Field label="Título"><Inp value={d.banner_titulo} onChange={set('banner_titulo')} /></Field></Full>
              <Full><Field label="Subtítulo"><Txa value={d.banner_subtitulo} onChange={set('banner_subtitulo')} rows={2} /></Field></Full>
              <Field label="Texto del botón"><Inp value={d.banner_cta_texto} onChange={set('banner_cta_texto')} /></Field>
              <Field label="Enlace del botón"><Inp value={d.banner_cta_url} onChange={set('banner_cta_url')} /></Field>
              <Full>
                <FieldGroup label="Imagen (columna derecha)">
                  <ImageUploader currentUrl={d.banner_imagen} folder="banner" onUploaded={url => setD(p => ({ ...p, banner_imagen: url }))} />
                </FieldGroup>
              </Full>
            </Sec>
          )
        })()}
        <Sec title={<><FolderTree size={18} strokeWidth={1.75} />Orden del catálogo</>}>
          <Full>
            <Field label="¿Cómo se ordenan las propiedades?">
              <Sel value={d.catalogo_orden || 'manual'} onChange={set('catalogo_orden')}
                options={[
                  { value: 'manual',      label: 'Manual — según el orden que elijo (arrastrando filas)' },
                  { value: 'precio_alto', label: 'Precio: más alto primero' },
                  { value: 'precio_bajo', label: 'Precio: más bajo primero' },
                  { value: 'aleatorio',   label: 'Aleatorio — cambia en cada visita' },
                ]} />
            </Field>
          </Full>
        </Sec>
        <Sec title={<><Home size={18} strokeWidth={1.75} />Propiedades destacadas en el Inicio</>}>
          <Full><HomeDestacadasSelector value={d.home_destacadas_ids || '[]'} onChange={v => setD(p => ({ ...p, home_destacadas_ids: v }))} /></Full>
        </Sec>
        {/* «Sección Financiamiento» se retiró entera: el bloque suelto del
            Inicio pasó a ser la tarjeta izquierda de los dos llamados de abajo,
            con claves propias (`dual_credito_*`). Misma regla que
            `hero_location`: un editor que modifica algo que ya no se dibuja es
            una trampa. Las filas `financiamiento_*` siguen en la base sin que
            nadie las lea.
            Los destinos de los botones no son editables: el izquierdo abre el
            formulario de solicitud y el derecho lleva a /rental. */}
        <Sec title={<><Wallet size={18} strokeWidth={1.75} />Llamado izquierdo — Gestión crediticia</>}>
          <Full>
            <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginBottom: 4, lineHeight: 1.7 }}>
              Las dos tarjetas que aparecen en el inicio justo debajo del buscador.
              El rótulo se muestra siempre en mayúsculas: escríbelo normal.
            </p>
          </Full>
          <Field label="Rótulo"><Inp value={d.dual_credito_label} onChange={set('dual_credito_label')} /></Field>
          <Full><Field label="Título"><Inp value={d.dual_credito_titulo} onChange={set('dual_credito_titulo')} /></Field></Full>
          <Full><Field label="Descripción"><Txa value={d.dual_credito_body} onChange={set('dual_credito_body')} rows={3} /></Field></Full>
          <Full><Field label="Línea de respaldo"><Inp value={d.dual_credito_meta} onChange={set('dual_credito_meta')} /></Field></Full>
          <Field label="Texto del botón"><Inp value={d.dual_credito_cta} onChange={set('dual_credito_cta')} /></Field>
        </Sec>
        <Sec title={<><Building size={18} strokeWidth={1.75} />Llamado derecho — SDM Rental</>}>
          <Field label="Rótulo"><Inp value={d.dual_rental_label} onChange={set('dual_rental_label')} /></Field>
          <Full><Field label="Título"><Inp value={d.dual_rental_titulo} onChange={set('dual_rental_titulo')} /></Field></Full>
          <Full><Field label="Descripción"><Txa value={d.dual_rental_body} onChange={set('dual_rental_body')} rows={3} /></Field></Full>
          <Full><Field label="Cobros"><Inp value={d.dual_rental_meta} onChange={set('dual_rental_meta')} /></Field></Full>
          <Field label="Texto del botón"><Inp value={d.dual_rental_cta} onChange={set('dual_rental_cta')} /></Field>
        </Sec>
      </>}

      {pagina === 'testimonios' && <>
        <Sec title={<><MessageCircle size={18} strokeWidth={1.75} />Testimonios</>}>
          <Full><Field label="Título"><Inp value={d.testimonios_titulo} onChange={set('testimonios_titulo')} /></Field></Full>
          <Full><Field label="Subtítulo"><Inp value={d.testimonios_subtitulo} onChange={set('testimonios_subtitulo')} /></Field></Full>
          {[1,2,3,4,5,6,7,8].map(n => (
            <Full key={n}>
              <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 4 }}>
                <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 12 }}>Testimonio {n}</div>
                <Field label="Texto"><Txa value={(d as Record<string,string>)[`testimonial_${n}_texto`] || ''} onChange={set(`testimonial_${n}_texto`)} rows={3} /></Field>
                <Field label="Autor"><Inp value={(d as Record<string,string>)[`testimonial_${n}_autor`] || ''} onChange={set(`testimonial_${n}_autor`)} /></Field>
                <Field label='URL historia'><Inp value={(d as Record<string,string>)[`testimonial_${n}_url`] || ''} onChange={set(`testimonial_${n}_url`)} placeholder="https://..." /></Field>
              </div>
            </Full>
          ))}
        </Sec>
      </>}

      {pagina === 'quienes' && <>
        <Sec title={<><Users size={18} strokeWidth={1.75} />Quiénes Somos</>}>
          <Field label="Título principal"><Inp value={d.qs_titulo} onChange={set('qs_titulo')} /></Field>
          <Full><Field label="Subtítulo"><Txa value={d.qs_subtitulo} onChange={set('qs_subtitulo')} rows={3} /></Field></Full>
          <Full><Field label="Párrafo 1"><Txa value={d.qs_historia_1} onChange={set('qs_historia_1')} rows={3} /></Field></Full>
          <Full><Field label="Párrafo 2"><Txa value={d.qs_historia_2} onChange={set('qs_historia_2')} rows={3} /></Field></Full>
          <Full><Field label="Párrafo 3"><Txa value={d.qs_historia_3} onChange={set('qs_historia_3')} rows={3} /></Field></Full>
          <Full><FieldGroup label={<><Camera size={14} strokeWidth={2} />Foto oficina / equipo</>}><ImageUploader currentUrl={d.quienes_imagen_historia} folder="paginas" onUploaded={url => setD(p => ({ ...p, quienes_imagen_historia: url }))} /></FieldGroup></Full>
        </Sec>
      </>}

      {pagina === 'servicios' && <>
        <Sec title={<><Briefcase size={18} strokeWidth={1.75} />Servicios — Introducción</>}>
          <Full><Field label="Texto introductorio"><Txa value={d.servicios_intro} onChange={set('servicios_intro')} rows={2} /></Field></Full>
        </Sec>
        {[
          { key: 'inv_int', label: 'Inversión Internacional',        imgKey: 'servicio_inv_int_imagen' },
          { key: 'inv_cl',  label: 'Inversión en Chile',             imgKey: 'servicio_inv_cl_imagen'  },
          { key: 'fin_per', label: 'Financiamiento Personas',        imgKey: 'servicio_fin_per_imagen' },
          { key: 'fin_emp', label: 'Financiamiento Empresas',        imgKey: 'servicio_fin_emp_imagen' },
          { key: 'banco',   label: 'Bancarización en el Extranjero', imgKey: 'servicio_banco_imagen'   },
        ].map(({ key, label, imgKey }) => {
          const isVisible = (d as Record<string,string>)[`servicio_${key}_visible`] !== 'false'
          return (
            <Sec key={key} title={<>{isVisible ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}{label}</>}>
              <Full>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: isVisible ? 'var(--admin-ok-fondo)' : 'var(--error-fondo)', borderRadius: 4, border: `1px solid ${isVisible ? 'var(--admin-ok)' : 'var(--error)'}`, marginBottom: 8 }}>
                  <button role="switch" aria-checked={isVisible} aria-label={`Mostrar ${label} en el sitio`}
                    onClick={() => setD(p => ({ ...p, [`servicio_${key}_visible`]: isVisible ? 'false' : 'true' }))}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isVisible ? 'var(--green)' : '#ccc', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, left: isVisible ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                  </button>
                  {/* `--error`, mismo criterio que el bloque del banner. */}
                  <span className="text-sdm-sm" style={{ fontWeight: 500, color: isVisible ? 'var(--admin-ok)' : 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{isVisible ? <><Check size={14} strokeWidth={2} />Visible</> : <><Pause size={14} strokeWidth={2} />Oculto</>}</span>
                </div>
                {/* Mismo aviso que el banner, y acá hacía MÁS falta: `ServiciosPage`
                    filtra por `servicio_*_visible` leyendo la semilla y sin ningún
                    gate, así que este desfase ya existía antes de tocar el banner —
                    solo que nadie lo había escrito. Y ahí la tarjeta que asoma está
                    sobre el pliegue. */}
                <AvisoDespliegue donde="de la página de Servicios" />
              </Full>
              <Field label="Título"><Inp value={(d as Record<string,string>)[`servicio_${key}_titulo`] || ''} onChange={set(`servicio_${key}_titulo`)} /></Field>
              <Full><Field label="Descripción"><Txa value={(d as Record<string,string>)[`servicio_${key}_desc`] || ''} onChange={set(`servicio_${key}_desc`)} rows={3} /></Field></Full>
              <Full><Field label='Tags (separados por coma)'><Txa value={(d as Record<string,string>)[`servicio_${key}_tags`] || ''} onChange={set(`servicio_${key}_tags`)} rows={2} /></Field></Full>
              <Full><FieldGroup label="Foto"><ImageUploader currentUrl={(d as Record<string,string>)[imgKey] || ''} folder="servicios" onUploaded={url => setD(p => ({ ...p, [imgKey]: url }))} /></FieldGroup></Full>
            </Sec>
          )
        })}
      </>}

      {pagina === 'asociados' && <>
        <Sec title={<><HeartHandshake size={18} strokeWidth={1.75} />Asociados</>}>
          <Full><Field label="Párrafo introductorio"><Txa value={d.asociados_intro} onChange={set('asociados_intro')} rows={3} /></Field></Full>
          <Full><Field label="CTA para nuevos socios"><Txa value={d.asociados_cta} onChange={set('asociados_cta')} rows={2} /></Field></Full>
        </Sec>
      </>}

      {pagina === 'blog' && <>
        <Sec title={<><FileText size={18} strokeWidth={1.75} />Blog — Encabezado</>}>
          <Field label="Título"><Inp value={d.blog_titulo} onChange={set('blog_titulo')} /></Field>
          <Field label="Subtítulo"><Inp value={d.blog_subtitulo} onChange={set('blog_subtitulo')} /></Field>
        </Sec>
      </>}

      {pagina === 'contacto' && <>
        <Sec title={<><Building size={18} strokeWidth={1.75} />Datos de la empresa</>}>
          <Field label="Nombre empresa"><Inp value={d.empresa_nombre} onChange={set('empresa_nombre')} /></Field>
          <Full><Field label="Texto del footer"><Txa value={d.footer_tagline} onChange={set('footer_tagline')} rows={2} /></Field></Full>
          <Field label="Dirección"><Inp value={d.direccion} onChange={set('direccion')} /></Field>
          <Field label="Horario"><Inp value={d.horario} onChange={set('horario')} /></Field>
          <Field label="Teléfono 1 · WhatsApp"><Inp value={d.telefono_1} onChange={set('telefono_1')} /></Field>
          <Field label="Teléfono 2 · fijo"><Inp value={d.telefono_2} onChange={set('telefono_2')} /></Field>
          <Field label="Email"><Inp type="email" value={d.email} onChange={set('email')} /></Field>
          <Field label="WhatsApp (solo números)"><Inp value={d.whatsapp} onChange={set('whatsapp')} placeholder="56931038954" /></Field>
        </Sec>
        <Sec title={<><Smartphone size={18} strokeWidth={1.75} />Redes sociales</>}>
          <Field label="Facebook"><Inp value={d.facebook} onChange={set('facebook')} /></Field>
          <Field label="Instagram"><Inp value={d.instagram} onChange={set('instagram')} /></Field>
          <Field label="TikTok"><Inp value={d.tiktok} onChange={set('tiktok')} /></Field>
          <Field label="LinkedIn"><Inp value={d.linkedin} onChange={set('linkedin')} /></Field>
        </Sec>
      </>}

      <div className="flex justify-end mt-4">
        <SaveBtn onClick={save} loading={saving} />
      </div>
    </div>
  )
}
