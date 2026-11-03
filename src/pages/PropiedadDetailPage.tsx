import { useEffect, useRef, useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Bath, ChevronLeft, ChevronRight, FileText, Hammer, Home, Landmark, Link2, MapPin, Maximize2, Package, ParkingSquare, Share2, X } from 'lucide-react'
import { sanitizarContenido } from '@/lib/contenidoRico'
import { useLang } from '@/hooks/useLang'
import { supabase } from '@/lib/supabase'
import { useDialogoModal } from '@/hooks/useDialogoModal'
import { useBloquearScroll } from '@/hooks/useBloquearScroll'
import { useCerrarConEscape } from '@/hooks/useCerrarConEscape'
import { useContenido } from '@/hooks/useContenido'
import ContactSection from '@/components/sections/ContactSection'
import ShowcaseBanner from '@/components/showcase/ShowcaseBanner'
import ReservaModal from '@/components/reserva/ReservaModal'
import SEO from '@/components/SEO'
import PropertyMap from '@/components/ui/PropertyMap'
import PropertyCard from '@/components/ui/PropertyCard'
import { normalizeDossiers, dossierTitle } from '@/lib/dossiers'
import { thumbUrl } from '@/lib/imagenes'
import { formatSuperficie, formatM2, formatUbicacion } from '@/lib/formato'
import { obtenerIndicadores } from '@/lib/indicadores'
import type { Propiedad } from '@/types'

// ── ShareButtons ──────────────────────────────────────────────────────────────

