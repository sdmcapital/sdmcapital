import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/hooks/useLang'
import type { Propiedad } from '@/types'
import { thumbUrl } from '@/lib/imagenes'
import { formatSuperficie, formatUbicacion, paisSiExtranjero } from '@/lib/formato'

// Gradient backgrounds for placeholder images
const GRADIENTS = [
  'linear-gradient(140deg,#1C3D5C,#0F2535)',
  'linear-gradient(140deg,#1a3528,#0d2518)',
  'linear-gradient(140deg,#252535,#151525)',
  'linear-gradient(140deg,#351a1a,#200d0d)',
  'linear-gradient(140deg,#1a2535,#0d1a28)',
  'linear-gradient(140deg,#2a1a35,#1a0d28)',
]

const ESTADO_BADGES: Record<string, { label: string; style: { background: string; color: string } }> = {
  vendida:   { label: 'Vendida',   style: { background: 'var(--estado-vendida)',   color: '#fff' } },
  reservada: { label: 'Reservada', style: { background: 'var(--estado-reservada)', color: '#fff' } },
  arrendada: { label: 'Arrendada', style: { background: 'var(--estado-arrendada)', color: '#fff' } },
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

interface Props {
  propiedad: Propiedad
  index?: number
}

export default function PropertyCard({ propiedad, index = 0 }: Props) {
  const { t, lang } = useLang()
  const p = t.prop
  // Imágenes cuadradas (foto + texto SDM) deben verse completas; fotos normales mantienen el recorte cover
  const [isSquareImg, setIsSquareImg] = useState(false)

  // Solo los specs que EXISTEN. `0` y `null` cuentan como ausentes: cero
  // dormitorios no es un dato que valga la pena mostrar en una ficha, y es lo
  // que traen las propiedades que no los cargaron.
  // La superficie viene en m² y se muestra en hectáreas desde 10.000 m² (`formatSuperficie`): la
  // etiqueta de abajo es la unidad, así que cambia con ella.
  const sup = typeof propiedad.superficie_total === 'number' && propiedad.superficie_total > 0
    ? formatSuperficie(propiedad.superficie_total, lang === 'en' ? 'en' : 'es') : null
  const specs = ([
    { valor: propiedad.dormitorios,      etiqueta: p.dormitorios },
    { valor: propiedad.banos,            etiqueta: p.banos },
    { valor: sup?.valor,                 etiqueta: sup?.unidad === 'ha' ? 'ha' : p.superficie },
  ] as { valor: number | string | null | undefined; etiqueta: string }[])
    .filter(s => (typeof s.valor === 'number' && s.valor > 0) || (typeof s.valor === 'string' && s.valor !== '')) as { valor: number | string; etiqueta: string }[]

  // Badge de estado (vendida/reservada/arrendada) y badge secundario (precio rebajado o bono pie) — pueden coexistir
  const estadoBadge = ESTADO_BADGES[propiedad.estado] || null
  // Las dos van en --oportunidad, no en el rojo de «Vendida». Son ventajas
  // comerciales, no un cierre, y nunca coexisten: la insignia es una o la otra.
  const secundarioBadge = propiedad.baja_precio
    ? { label: 'Precio rebajado', style: { background: 'var(--oportunidad)', color: '#fff' } }
    : propiedad.bono_pie
    ? { label: `Bono Pie${propiedad.bono_pie_porcentaje ? ` ${propiedad.bono_pie_porcentaje}%` : ''}`, style: { background: 'var(--oportunidad)', color: '#fff' } }
    : null

  const priceDisplay = propiedad.a_consultar
    ? p.aConsultar
    : propiedad.precio_uf
    ? `UF ${propiedad.precio_uf.toLocaleString('es-CL')}`
    : propiedad.precio_clp
    ? `$ ${(propiedad.precio_clp as number).toLocaleString('es-CL')}`
    : propiedad.precio_usd
    ? `USD ${propiedad.precio_usd.toLocaleString()}`
    : '—'

  const priceLabel = propiedad.estado === 'en_arriendo' ? p.enArriendo : null

  const titulo = lang === 'en' && propiedad.titulo_en ? propiedad.titulo_en : propiedad.titulo

  return (
    <Link
      to={`/propiedades/${propiedad.slug || propiedad.id}`}
      className="group block bg-white overflow-hidden"
      style={{ textDecoration: 'none' }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: 'linear-gradient(160deg,var(--navy),var(--navy-dark))' }}>
        {(() => {
          // Tarjeta de ~350px: usa la miniatura de 400px, no el original
          const imgSrc = thumbUrl(propiedad.imagen_principal || propiedad.imagenes?.[0] || '')
          return (
            <div
              className="w-full h-full transition-transform duration-500 group-hover:scale-[1.03] flex items-center justify-center"
              style={{ background: imgSrc ? undefined : GRADIENTS[index % GRADIENTS.length] }}
            >
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={titulo}
                  loading="lazy"
                  decoding="async"
                  onLoad={e => {
                    const { naturalWidth, naturalHeight } = e.currentTarget
                    setIsSquareImg(naturalHeight > 0 && Math.abs(naturalWidth / naturalHeight - 1) < 0.1)
                  }}
                  style={{
                    objectFit: isSquareImg ? 'contain' : 'cover',
                    objectPosition: isSquareImg ? 'center' : 'center top',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                  }}
                />
              ) : (
                <span className="font-serif italic text-sdm-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {[propiedad.tipo, propiedad.comuna, paisSiExtranjero(propiedad.pais)].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          )
        })()}

        {/* Badges — estado (vendida/reservada/arrendada) y/o precio rebajado / bono pie, apilados */}
        {(estadoBadge || secundarioBadge) && (
          <div className="absolute top-3.5 left-3.5 flex flex-col items-start gap-1.5">
            {estadoBadge && (
              <div className="text-[13px] font-normal tracking-[2px] uppercase px-2.5 py-1" style={{ ...estadoBadge.style, borderRadius: 1 }}>
                {estadoBadge.label}
              </div>
            )}
            {secundarioBadge && (
              <div className="text-[13px] font-normal tracking-[2px] uppercase px-2.5 py-1" style={{ ...secundarioBadge.style, borderRadius: 1 }}>
                {secundarioBadge.label}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 lg:p-6">
        <div className="font-serif mb-1.5 text-sdm-2xl" style={{ fontWeight: 300, color: 'var(--navy-dark)', lineHeight: 1 }}>
          {priceDisplay}
          {priceLabel && (
            <small className="font-sans ml-1.5 text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 300, color: 'var(--muted)', textTransform: 'uppercase' }}>
              {priceLabel}
            </small>
          )}
        </div>
        {/* Precio anterior tachado */}
        {propiedad.baja_precio && propiedad.precio_anterior_uf && (
          <div className="text-sdm-sm" style={{ color: 'var(--muted)', textDecoration: 'line-through', marginBottom: 4 }}>
            Antes: UF {propiedad.precio_anterior_uf.toLocaleString('es-CL')}
          </div>
        )}
        <div className="font-sans font-light leading-[1.5] mb-2.5 text-sdm-base" style={{ color: 'var(--ink)' }}>
          {titulo}
        </div>
        <div
          className="font-sans font-light tracking-[1px] uppercase flex items-center gap-1.5 mb-3.5 text-sdm-base"
          style={{ color: 'var(--muted)' }}
        >
          <span style={{ width: 12, height: 1, background: 'var(--muted)', display: 'inline-block' }} />
          {formatUbicacion(propiedad)}
        </div>
        {/* SIN DATO NO HAY GUION, Y SIN NINGÚN DATO NO HAY FILA.
            La guarda era `!== undefined`, y los campos vacíos llegan como `null`
            o `0`, que la pasan: se dibujaban tres guiones con el mismo peso
            visual que tres números. Un guion no dice si el dato no existe, no
            aplica o es cero — mejor no ocupar el sitio.
            Son 15 de las 71 activas, casi todas proyectos nuevos donde el número
            de un departamento no representa al edificio. */}
        {specs.length > 0 && (
          <div className="flex gap-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            {specs.map(({ valor, etiqueta }) => (
              <div key={etiqueta} className="text-sdm-sm" style={{ fontWeight: 300, color: 'var(--muted)' }}>
                {/* SANS Y NO SERIF. En Cormorant Garamond el «1» es casi una I
                    mayúscula: a 17px y en un dato que se compara entre
                    propiedades, «1 1 34» se leía «I I 34».
                    Es el ÚNICO numeral en serif por debajo de 18px del sitio —
                    los contadores del hero van a 40px y ahí la fuente se lee
                    bien—, así que el cambio no se propaga a ninguna otra
                    superficie.
                    El precio grande de arriba SE QUEDA en serif: a 24px el
                    tamaño lo hace legible y es parte del carácter del sitio.
                    Peso 500 y no 400: la sans a este tamaño pesa menos que la
                    serif, y sin el ajuste el dato perdía presencia frente a su
                    etiqueta. */}
                <strong className="font-sans block text-sdm-lg" style={{ fontWeight: 500, color: 'var(--navy-dark)' }}>
                  {valor}
                </strong>
                {etiqueta}
              </div>
            ))}
          </div>
        )}

        {/* Info de proyecto nuevo — etapa y fecha de entrega */}
        {propiedad.categoria === 'proyecto_nuevo' && (propiedad.etapa_construccion || propiedad.fecha_entrega) && (
          <div className="mt-2.5 pt-2.5 border-t text-sdm-sm" style={{ borderColor: 'var(--border)', fontWeight: 300, color: 'var(--muted)' }}>
            {/* «Entrega inmediata · Entrega: 2026» se leía tal cual en el
                catálogo: dos campos que se contradicen.
                Si la etapa ES inmediata, la fecha se calla — una entrega
                inmediata no tiene fecha futura, y si la hay es un dato mal
                cargado que no debe llegar al visitante.
                Con cualquier otra etapa los dos conviven bien: «Próxima entrega
                · Entrega: 2028» informa de la fase Y del plazo, que no es lo
                mismo. Por eso la regla mira la etapa y no suprime la fecha
                siempre. */}
            {[
              propiedad.etapa_construccion ? ETAPA_LABELS[propiedad.etapa_construccion] : null,
              propiedad.fecha_entrega && propiedad.etapa_construccion !== 'entrega_inmediata'
                ? `Entrega: ${propiedad.fecha_entrega}`
                : null,
            ].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </Link>
  )
}