const SHARE_NETWORKS = [
  { key: 'whatsapp', label: 'WhatsApp',    color: '#25D366', symbol: 'WA', getHref: (url: string, text: string) => `https://wa.me/?text=${text}%20${url}` },
  { key: 'facebook', label: 'Facebook',    color: '#1877F2', symbol: 'f',  getHref: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${url}` },
  { key: 'twitter',  label: 'X / Twitter', color: '#000000', symbol: '𝕏', getHref: (url: string, text: string) => `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
  { key: 'linkedin', label: 'LinkedIn',    color: '#0A66C2', symbol: 'in', getHref: (url: string, text: string) => `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${text}` },
  { key: 'email',    label: 'Email',       color: '#4B5563', symbol: '✉',  getHref: (url: string, text: string) => `mailto:?subject=${text}&body=${url}` },
]

function ShareButtons({ titulo }: { titulo: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // MISMO PATRÓN QUE LOS DESPLEGABLES DEL BUSCADOR, y con los mismos dos huecos:
  // sólo cerraba con `mousedown` fuera —sin salida por teclado— y al elegir una
  // red el panel se desmontaba con el foco dentro, que caía al <body>.
  // Se cierra con Escape y devuelve el foco a «Compartir» en los dos caminos.
  const disparador = useRef<HTMLButtonElement>(null)
  const cerrarYEnfocar = useCallback(() => {
    setOpen(false)
    disparador.current?.focus()
  }, [])
  useCerrarConEscape(open, useCallback(() => setOpen(false), []), disparador)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const pageUrl = encodeURIComponent(window.location.href)
  const pageText = encodeURIComponent(titulo)

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    cerrarYEnfocar()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
      {/* Trigger */}
      <button ref={disparador} className={`text-sdm-sm tracking-sdm-normal border ${copied ? 'border-[#3DAA6E] text-[#3DAA6E]' : 'border-[var(--border)] text-[#0F2535] hover:border-[#3DAA6E] hover:text-[#3DAA6E]'}`}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 16px',
          background: '#fff',
          borderRadius: 2,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s' }}
      >
        <Share2 aria-hidden="true" size={14} />
        {copied ? '¡Enlace copiado!' : 'Compartir'}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 4,
          boxShadow: '0 8px 28px rgba(15,37,53,0.13)',
          zIndex: 60,
          minWidth: 188,
          overflow: 'hidden',
        }}>
          {SHARE_NETWORKS.map(net => (
            <a className="text-sdm-base text-[#0F2535] bg-transparent hover:bg-[#f4f8fb]"
              key={net.key}
              href={net.getHref(pageUrl, pageText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={cerrarYEnfocar}
              style={{ display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 14px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                textDecoration: 'none',
                transition: 'background 0.1s' }}
            >
              <span className="tracking-sdm-tight" style={{ display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: net.color,
                color: '#fff',
                fontSize: net.symbol === '𝕏' ? 11 : net.symbol === 'in' ? 9 : 11,
                fontWeight: 700,
                flexShrink: 0 }}>
                {net.symbol}
              </span>
              {net.label}
            </a>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

          {/* Copy link */}
          <button className="text-sdm-base bg-transparent hover:bg-[#f4f8fb]"
            onClick={copyLink}
            style={{ display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 14px',
              color: '#0F2535',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              transition: 'background 0.1s' }}
          >
            <span className="text-sdm-sm" style={{ display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#6B7280',
              color: '#fff',
              flexShrink: 0 }}>
              <Link2 aria-hidden="true" size={14} strokeWidth={2} />
            </span>
            Copiar enlace
          </button>
        </div>
      )}
    </div>
  )
}

const ETAPA_LABELS: Record<string, string> = {
  en_blanco: 'En Blanco',
  en_verde: 'En Verde',
  planos: 'En Planos',
  inicio: 'Inicio de obras',
  avanzado: 'Obra avanzada',
  proxima_entrega: 'Próxima entrega',
  entrega_inmediata: 'Entrega inmediata',
}

const SUBSIDIO_LABELS: Record<string, string> = {
  DS49: 'DS49 Fondo Solidario',
  DS1_T1: 'DS1 Tramo 1',
  DS1_T2: 'DS1 Tramo 2',
  DS1_T3: 'DS1 Tramo 3',
  DS19: 'DS19 Integración Social',
  DS52: 'DS52 Arriendo',
  DS52_especial: 'DS52 Especial',
  sitio_propio: 'Sitio Propio',
  pequenos_condominios: 'Pequeños Condominios',
  DS10: 'DS10 Rural',
  DS27_mejoramiento: 'Hogar Mejor',
  DS27_ampliacion: 'DS27 Ampliación',
  DS27_eficiencia: 'Eficiencia Energética',
  DS27_termico: 'Acondicionamiento Térmico',
  condominios_sociales: 'Condominios Sociales',
  pavimentacion: 'Pavimentación',
  leasing: 'Leasing Habitacional',
  FOGAES: 'FOGAES',
  subsidio_tasa: 'Subsidio a la Tasa',
}

// Estados de resultado — banner destacado cerca del precio/título
const ESTADO_DESTACADO: Record<string, { label: string; sub: string; bg: string }> = {
  vendida:   { label: 'Vendida',   sub: 'Esta propiedad ya no está disponible', bg: 'var(--estado-vendida)' },
  arrendada: { label: 'Arrendada', sub: 'Esta propiedad ya no está disponible', bg: 'var(--estado-arrendada)' },
  reservada: { label: 'Reservada', sub: 'Esta propiedad tiene una reserva en curso', bg: 'var(--estado-reservada)' },
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PropiedadDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang } = useLang()
  const { get } = useContenido()
  const [prop, setProp] = useState<Propiedad | null>(null)
  const [loading, setLoading] = useState(true)
  const [similares, setSimilares] = useState<Propiedad[]>([])

  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [reservaAbierta, setReservaAbierta] = useState(false)

  // ─── EL EQUIVALENTE EN PESOS, PARA LOS DOS COMPRADORES ─────────────────────
  // La ficha mostraba «UF 1.779» y nunca su valor en pesos, aunque el sitio YA
  // conoce la UF del día: la publica la cinta del header y la usa el modal de
  // crédito. La pieza existía y no estaba enchufada donde se decide la compra.
  //
  // Sirve a los dos usuarios principales, no a uno: quien invierte compara en UF
  // y quien compra para vivir piensa el presupuesto en pesos.
  //
  // Se usa el MISMO módulo que el header (`obtenerIndicadores`), que ya trae
  // caché, timeout y su propio fallback. Si la consulta falla devuelve `null` y
  // la línea sencillamente no se pinta: nunca un «$ NaN» ni un cero.
  const [uf, setUf] = useState<number | null>(null)
  useEffect(() => {
    let vivo = true
    obtenerIndicadores().then(i => { if (vivo && i.uf) setUf(i.uf.valor) })
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)

    // ─── `.eq('activo', true)` EN LAS DOS CONSULTAS ─────────────────────────
    //
    // ESTA PÁGINA ERA EL ÚNICO SITIO DEL CÓDIGO PÚBLICO QUE NO FILTRABA.
    // El catálogo, las destacadas del home, las similares de más abajo y el
    // sitemap ya lo hacían; ésta consultaba por slug a secas.
    //
    // No se notaba porque la política `propiedades_select_anon` —`USING (activo
    // IS TRUE)`, migración 20260805000300— descarta la fila antes de que llegue.
    // Pero eso dejaba a esa política como ÚNICO control sobre las direcciones de
    // la cartera del socio: las 10 fichas de edificio siguen en la base, con su
    // `direccion` real, y solo están en `activo = false`. Si la política se
    // edita, se recrea desde el dashboard como `Allow all` —cosa contra la que
    // la propia migración advierte— o la ficha se abre con sesión iniciada,
    // `/propiedades/torre-los-andes` volvía a renderizar entera, con dirección y
    // mapa. Ahora hacen falta las dos cosas para que eso ocurra.
    //
    // `.eq('activo', true)` Y NO `.neq('activo', false)`, que es lo que usan sus
    // vecinas. Las dos formas difieren solo en las filas con `activo` NULL —hoy
    // no hay ninguna, medido: 82 de 82 en `true`— y ésta es la que copia
    // EXACTAMENTE el predicado de la política. Es el punto: que el código diga
    // lo mismo que el RLS, no algo parecido.
    //
    // `.maybeSingle()` y no `.single()`: con el filtro puesto, «cero filas» pasa
    // a ser un resultado NORMAL —toda propiedad pausada da eso— y `.single()` lo
    // trataba como error y lo escupía por consola en cada visita. `maybeSingle`
    // devuelve `data: null, error: null` para cero filas y sigue reportando los
    // errores de verdad. La rama de `!prop` (más abajo) ya pinta «Propiedad no
    // encontrada», así que una pausada cae exactamente donde un slug inventado.

    // Links viejos con UUID → resolver el slug actual y redirigir 301
    if (UUID_REGEX.test(slug)) {
      supabase.from('propiedades').select('slug').eq('id', slug).eq('activo', true).maybeSingle()
        .then(({ data, error }) => {
          if (!error && data?.slug) {
            window.location.replace(`/propiedades/${data.slug}`)
          } else {
            setProp(null)
            setLoading(false)
          }
        })
      return
    }

    supabase.from('propiedades').select('*').eq('slug', slug).eq('activo', true).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Error cargando propiedad:', error)
        setProp(data)
        setLoading(false)
      })
  }, [slug])

  // PROPIEDADES SIMILARES: comuna ∪ (tipo + precio ±30 %).
  //
  // El criterio salió de medir los siete candidatos sobre las 82. «Comuna +
  // tipo» dejaba al 32 % sin ninguna coincidencia —hay 32 comunas distintas y
  // 17 con una sola propiedad—, y «mismo tipo» solo daba una media de 36
  // similares, que no es «similar» sino «el resto del catálogo». La unión cubre
  // al 88 % con bloque completo: quien mira en una comuna concreta ve vecinos,
  // y quien está en una comuna de una sola propiedad ve alternativas del mismo
  // tipo y presupuesto.
  //
  // UNA CONSULTA MÁS, acotada. El filtro va en PostgREST y no en el cliente
  // para no traerse los 42 departamentos del catálogo: se piden hasta 24 filas
  // y solo las columnas que dibuja `PropertyCard`.
  useEffect(() => {
    if (!prop) { setSimilares([]); return }
    const precio = typeof prop.precio_uf === 'number' && prop.precio_uf > 0 ? prop.precio_uf : null
    const cond = [`comuna.eq.${prop.comuna}`]
    // Sin precio no hay banda que comparar: una ficha «a consultar» solo puede
    // parecerse por comuna. Son tres, y dos de ellas están en comunas de una
    // sola propiedad, así que no dibujarán bloque — que es lo correcto.
    if (precio) {
      cond.push(`and(tipo.eq.${prop.tipo},precio_uf.gte.${(precio * 0.7).toFixed(2)},precio_uf.lte.${(precio * 1.3).toFixed(2)})`)
    }
    supabase.from('propiedades')
      .select('id, slug, titulo, titulo_en, tipo, comuna, region, pais, categoria, estado, dormitorios, banos, superficie_total, precio_uf, precio_clp, precio_usd, precio_anterior_uf, a_consultar, baja_precio, bono_pie, bono_pie_porcentaje, etapa_construccion, fecha_entrega, imagen_principal, imagenes')
      .neq('id', prop.id)
      .or('activo.is.null,activo.eq.true')
      .neq('activo', false)
      .or(cond.join(','))
      .limit(24)
      .then(({ data }) => setSimilares((data || []) as Propiedad[]))
  }, [prop])

  // EL ORDEN IMPORTA TANTO COMO EL FILTRO. Con una media de 14,7 candidatas y
  // un bloque de 3, sin criterio de orden dos propiedades de la misma comuna a
  // 3.000 y 25.000 UF salen igual de «similares».
  //
  // Primero las que cumplen LAS DOS condiciones —misma comuna Y tipo/precio—,
  // que son más parecidas que las que cumplen una. Dentro de cada grupo, por
  // cercanía de precio.
  //
  // Medido antes de elegirlo: priorizar las dobles NO deja bloques cortos,
  // porque el orden solo reordena, no filtra. De las 82, 31 llenan el bloque
  // solo con dobles, 7 lo llenan mezclando y 37 solo con simples. Las 7 que no
  // llegan a dos candidatas no dibujan nada.
  const precioProp = typeof prop?.precio_uf === 'number' && prop.precio_uf > 0 ? prop.precio_uf : null
  const similaresOrdenadas = [...similares]
    .map(s => {
      const p = typeof s.precio_uf === 'number' && s.precio_uf > 0 ? s.precio_uf : null
      const mismaComuna = s.comuna === prop?.comuna
      const mismoTipoPrecio = !!(precioProp && p && s.tipo === prop?.tipo && Math.abs(p - precioProp) <= 0.30 * precioProp)
      return {
        s,
        grupo: mismaComuna && mismoTipoPrecio ? 0 : 1,
        // Sin precio no hay distancia: van al final de su grupo.
        dist: precioProp && p ? Math.abs(p - precioProp) / precioProp : Number.POSITIVE_INFINITY,
      }
    })
    .sort((a, b) => a.grupo - b.grupo || a.dist - b.dist)
    .slice(0, 3)
    .map(x => x.s)

  const allImgs: string[] = prop ? [
    ...(prop.imagen_principal ? [prop.imagen_principal] : []),
    ...(prop.imagenes || []).filter((img: string) => img !== prop.imagen_principal),
  ] : []

  const prev = () => setImgIdx(i => (i - 1 + allImgs.length) % allImgs.length)
  const next = () => setImgIdx(i => (i + 1) % allImgs.length)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      // Escape lo cierra `useDialogoModal`; acá solo quedan las flechas.
    }
    if (lightbox) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `prev` y `next` se redefinen en cada render, pero no leen nada obsoleto: mueven el índice con `setImgIdx(i => …)`, la forma funcional, y lo único externo que tocan es `allImgs.length`, que ya está en el array. Agregarlas solo haría desmontar y remontar el listener de teclado en cada render.
  }, [lightbox, imgIdx, allImgs.length])

  // El lightbox es un diálogo modal como cualquier otro: tapa la página entera
  // y con Tab se podía salir a los enlaces de atrás sin cerrarlo. Ya tenía
  // Escape; le faltaban el foco atrapado, la devolución del foco a la miniatura
  // que lo abrió, y las semánticas de diálogo.
  const cajaLightbox = useRef<HTMLDivElement>(null)
  const cerrarLightbox = useCallback(() => setLightbox(false), [])
  useDialogoModal(lightbox, cajaLightbox, cerrarLightbox)
  useBloquearScroll(lightbox)

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--muted)' }}>Cargando…</div>
  // Esta rama se saltaba el contrato de la tanda 4: era la única página del
  // sitio que se renderizaba sin ningún <h1>. El estilo es el mismo de antes
  // —el reset de Tailwind deja los encabezados en `font-size: inherit` y sin
  // margen—, así que solo cambia la etiqueta.
  if (!prop)   return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ color: 'var(--muted)' }}>
      <h1>Propiedad no encontrada.</h1>
      <Link to="/propiedades" className="btn-text">Ver todas las propiedades</Link>
    </div>
  )

  const titulo = lang === 'en' && prop.titulo_en ? prop.titulo_en : prop.titulo

  const estado = prop.estado === 'en_venta' ? 'En venta' : prop.estado === 'en_arriendo' ? 'En arriendo' : prop.estado === 'vendida' ? 'Vendida' : prop.estado === 'arrendada' ? 'Arrendada' : 'Reservada'
  const destacado = ESTADO_DESTACADO[prop.estado]
  const noDisponible = prop.estado === 'vendida' || prop.estado === 'arrendada'

  return (
    <div>
      <SEO
        title={titulo}
        description={`${prop.tipo ? prop.tipo.charAt(0).toUpperCase() + prop.tipo.slice(1) : 'Propiedad'} en ${formatUbicacion(prop, ', ')}. ${prop.a_consultar ? 'Precio a consultar.' : prop.precio_uf ? `UF ${prop.precio_uf.toLocaleString('es-CL')}.` : ''} ${prop.descripcion?.slice(0, 120) || ''}`}
        image={prop.imagen_principal || prop.imagenes?.[0]}
        url={`/propiedades/${prop.slug || prop.id}`}
        type="article"
      />
      {/* Breadcrumb */}
      <div className="px-8 lg:px-12 py-4 border-b border-[var(--border)] flex items-center gap-2 text-sdm-sm" style={{ color: 'var(--muted)' }}>
        <Link to="/propiedades" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Propiedades</Link>
        <span>›</span>
        <span className="text-sdm-sm" style={{ color: 'var(--navy-dark)' }}>{titulo}</span>
      </div>

      {/* ── Banner del showcase (solo si la propiedad lo tiene publicado) ── */}
      <ShowcaseBanner propiedadId={prop.id} slug={prop.slug} />

      <div className="px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

          {/* ── Galería ── */}
          {/* ─── PEGAJOSA DESDE 768, Y `self-start` ES LO QUE LO HACE POSIBLE ───
              Medido en 18 fichas: la galería mide **508 px exactos** tenga 8 o 20
              imágenes, y la columna derecha va de 1.670 a 5.881. El hueco bajo la
              galería es de 1.162 a 5.373 px, con mediana 2.448 — y está en
              **18 de 18**, no en una minoría.

              `md:self-start` NO ES COSMÉTICO: sin él la caja no se puede pegar.
              Un hijo de grid se estira a la altura de la fila por defecto
              (`align-self: stretch`), así que su caja YA ocupa los 5.881 px y
              `sticky` no tiene recorrido. Con `self-start` la caja vuelve a medir
              lo que mide su contenido y aparece el espacio por el que deslizarse.
              (Ese estiramiento es también lo que hizo que la primera medición del
              hueco diera 0 en 18/18: comparaba cajas, que siempre son iguales.)

              El desplazamiento superior sale de `--sdm-header-total`, el MISMO
              token que usa `scroll-padding-top` en `globals.css:427`. Escribir el
              número a mano dejaría dos fuentes que divergen en cuanto alguien
              toque la altura del header o de la barra de indicadores.

              `md:` y no antes: bajo 768 la ficha es una sola columna y pegar la
              galería la dejaría tapando el texto. El `top` inline es inofensivo
              ahí porque no aplica a un elemento `static`.

              §5.7 ya dejó el camino libre: `html` y `body` llevan `overflow-x:
              clip` y no `hidden` justamente para no convertirse en contenedor de
              scroll y romper cualquier `sticky` del sitio. */}
          <div className="md:sticky md:self-start" style={{ top: 'var(--sdm-header-total)' }}>
            {/* Imagen principal — clic para abrir lightbox */}
            {/* El contenedor NO puede ser el <button>: contiene las flechas de
                anterior/siguiente, y un botón dentro de otro es inválido. El
                botón va superpuesto y transparente, antes que las flechas en el
                DOM, así que ellas quedan encima y siguen recibiendo su clic.
                Para el ratón la imagen se sigue pulsando entera. */}
            <div
              className="w-full mb-3 relative overflow-hidden"
              style={{ height: 420, background: 'linear-gradient(160deg,var(--navy),var(--navy-dark))', borderRadius: 2 }}
            >
              {allImgs.length > 0 && (
                <button
                  type="button"
                  aria-label="Ver la imagen ampliada"
                  onClick={() => setLightbox(true)}
                  className="cursor-zoom-in"
                  style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'transparent', border: 'none', padding: 0 }}
                />
              )}
              {allImgs[imgIdx] ? (
                <img
                  src={allImgs[imgIdx]}
                  alt={titulo}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block', background: '#0d1e2e' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-serif italic text-sdm-lg" style={{ color: 'rgba(255,255,255,0.2)' }}>{titulo}</span>
                </div>
              )}

              {/* Hint ampliación */}
              {allImgs.length > 0 && (
                <div className="text-sdm-xs tracking-sdm-wide" style={{ position: 'absolute', bottom: 10, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: 2, textTransform: 'uppercase' }}>
                  Ver ampliada
                </div>
              )}

              {/* Flechas si hay más de 1 */}
              {allImgs.length > 1 && (
                <>
                  <button aria-label="Ver la imagen anterior" className="bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)]" onClick={e => { e.stopPropagation(); prev() }}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: '#fff', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft aria-hidden="true" size={18} />
                  </button>
                  <button aria-label="Ver la imagen siguiente" className="bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)]" onClick={e => { e.stopPropagation(); next() }}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: '#fff', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImgs.map((img, i) => (
                  // La selección pasa de `outline` a `box-shadow` porque el
                  // anillo de foco TAMBIÉN es un outline: con los dos en la
                  // misma propiedad, la miniatura enfocada no se distinguiría.
                  // `box-shadow: 0 0 0 2px` dibuja el mismo anillo por fuera de
                  // la caja y sin afectar al layout.
                  <button key={i} type="button" onClick={() => setImgIdx(i)}
                    aria-label={`Ver imagen ${i + 1} de ${allImgs.length}`}
                    aria-current={i === imgIdx ? 'true' : undefined}
                    className="flex-shrink-0 cursor-pointer" style={{ width: 76, height: 56, borderRadius: 2, overflow: 'hidden', padding: 0, border: 'none', boxShadow: i === imgIdx ? '0 0 0 2px var(--green-dark)' : '0 0 0 2px transparent', transition: 'box-shadow 0.15s', background: '#0d1e2e' }}>
                    <img src={thumbUrl(img)} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}

            {/* ─── EL PRECIO VIVE CON LA FOTO, Y VIAJA CON ELLA ────────────────────
                Sube desde la columna derecha, donde quedaba a media pantalla de la
                galería y se perdía al desplazarse. Acá entra en el bloque pegajoso:
                mientras se lee la descripción, la foto Y el precio siguen a la vista.

                SUBE SOLO LO QUE LA COLUMNA DERECHA NO REPITE: el valor en UF, su
                equivalente en CLP y el monto del bono pie. Los tres son marcado y no
                existen en el texto del editor.

                LAS ETIQUETAS DE ABAJO NO SUBEN, y no es un olvido. «Comisión
                corredora 2 %» está también dentro de la descripción de muchas fichas,
                y ahí dice «2 % + IVA». Subir el marcado encima pondría las dos
                redacciones a la vista a la vez. Es una discrepancia de contenido en 82
                fichas, anotada como hallazgo en AUDITORIA-VOZ-SDM.md.

                ORDEN DEL DOM: galería → precio → banner de estado → specs → …
                Sin CSS se lee igual de bien que antes; el precio sencillamente llega
                antes. No hace falta ningún `order:`. */}
            {(prop.a_consultar || prop.precio_uf || prop.precio_usd || prop.precio_clp) && (
              <div className="mb-6 pb-6 border-b border-[var(--border)]">
                {prop.baja_precio && prop.precio_anterior_uf && (
                  <div className="text-sdm-xl" style={{ color: 'var(--muted)', textDecoration: 'line-through', marginBottom: 4 }}>
                    UF {prop.precio_anterior_uf.toLocaleString('es-CL')} — precio anterior
                  </div>
                )}
                {/* Una rebaja es una oportunidad, no un error. Estaba en el rojo
                    de error mientras la insignia de acá arriba ya decía «Precio
                    rebajado» en verde: la misma tarjeta afirmaba dos cosas
                    opuestas sobre el mismo hecho. La comparación ya la comunica
                    el precio anterior tachado; el color no tiene que reforzarla. */}
                <div className="font-serif text-sdm-display-md" style={{ fontWeight: 300, color: prop.baja_precio ? 'var(--oportunidad)' : 'var(--navy-dark)' }}>
                  {prop.a_consultar
                    ? 'A consultar'
                    : prop.precio_uf
                    ? `UF ${prop.precio_uf.toLocaleString('es-CL')}`
                    : prop.precio_clp
                    ? `$ ${(prop.precio_clp as number).toLocaleString('es-CL')}`
                    : prop.precio_usd
                    ? `USD ${prop.precio_usd.toLocaleString()}`
                    : ''}
                </div>
                {/* Equivalente en pesos. `--muted` sobre blanco da 5,03:1. */}
                {uf && prop.precio_uf && !prop.a_consultar && (
                  <div className="text-sdm-base" style={{ fontWeight: 300, color: 'var(--muted)', marginTop: 4 }}>
                    ≈ ${Math.round(prop.precio_uf * uf).toLocaleString('es-CL')} CLP
                  </div>
                )}
                {/* El bono pie decía solo su porcentaje. En monto es lo que el
                    comprador descuenta de verdad del pie. 27 de las 28 fichas que
                    llevan la insignia tienen los dos datos para calcularlo. */}
                {prop.bono_pie && prop.bono_pie_porcentaje && prop.precio_uf && !prop.a_consultar && (
                  <div className="text-sdm-base" style={{ fontWeight: 300, color: 'var(--oportunidad)', marginTop: 6 }}>
                    Bono pie de UF {Math.round(prop.precio_uf * prop.bono_pie_porcentaje / 100).toLocaleString('es-CL')}
                    <span style={{ color: 'var(--muted)' }}> · {prop.bono_pie_porcentaje}% del valor</span>
                  </div>
                )}
                <div className="text-sdm-base tracking-sdm-wide" style={{ fontWeight: 300, color: 'var(--muted)', marginTop: 6, textTransform: 'uppercase' }}>{estado}</div>
              </div>
            )}
          </div>

          {/* ── Detalle ── */}
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {prop.bono_pie && (
                <span className="text-sdm-xs tracking-sdm-wide" style={{ padding: '5px 14px', borderRadius: 1, background: 'var(--green-dark)', color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
                  Bono Pie{prop.bono_pie_porcentaje ? ` ${prop.bono_pie_porcentaje}%` : ''}
                </span>
              )}
              {prop.baja_precio && (
                <span className="text-sdm-xs tracking-sdm-wide" style={{ padding: '5px 14px', borderRadius: 1, background: 'var(--oportunidad)', color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
                  Precio rebajado
                </span>
              )}
              <span className="text-sdm-xs tracking-sdm-wide" style={{ padding: '5px 14px', borderRadius: 1, border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 400, textTransform: 'uppercase' }}>
                {prop.tipo}
              </span>
            </div>

            {/* Banner destacado de estado — vendida / reservada / arrendada */}
            {destacado && (
              <div className="mb-5 px-5 py-3" style={{ background: destacado.bg, borderRadius: 2 }}>
                <div className="text-sdm-lg tracking-sdm-wide" style={{ fontWeight: 700, textTransform: 'uppercase', color: '#fff' }}>
                  {destacado.label}
                </div>
                <div className="text-sdm-sm" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                  {destacado.sub}
                </div>
              </div>
            )}

            <h1 className="font-serif font-light mb-4 text-sdm-display-md" style={{ color: 'var(--navy-dark)' }}>
              {titulo}
            </h1>

            <div className="flex items-center gap-2 mb-4 text-sdm-base" style={{ color: 'var(--muted)' }}>
              <MapPin size={14} style={{ color: 'var(--green-dark)', flexShrink: 0 }} />
              {formatUbicacion(prop, ', ')}
            </div>

            {/* ── Compartir ── */}
            <ShareButtons titulo={titulo} />


            {/* Specs principales — solo los que tienen valor */}
            {(() => {
              const p = prop as typeof prop & Record<string, unknown>
              const specs = [
                prop.dormitorios      ? { icon: <Home size={22} style={{ color: 'var(--navy)' }} />,         val: prop.dormitorios,            label: 'Dorm.' }          : null,
                prop.banos            ? { icon: <Bath size={22} style={{ color: 'var(--navy)' }} />,         val: prop.banos,                  label: 'Baños' }          : null,
                prop.superficie_total ? { icon: <Maximize2 size={22} style={{ color: 'var(--navy)' }} />,   val: formatSuperficie(prop.superficie_total, lang === 'en' ? 'en' : 'es').texto, label: 'Sup. total' }     : null,
                p.superficie_util     ? { icon: <Maximize2 size={22} style={{ color: 'var(--navy)', opacity: 0.6 }} />, val: formatM2(p.superficie_util as number, lang === 'en' ? 'en' : 'es'), label: 'Sup. construida' } : null,
                prop.estacionamientos ? { icon: <ParkingSquare size={22} style={{ color: 'var(--navy)' }} />, val: prop.estacionamientos, label: 'Estacionam.' } : null,
                p.bodegas             ? { icon: <Package size={22} style={{ color: 'var(--navy)' }} />,                   val: p.bodegas as number,         label: 'Bodegas' }         : null,
                prop.ano_construccion ? { icon: <Hammer size={22} style={{ color: 'var(--navy)' }} />,                   val: prop.ano_construccion,       label: 'Año const.' }      : null,
              ].filter(Boolean)

              if (specs.length === 0) return null
              return (
                <div className="flex gap-8 mb-6 pb-6 border-b border-[var(--border)] flex-wrap items-start">
                  {specs.map((s, i) => s && (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 60 }}>
                      <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {s.icon}
                      </div>
                      <div className="font-serif text-sdm-2xl" style={{ fontWeight: 300, color: 'var(--navy-dark)', lineHeight: 1 }}>{s.val}</div>
                      <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Estado conservación + Bono pie + Comisión */}
            {(() => {
              const p = prop as typeof prop & Record<string, unknown>
              const tags: { label: string; dark?: boolean }[] = []
              if (p.estado_conservacion) tags.push({ label: String(p.estado_conservacion).charAt(0).toUpperCase() + String(p.estado_conservacion).slice(1), dark: false })
              if (p.comision_porcentaje && prop.categoria !== 'proyecto_nuevo') tags.push({ label: `Comisión corredora ${p.comision_porcentaje}%`, dark: true })
              if (!tags.length) return null
              return (
                <div className="flex gap-3 mb-8 flex-wrap">
                  {tags.map((tag, i) => (
                    <span className="text-sdm-xs tracking-sdm-wide" key={i} style={{ padding: '6px 16px',
                      borderRadius: 1,
                      background: tag.dark ? '#4a4a4a' : 'var(--green-dark)',
                      color: '#fff',
                      fontWeight: 500,
                      textTransform: 'uppercase' }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Descripción */}
            {prop.descripcion && (
              <div
                className="prose-sdm text-sdm-lg"
                style={{ fontWeight: 300, color: 'var(--muted)', marginBottom: 24 }}
                dangerouslySetInnerHTML={{ __html: sanitizarContenido(prop.descripcion) }}
              />
            )}

            {/* Unidades disponibles — edificios con varios pisos en arriendo */}
            {(() => {
              const unidades = Array.isArray(prop.unidades) ? prop.unidades : []
              if (!unidades.length) return null

              const conSuperficie = unidades.filter(u => typeof u.m2 === 'number')
              const totalM2 = conSuperficie.reduce((suma, u) => suma + (u.m2 as number), 0)
              const hayPendientes = conSuperficie.length < unidades.length

              const rotulo: CSSProperties = {
                fontSize: 'var(--sdm-text-xs)', letterSpacing: 'var(--sdm-tracking-wide)', textTransform: 'uppercase',
                color: 'var(--muted)', fontWeight: 400,
                padding: '0 0 8px', borderBottom: '1px solid var(--border)',
              }
              const celda: CSSProperties = { padding: '10px 0', borderBottom: '1px solid var(--border)' }
              const cifra: CSSProperties = { fontSize: 'var(--sdm-text-xl)', fontWeight: 300, color: 'var(--navy-dark)', lineHeight: 1.2 }

              return (
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h2 className="font-serif font-light mb-4 text-sdm-2xl" style={{ color: 'var(--navy-dark)' }}>
                    Unidades disponibles
                  </h2>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...rotulo, textAlign: 'left' }}>Piso</th>
                        <th style={{ ...rotulo, textAlign: 'right' }}>Superficie</th>
                      </tr>
                    </thead>

                    <tbody>
                      {unidades.map((u, i) => (
                        <tr key={i}>
                          <td style={{ ...celda, textAlign: 'left' }}>
                            <span className="font-serif" style={cifra}>{u.piso}</span>
                            {u.nota && (
                              <div className="text-sdm-sm" style={{ fontWeight: 300, color: 'var(--muted)', marginTop: 2 }}>
                                {u.nota}
                              </div>
                            )}
                          </td>
                          <td style={{ ...celda, textAlign: 'right' }}>
                            {typeof u.m2 === 'number' ? (
                              <span className="font-serif" style={cifra}>{u.m2.toLocaleString('es-CL')} m²</span>
                            ) : (
                              <span className="text-sdm-sm" style={{ fontWeight: 300, color: 'var(--muted)' }}>Por confirmar</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <td style={{ padding: '14px 0 0', textAlign: 'left', verticalAlign: 'bottom' }}>
                          <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                            Total
                          </div>
                          <div className="font-serif text-sdm-2xl" style={{ ...cifra }}>
                            {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 0 0', textAlign: 'right', verticalAlign: 'bottom' }}>
                          <div className="font-serif text-sdm-2xl" style={{ ...cifra }}>
                            {totalM2.toLocaleString('es-CL')} m²
                          </div>
                          {hayPendientes && (
                            <div className="text-sdm-sm" style={{ fontWeight: 300, color: 'var(--muted)', marginTop: 2 }}>
                              No incluye las unidades por confirmar
                            </div>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })()}

            {/* Información del Proyecto — solo proyectos nuevos */}
            {prop.categoria === 'proyecto_nuevo' && (() => {
              const items: { label: string; value: string }[] = []
              if (prop.etapa_construccion && ETAPA_LABELS[prop.etapa_construccion]) items.push({ label: 'Etapa', value: ETAPA_LABELS[prop.etapa_construccion] })
              // Misma regla que la tarjeta: si la etapa es «Entrega inmediata»,
              // la fecha no se muestra. Acá salían como dos filas seguidas —
              // «Etapa: Entrega inmediata» y «Fecha estimada de entrega: 2026»—
              // que se contradicen igual que en el catálogo.
              if (prop.fecha_entrega && prop.etapa_construccion !== 'entrega_inmediata') items.push({ label: 'Fecha estimada de entrega', value: prop.fecha_entrega })
              if (prop.avance_obra !== undefined && prop.avance_obra !== null) items.push({ label: 'Avance de obra', value: `${prop.avance_obra}%` })
              const subsidios = prop.subsidios || []
              if (!items.length && !subsidios.length) return null
              return (
                <div className="mb-6 pb-6 border-b border-[var(--border)]">
                  <h2 className="font-serif font-light mb-4 text-sdm-2xl" style={{ color: 'var(--navy-dark)' }}>
                    Información del Proyecto
                  </h2>
                  {items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {items.map((item, i) => (
                        <div key={i}>
                          <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                          <div className="text-sdm-lg" style={{ fontWeight: 300, color: 'var(--ink)' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {subsidios.length > 0 && (
                    <div>
                      <div className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Subsidios aplicables</div>
                      <div className="flex flex-wrap gap-2">
                        {subsidios.map(value => (
                          <span className="text-sdm-xs tracking-sdm-wide" key={value} style={{ padding: '5px 14px', borderRadius: 1, background: 'var(--navy)', color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
                            {SUBSIDIO_LABELS[value] || value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Dossiers múltiples */}
            {(() => {
              const dossiers = normalizeDossiers(prop.dossiers)
              const legacy = prop.dossier_url
              const all = dossiers.length > 0
                ? dossiers
                : legacy ? [{ url: legacy }] : []
              if (!all.length) return null
              return (
                <div className="mb-6">
                  <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Documentos adjuntos</div>
                  <div className="flex flex-col gap-2">
                    {all.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-4 py-3 rounded-sm text-sdm-base bg-[var(--sky-pale)] hover:bg-[#dbeaf5]"
                        style={{ border: '1px solid var(--sky)', textDecoration: 'none', color: 'var(--navy)', transition: 'background 0.15s' }}
                      >
                        <FileText size={20} strokeWidth={2} style={{ color: 'var(--navy)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{dossierTitle(d)}</span>
                        <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Descargar ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-3 flex-wrap">
              {noDisponible ? (
                <div
                  className="inline-flex items-center text-sdm-sm tracking-sdm-wide"
                  style={{ padding: '13px 24px', borderRadius: 6, background: 'var(--sky-pale)', color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase' }}
                >
                  Esta propiedad ya no está disponible
                </div>
              ) : (
                <>
                  <a
                    href={`https://wa.me/${get('whatsapp', '56937478846')}?text=Hola, me interesa la propiedad: ${titulo}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-green inline-flex"
                  >
                    Consultar por WhatsApp
                  </a>
                  <button
                    onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                    className="btn-primary inline-flex"
                  >
                    Contactar agente
                  </button>
                </>
              )}
            </div>

            {/* ─── PAGO CON FLOW: DESACTIVADO, NO ELIMINADO ─────────────────────
                Acá vivía un <a> a `https://www.flow.cl/uri/gHSdT2jVv` con el
                logo de Flow. NO era una integración: era una URL escrita a mano
                —la misma en las 81 propiedades que tienen el botón y en el pie
                de las 17 rutas— apuntando a un LINK DE PAGO DE COBRO ÚNICO
                creado en el panel de Flow. Cero generación de órdenes, cero
                persistencia, cero callback: `commerceOrder` no existió nunca en
                este repositorio.

                Ese cobro se pagó una vez —transacción N° 172266471— y desde
                entonces el enlace devuelve, a TODO el que lo abre:

                  «Ya existe un pago para la transacción N° 172266471»

                Verificado el 2026-08-10 con un GET al mismo enlace: redirige
                siempre al token fijo 9D604FADE9E15D314E6286A5AB56C0E2A278E78E.

                PARA REACTIVARLO hacen falta las dos cosas, no solo la primera:
                  1. Un link de pago REUTILIZABLE en Flow, no un cobro único; o
                     mejor, la API con un `commerceOrder` distinto por intento y
                     persistido antes de redirigir.
                  2. Un callback que cierre la reserva. Hoy no hay ninguno.

                `supabase/functions/transbank-init` ya hace las dos cosas bien
                —orden única, insert en `reservas`, retorno a
                /reserva/confirmacion— aunque está huérfana: nadie la llama. Es
                la plantilla si algún día se retoma el pago en línea.

                La constante se conserva para no perder el identificador:      */}
            {/* const FLOW_URI_DESACTIVADO = 'https://www.flow.cl/uri/gHSdT2jVv' */}

            {/* Se llamaba `mostrar_boton_flow`. El renombrado se hizo en dos
                pasos —columna nueva con backfill, después el código— porque el
                sitio en vivo estaba leyendo la vieja. `mostrar_boton_flow`
                sigue en la base y se borra cuando el deploy esté verificado.

                `!== false` y no `=== true`: la columna es nullable, y un NULL
                significa «no se ha dicho que no». Hoy no hay ninguno. */}
            {prop.mostrar_boton_reserva !== false && !destacado && (
              <button
                type="button"
                onClick={() => setReservaAbierta(true)}
                className="tracking-sdm-wide text-sdm-sm bg-transparent text-[var(--navy-dark)] hover:bg-[var(--navy-dark)] hover:text-white"
                style={{ display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '12px',
                  width: '100%',
                  padding: '13px 24px',
                  border: '1px solid var(--navy-dark)',
                  borderRadius: 'var(--sdm-radio-control)',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background var(--sdm-mov-normal) var(--sdm-curva), color var(--sdm-mov-normal) var(--sdm-curva)' }}
              >
                <Landmark aria-hidden="true" size={16} strokeWidth={1.75} />
                <span>Reservar esta propiedad</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de reserva por transferencia. Se monta sólo cuando está abierto,
          igual que el lightbox y que `SolicitudCreditoModal`: `useDialogoModal`
          y `useBloquearScroll` cuelgan de su montaje. */}
      {reservaAbierta && (
        <ReservaModal
          propiedad={{ id: prop.id, titulo }}
          onClose={() => setReservaAbierta(false)}
        />
      )}

      {/* ── Lightbox ── */}
      {lightbox && allImgs.length > 0 && (
        <div
          ref={cajaLightbox}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${titulo}`}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(false)}
        >
          {/* Cerrar */}
          <button
            onClick={() => setLightbox(false)}
            aria-label="Cerrar la galería"
            style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}
          >
            <X aria-hidden="true" size={32} />
          </button>

          {/* Contador */}
          <div className="text-sdm-base tracking-sdm-wide" style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)' }}>
            {imgIdx + 1} / {allImgs.length}
          </div>

          {/* Imagen */}
          <img
            src={allImgs[imgIdx]}
            alt={titulo}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 2 }}
          />

          {/* Flechas */}
          {allImgs.length > 1 && (
            <>
              <button aria-label="Ver la imagen anterior" className="bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)]" onClick={e => { e.stopPropagation(); prev() }}
                style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: '50%', color: '#fff', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              >
                <ChevronLeft aria-hidden="true" size={24} />
              </button>
              <button aria-label="Ver la imagen siguiente" className="bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)]" onClick={e => { e.stopPropagation(); next() }}
                style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: '50%', color: '#fff', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              >
                <ChevronRight aria-hidden="true" size={24} />
              </button>
            </>
          )}

          {/* Thumbnails strip */}
          {allImgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto" style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', maxWidth: '90vw', padding: '0 8px' }}>
              {allImgs.map((img, i) => (
                <button key={i} type="button" onClick={e => { e.stopPropagation(); setImgIdx(i) }}
                  aria-label={`Ver imagen ${i + 1} de ${allImgs.length}`}
                  aria-current={i === imgIdx ? 'true' : undefined}
                  style={{ width: 60, height: 44, borderRadius: 2, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', padding: 0, border: 'none', background: 'transparent', boxShadow: i === imgIdx ? '0 0 0 2px var(--green-dark)' : '0 0 0 2px transparent', opacity: i === imgIdx ? 1 : 0.55, transition: 'all 0.15s' }}>
                  <img src={thumbUrl(img)} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Video YouTube ── */}
      {prop.youtube_url && (() => {
        const raw = prop.youtube_url as string
        const match = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        const videoId = match?.[1]
        return videoId ? (
          <div className="px-8 lg:px-12 pb-12">
            <h2 className="font-serif font-light mb-6 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>
              Video de la propiedad
            </h2>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 2, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Video propiedad"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>
          </div>
        ) : null
      })()}

      {/* ── Banner del showcase (inferior) ── */}
      <ShowcaseBanner propiedadId={prop.id} slug={prop.slug} clave="banner_foto" />

      {/* PROPIEDADES SIMILARES.
          `<h2>` como las otras secciones de la ficha: el `<h1>` es el título de
          la propiedad y esto es una sección más, no un nivel nuevo.
          No se dibuja con menos de dos, igual que los relacionados del blog:
          una sola tarjeta no es un bloque de similares. Son 7 de las 82 las que
          no llegan, casi todas en comunas de una sola propiedad y sin precio
          con el que comparar. */}
      {similaresOrdenadas.length >= 2 && (
        <div className="px-8 lg:px-12 py-12 border-t border-[var(--border)]">
          <h2 className="font-serif font-light mb-6 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>
            Propiedades similares
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'var(--border)' }}>
            {similaresOrdenadas.map((s, i) => <PropertyCard key={s.id} propiedad={s} index={i} />)}
          </div>
        </div>
      )}

      {/* Mapa */}
      {(prop.map_address || prop.comuna) && (
        <div className="px-8 lg:px-12 py-10 border-t border-[var(--border)]">
          <PropertyMap
            address={prop.map_address}
            lat={prop.map_lat}
            lng={prop.map_lng}
            comuna={prop.comuna}
            region={prop.region}
            pais={prop.pais}
          />
        </div>
      )}

      <ContactSection />
    </div>
  )
}
