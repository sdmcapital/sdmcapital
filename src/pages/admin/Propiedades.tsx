// Pestaña "Propiedades" del admin — alta, edición y orden del catálogo.
//
// Es el único panel que escribe sobre la tabla `propiedades`, que tiene RLS
// activo: `anon` solo hace SELECT de las filas con `activo IS TRUE`, y el
// FOR ALL es solo para `authenticated`. El admin entra autenticado, así que
// opera normal — pero nada de lo de acá debe tocar la semántica de `activo`
// (ver SINCRONIA.md, sesión RLS del 2026-08-05).
//
// Extraída de AdminPage.tsx sin cambios de comportamiento: mismos estilos,
// mismas queries. Los emojis pasaron a iconos de lucide-react más tarde. La clave de pestaña sigue siendo 'propiedades' — el orden de las
// pestañas se persiste en localStorage y renombrarla borraría esa preferencia.
//
// `PropImageManager`, `DossierUploader` y `slugify` viajan en este archivo
// porque solo los usa este panel. Los dos componentes van a nivel de módulo,
// nunca anidados dentro de Propiedades: definirlos adentro los recrea en cada
// render y React remonta el árbol entero (ver SINCRONIA.md).
//
// Las subidas van por el pipeline de `src/lib/subirImagen.ts`, que apunta a
// `/api/subir` — una Pages Function. En localhost no funcionan: vite.config.ts
// no proxea `/api`. Esa parte se prueba en producción.

import { useState, useEffect, useRef, useId } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, ArrowUpDown, Briefcase, Camera, Check, ExternalLink, File, GripVertical, ImageOff, MapPin, MousePointer2, Paperclip, Pause, Plus, Star, X, Youtube } from 'lucide-react'
import { REGIONES, getComunas } from '@/data/comunas-chile'
import { supabase } from '@/lib/supabase'
import { avisarError } from '@/lib/errores'
import { subirImagen, subirArchivo } from '@/lib/subirImagen'
import { normalizeDossiers, dossierFileName } from '@/lib/dossiers'
import { thumbUrl } from '@/lib/imagenes'
import { useDialogoModal } from '@/hooks/useDialogoModal'
import { useBloquearScroll } from '@/hooks/useBloquearScroll'
import { useContenido } from '@/hooks/useContenido'
import type { Propiedad, DossierItem, UnidadPropiedad } from '@/types'
import MapPicker from '@/components/ui/MapPicker'
import { Field, FieldGroup, Inp, Chk, Sel } from '@/components/admin/campos'
import { SaveBtn, Badge, Guardado, useGuardado } from '@/components/admin/acciones'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import type { Dispatch, SetStateAction } from 'react'
import { useDragSort, usePointerSort } from '@/components/admin/useDragSort'
import { claveOg } from '@/lib/og-propiedades.js'

// ─── PROYECTOS NUEVOS — opciones ───────────────────────────────────────────────
const FECHA_ENTREGA_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
]

const AVANCE_OBRA_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  ...Array.from({ length: 21 }, (_, i) => ({ value: String(i * 5), label: `${i * 5}%` })),
]

const SUBSIDIO_OPTIONS = [
  { value: 'DS49', label: 'DS49 — Fondo Solidario de Elección de Vivienda' },
  { value: 'DS1_T1', label: 'DS1 Tramo 1 — Sectores Medios' },
  { value: 'DS1_T2', label: 'DS1 Tramo 2 — Sectores Medios' },
  { value: 'DS1_T3', label: 'DS1 Tramo 3 — Sectores Medios' },
  { value: 'DS19', label: 'DS19 — Integración Social y Territorial' },
  { value: 'DS52', label: 'DS52 — Subsidio de Arriendo Regular' },
  { value: 'DS52_especial', label: 'DS52 Especial — Personas Mayores y Discapacidad' },
  { value: 'sitio_propio', label: 'Construcción en Sitio Propio (DS1/DS49)' },
  { value: 'pequenos_condominios', label: 'Pequeños Condominios — Densificación Predial' },
  { value: 'DS10', label: 'DS10 — Habitabilidad Rural' },
  { value: 'DS27_mejoramiento', label: 'DS27 — Mejoramiento de Vivienda (Hogar Mejor)' },
  { value: 'DS27_ampliacion', label: 'DS27 — Ampliación de Vivienda (Hogar Mejor)' },
  { value: 'DS27_eficiencia', label: 'DS27 — Eficiencia Energética (Paneles/Colectores)' },
  { value: 'DS27_termico', label: 'DS27 — Acondicionamiento Térmico' },
  { value: 'condominios_sociales', label: 'Reparación de Condominios Sociales' },
  { value: 'pavimentacion', label: 'Programa de Pavimentación Participativa' },
  { value: 'leasing', label: 'Leasing Habitacional' },
  { value: 'FOGAES', label: 'FOGAES — Garantía Estatal' },
  { value: 'subsidio_tasa', label: 'Subsidio a la Tasa de Interés' },
]

// ─── DOSSIER UPLOADER ────────────────────────────────────────────────────────
function DossierUploader({ items, onChanged }: { items: DossierItem[]; onChanged: (items: DossierItem[]) => void }) {
  const [uploading, setUploading] = useState(false)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const newItems: DossierItem[] = []
    for (const file of Array.from(files)) {
      const r = await subirArchivo(file, 'dossiers')
      if (r) newItems.push({ url: r.url })
    }
    onChanged([...items, ...newItems])
    setUploading(false)
    e.target.value = ''
  }

  const remove = (url: string) => {
    const d = items.find(x => x.url === url)
    const nombre = d?.titulo?.trim() || dossierFileName(url) || 'este archivo'
    if (!confirm(`¿Eliminar «${nombre}»? El enlace deja de funcionar para quien lo tenga.`)) return
    onChanged(items.filter(d => d.url !== url))
  }

  const setTitulo = (url: string, titulo: string) => {
    onChanged(items.map(d => d.url === url ? { ...d, titulo } : d))
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {items.map((d, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-sm" style={{ background: 'var(--sky-pale)', border: '1px solid var(--sky)' }}>
              <File size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
              <a className="text-sdm-sm" href={d.url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--muted)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, flexShrink: 0 }}>
                {dossierFileName(d.url)}
              </a>
              {/* aria-label y no rótulo visible: la fila es
                  icono · archivo · título · Eliminar, y un rótulo la partiría.
                  Se nombra con el archivo para distinguir una fila de otra. */}
              <input className="text-sdm-sm"
                aria-label={`Título del dossier ${dossierFileName(d.url)}`}
                type="text"
                value={d.titulo || ''}
                placeholder="Título a mostrar (opcional)"
                onChange={e => setTitulo(d.url, e.target.value)}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border-input-admin)', borderRadius: 2, background: '#fff', color: 'var(--ink)' }}
              />
              <button className="text-sdm-xs" onClick={() => remove(d.url)}
                style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="text-sdm-xs tracking-sdm-wide" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: uploading ? 'var(--muted)' : 'var(--navy-dark)', color: '#fff', padding: '9px 18px', borderRadius: 2, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>
        {uploading ? 'Subiendo…' : <><Paperclip size={14} strokeWidth={2} />{`Agregar archivos (${items.length} subido${items.length !== 1 ? 's' : ''})`}</>}
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple style={{ display: 'none' }} disabled={uploading} onChange={upload} />
      </label>
      <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginTop: 6 }}>PDF, Word, Excel. Puedes subir varios a la vez. Si dejas el título vacío, se muestra el nombre del archivo.</p>
    </div>
  )
}


// ─── UNIDADES ─────────────────────────────────────────────────────────────────
// Desglose piso por piso de un edificio. Controlado como `DossierUploader`: sin
// estado propio de la lista, guardado por el `save()` del padre. La conversión a
// NULL vive en ese `save()` y no acá — este componente solo produce arrays.
//
// `piso` es TEXTO y no se valida como número: el catálogo real trae etiquetas
// como "701" o "23 a 25".
//
// `m2` distingue null de 0. `Inp` entrega siempre string, así que '' llega
// distinguible de '0' sin inventar ningún centinela: '' ⇒ null ("Por confirmar"
// en la ficha), '0' ⇒ 0.
function UnidadesEditor({ items, onChanged }: { items: UnidadPropiedad[]; onChanged: (items: UnidadPropiedad[]) => void }) {
  // El ref se actualiza en el acto además de en el render. El oyente que sigue
  // el arrastre se crea UNA sola vez, en el pointerdown, así que si el setter
  // leyera `items` de la clausura cada paso partiría del array original: medido,
  // arrastrar dos posiciones movía la fila equivocada.
  const actuales = useRef(items)
  actuales.current = items
  const aplicarOrden: Dispatch<SetStateAction<UnidadPropiedad[]>> = accion => {
    const next = typeof accion === 'function' ? accion(actuales.current) : accion
    actuales.current = next
    onChanged(next)
  }
  const { arrastrando, filaProps, manijaProps } = usePointerSort(items, aplicarOrden, () => {})

  const editar = (i: number, cambio: Partial<UnidadPropiedad>) =>
    onChanged(items.map((u, j) => j === i ? { ...u, ...cambio } : u))

  const conSuperficie = items.filter(u => typeof u.m2 === 'number')
  const totalM2 = conSuperficie.reduce((suma, u) => suma + (u.m2 as number), 0)

  return (
    <div>
      {items.length > 0 && (
        <>
          {/* El encabezado solo existe de lg para arriba: debajo las filas son
              tarjetas apiladas y cada campo lleva su propia etiqueta. */}
          <div className="hidden lg:flex items-center gap-3 text-sdm-xs tracking-sdm-wide"
            style={{ textTransform: 'uppercase', color: 'var(--muted)', padding: '0 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <span style={{ width: 20, flexShrink: 0 }} />
            <span style={{ width: 140, flexShrink: 0 }}>Piso</span>
            <span style={{ width: 120, flexShrink: 0 }}>m² (vacío = por confirmar)</span>
            <span style={{ flex: 1 }}>Nota (opcional)</span>
            <span style={{ width: 70, flexShrink: 0 }} />
          </div>

          <div className="flex flex-col gap-3 lg:gap-2 mb-3">
            {items.map((u, i) => (
              <div key={i} {...filaProps(i)}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-[var(--border)] p-3 lg:flex-nowrap lg:border-0 lg:rounded-none lg:p-0"
                style={{ opacity: arrastrando === i ? 0.45 : 1, cursor: 'grab' }}>

                <span {...manijaProps} className="order-first flex items-center"
                  style={{ ...manijaProps.style, color: 'var(--muted)', padding: '10px 8px', margin: '-10px -4px -10px -8px', flexShrink: 0 }}>
                  <GripVertical size={16} strokeWidth={2} />
                </span>

                <label className="order-2 w-full lg:w-[140px] lg:flex-shrink-0">
                  <span className="lg:hidden text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Piso</span>
                  <Inp value={u.piso} onChange={v => editar(i, { piso: v })} placeholder="3, 701, 23 a 25" />
                </label>

                <label className="order-3 w-full lg:w-[120px] lg:flex-shrink-0">
                  <span className="lg:hidden text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>m²</span>
                  {/* '' ⇒ null, no 0. Ver la nota del componente. */}
                  <Inp type="number" value={u.m2 ?? ''} onChange={v => editar(i, { m2: v.trim() === '' ? null : Number(v) })} placeholder="Por confirmar" />
                </label>

                <label className="order-4 w-full lg:flex-1">
                  <span className="lg:hidden text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Nota</span>
                  <Inp value={u.nota || ''} onChange={v => editar(i, { nota: v || undefined })} placeholder="Opcional" />
                </label>

                <button data-orden-quieto="" className="order-last text-sdm-sm min-h-[44px] px-2 lg:min-h-0 lg:px-0 lg:w-[70px] lg:text-right"
                  onClick={() => onChanged(items.filter((_, j) => j !== i))}
                  style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          <div className="text-sdm-sm" style={{ color: 'var(--muted)', marginBottom: 12 }}>
            {items.length} {items.length === 1 ? 'unidad' : 'unidades'} · {totalM2.toLocaleString('es-CL')} m²
            {conSuperficie.length < items.length && ` · ${items.length - conSuperficie.length} por confirmar`}
          </div>
        </>
      )}

      <button className="text-sdm-xs tracking-sdm-wide min-h-[44px] lg:min-h-0"
        onClick={() => onChanged([...items, { piso: '', m2: null }])}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--navy-dark)', color: '#fff',
          padding: '9px 20px', borderRadius: 2, border: 'none', cursor: 'pointer', fontWeight: 600,
          textTransform: 'uppercase', fontFamily: 'inherit' }}>
        <Plus aria-hidden="true" size={14} strokeWidth={2} />Agregar unidad
      </button>

      <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginTop: 8 }}>
        Solo para edificios que se arriendan por piso. Si la lista queda vacía, la
        ficha no dibuja el desglose.
      </p>
    </div>
  )
}

// Máximo de fotos por propiedad. Es deliberado y estaba escrito cuatro veces a
// mano en este archivo; acá vive una sola vez. No hay otro tope en el camino:
// `subirImagen.ts` y `functions/api/subir.js` limitan el LADO de la imagen
// (1920 px), no cuántas se suben.
const MAX_FOTOS = 20

// ─── PROP IMAGE MANAGER ───────────────────────────────────────────────────────
function PropImageManager({
  imagenes, imagenPrincipal, onChange,
}: {
  imagenes: string[]
  imagenPrincipal: string
  onChange: (imagenes: string[], principal: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState('')

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.72)
      }
      img.src = url
    })

const upload = async (files: FileList) => {
    // El navegador no puede evitar que se seleccionen de más: <input type="file">
    // tiene `multiple` y `accept`, pero HTML no define ningún atributo de cantidad
    // máxima. Así que se avisa acá, ANTES de subir, y con el conteo real.
    //
    // Antes esto hacía `.slice(0, 20 - imagenes.length)` a secas: si elegías 25
    // con 0 cargadas, cinco se descartaban en silencio y quedabas creyendo que
    // habías subido 25.
    const cupo = MAX_FOTOS - imagenes.length
    const elegidas = Array.from(files)

    if (cupo <= 0) {
      alert(`Esta propiedad ya tiene las ${MAX_FOTOS} fotos. Elimina alguna antes de subir más.`)
      return
    }
    if (elegidas.length > cupo) {
      alert(
        `Seleccionaste ${elegidas.length} fotos y ${cupo === 1 ? 'queda 1 cupo' : `quedan ${cupo} cupos`}. ` +
        `${cupo === 1 ? 'Se subirá la primera' : `Se subirán las primeras ${cupo}`}. ` +
        `El máximo es ${MAX_FOTOS} por propiedad.`
      )
    }

    setUploading(true)
    const newUrls: string[] = []
    const list = elegidas.slice(0, cupo)
    for (let idx = 0; idx < list.length; idx++) {
      const file = list[idx]
      setProgress(`Subiendo ${idx + 1}/${list.length}…`)
      const r = await subirImagen(file, 'propiedades')
      if (r) newUrls.push(r.url)
    }
    const next = [...imagenes, ...newUrls]
    onChange(next, imagenPrincipal || next[0] || '')
    setUploading(false)
    setProgress('')
  }

  const remove = (i: number) => {
    const next = imagenes.filter((_, idx) => idx !== i)
    const newPrincipal = imagenPrincipal === imagenes[i] ? (next[0] || '') : imagenPrincipal
    onChange(next, newPrincipal)
  }

  const setPrincipal = (url: string) => onChange(imagenes, url)

  // `imagenes` es controlada por el formulario, no hay estado local. El ref se
  // actualiza en el acto ademas de en el render: si dos movimientos del puntero
  // caen en el mismo frame, React los agrupa y sin esto el segundo partiria del
  // orden viejo y se comeria el primero.
  const actuales = useRef(imagenes)
  actuales.current = imagenes
  const aplicarOrden: Dispatch<SetStateAction<string[]>> = accion => {
    const next = typeof accion === 'function' ? accion(actuales.current) : accion
    actuales.current = next
    onChange(next, imagenPrincipal || next[0] || '')
  }

  // Sin trabajo al soltar: cada paso del reordenamiento en vivo ya paso por
  // onChange, que es como esta lista llega al formulario.
  const { arrastrando, filaProps, manijaProps } = usePointerSort(imagenes, aplicarOrden, () => {})

  return (
    <div>
      {imagenes.length > 0 && (
        <div className="text-sdm-sm" style={{ color: 'var(--navy-dark)', background: 'var(--sky-pale)', border: '1px solid var(--sky)', borderRadius: 4, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span>Haz clic en <strong>"Portada"</strong> debajo de la foto que quieres como imagen principal.</span>
        </div>
      )}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
          {imagenes.map((url, i) => (
            <div key={url + i}>
              <div
                {...filaProps(i)}
                style={{
                  opacity: arrastrando === i ? 0.45 : 1,
                  position: 'relative', aspectRatio: '4/3', borderRadius: 3,
                  overflow: 'hidden', cursor: 'grab',
                  border: url === imagenPrincipal ? '3px solid var(--green)' : '2px solid var(--border)',
                  boxShadow: url === imagenPrincipal ? '0 0 0 2px rgba(61,170,110,0.25)' : 'none',
                }}
              >
                <img src={thumbUrl(url)} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {url === imagenPrincipal && (
                  <div className="text-sdm-xs tracking-sdm-wide" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--green-dark)', color: '#fff', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Star size={11} strokeWidth={2} />PORTADA
                  </div>
                )}
                <div {...manijaProps} style={{ ...manijaProps.style, position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.45)', borderRadius: '0 3px 0 2px', padding: '8px 10px', display: 'flex' }}>
                  <svg width="7" height="10" viewBox="0 0 7 10" fill="white" opacity="0.7">
                    <circle cx="1.5" cy="1.5" r="1.2"/><circle cx="5.5" cy="1.5" r="1.2"/>
                    <circle cx="1.5" cy="5" r="1.2"/><circle cx="5.5" cy="5" r="1.2"/>
                    <circle cx="1.5" cy="8.5" r="1.2"/><circle cx="5.5" cy="8.5" r="1.2"/>
                  </svg>
                </div>
                <button className="text-sdm-sm"
                  onClick={() => remove(i)}
                  title="Eliminar foto"
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(226,75,74,0.9)', border: 'none', borderRadius: 2, color: '#fff', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                ><X aria-hidden="true" size={14} strokeWidth={2} /></button>
              </div>
              <button className={`text-sdm-xs tracking-sdm-wide ${url === imagenPrincipal ? 'bg-[var(--green-dark)] text-white' : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--sky)] hover:text-[var(--navy-dark)]'}`}
                onClick={() => setPrincipal(url)}
                style={{ width: '100%', marginTop: 4, padding: '5px 0', fontWeight: 600,
                  border: 'none', borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                {url === imagenPrincipal ? <><Star aria-hidden="true" size={11} strokeWidth={2} />Portada</> : 'Portada'}
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Con el cupo lleno el botón desaparecía y no quedaba dicho por qué.
          Ahora en su lugar va el motivo. */}
      {imagenes.length >= MAX_FOTOS && (
        <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
          Esta propiedad ya tiene las {MAX_FOTOS} fotos. Elimina alguna antes de subir más.
        </p>
      )}
      {imagenes.length < MAX_FOTOS && (
        <label className="text-sdm-xs tracking-sdm-wide" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: uploading ? 'var(--muted)' : 'var(--navy-dark)', color: '#fff', padding: '9px 20px', borderRadius: 2, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>
          {uploading ? (progress || 'Procesando…') : `+ Agregar fotos (${imagenes.length}/${MAX_FOTOS})`}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploading}
            onChange={e => { if (e.target.files?.length) upload(e.target.files) }} />
        </label>
      )}
      <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
        Máximo {MAX_FOTOS} fotos · Arrastra para reordenar · <Star size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-0.2em' }} /> para elegir la imagen principal (borde verde) · <X size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-0.2em' }} /> para eliminar
      </p>
    </div>
  )
}

// ─── PROPIEDADES ──────────────────────────────────────────────────────────────
// ─── Ver la ficha publicada ───────────────────────────────────────────────────
//
// Enlaza SIEMPRE por slug, nunca por id: el sitio redirige de UUID a slug, así
// que enlazar por id agrega un salto que no hace falta.
//
// TRES ESTADOS, y los tres importan:
//
//   · sin slug   → no se dibuja nada. El slug se calcula al GUARDAR
//     (`editing.slug || slugify(...)` en `save`), así que una propiedad que se
//     está creando todavía no lo tiene y el enlace apuntaría a la nada.
//
//   · pausada    → botón deshabilitado, con el motivo escrito. La ficha pública
//     NO existe para un visitante: el RLS restringe el SELECT anónimo a
//     `activo IS TRUE`. Comprobado con la clave anon: 0 filas con activo=false
//     y la consulta directa devuelve []. Llevar a «Propiedad no encontrada»
//     sería peor que no ofrecer el botón.
//
//     Se deshabilita y NO se oculta porque ocultarlo deja a quien vio el botón
//     en las otras filas preguntándose adónde se fue. `aria-disabled` en vez de
//     `disabled`: un botón `disabled` no recibe foco, y entonces la explicación
//     de por qué no se puede queda fuera del alcance del teclado — que es justo
//     a quien más le hace falta.
//
//   · publicada  → enlace normal a /propiedades/<slug>.
//
// El nombre accesible lleva el título de la propiedad y avisa de la pestaña
// nueva: en la lista hay uno de estos por fila y «Ver» a secas no distingue
// ninguno de otro.
function VerPublicada({ prop, conTexto = false }: { prop: Partial<Propiedad>; conTexto?: boolean }) {
  if (!prop.slug) return null

  const titulo = prop.titulo || 'esta propiedad'
  const icono = <ExternalLink aria-hidden="true" size={15} strokeWidth={2} />
  // Sus vecinos —Editar, Eliminar— son texto y traen caja de sobra; este en la
  // lista es solo el icono y se quedaba en 15×15. `min-w` le da cuerpo sin
  // mover nada: 44 en móvil y 24 en escritorio, que es el mínimo de 2.5.8.
  //
  // No se usa `.area-44` a propósito: su `::after` mide 44 centrados, y con los
  // 12px de separación que hay en lg se metería ~2,5px por debajo de «Editar».
  // El área invisible robaría clics del botón vecino, que es exactamente el
  // problema que ya documentó `.area-44--arriba`.
  const clases = conTexto
    ? 'text-sdm-sm min-h-[44px] px-1 inline-flex items-center gap-1.5 lg:min-h-0 lg:px-0'
    : 'text-sdm-sm min-h-[44px] min-w-[44px] px-1 inline-flex items-center justify-center gap-1.5 lg:min-h-[24px] lg:min-w-[24px] lg:px-0'
  const base = {
    background: 'none', border: 'none', fontFamily: 'inherit',
    fontWeight: 500, whiteSpace: 'nowrap' as const, textDecoration: 'none',
  }

  if (prop.activo === false) {
    return (
      <button
        type="button"
        className={clases}
        aria-disabled="true"
        title="Esta propiedad está pausada, así que no aparece en el sitio. Actívala para poder verla publicada."
        aria-label={`Ver ficha publicada de ${titulo}: no disponible porque la propiedad está pausada`}
        onClick={e => { e.preventDefault(); e.stopPropagation() }}
        onMouseDown={e => e.stopPropagation()}
        style={{ ...base, color: 'var(--muted)', cursor: 'not-allowed' }}
      >
        {icono}{conTexto && 'Ver publicada'}
      </button>
    )
  }

  return (
    <a
      href={`/propiedades/${prop.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={clases}
      aria-label={`Ver ficha publicada de ${titulo} (se abre en una pestaña nueva)`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      style={{ ...base, color: 'var(--navy)', cursor: 'pointer' }}
    >
      {icono}{conTexto && 'Ver publicada'}
    </a>
  )
}

function slugify(titulo: string, comuna?: string, dormitorios?: number) {
  const base = `${titulo}-${comuna || ''}${dormitorios ? `-${dormitorios}d` : ''}`
  return base
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Para nombrar en la etiqueta la columna que está apagando el arrastre.
const ENCABEZADO_ORDEN: Record<string, string> = { tipo: 'Tipo', estado: 'Estado', precio_uf: 'Precio' }

// Enlace a la pestaña Contenido. Las pestañas del admin son estado de React en
// `AdminPage`, no rutas, así que el salto viaja como callback. Si no llega
// —montado suelto, en una prueba— degrada a texto y no deja un enlace muerto.
function EnlaceContenido({ onIr }: { onIr?: () => void }) {
  if (!onIr) return <strong>Contenido</strong>
  return (
    <button type="button" onClick={onIr} className="text-sdm-sm"
      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700,
        color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer' }}>
      Contenido
    </button>
  )
}

// Cómo se llama, en la etiqueta, el modo de orden del catálogo que hay puesto.
// Espejo de las opciones de Contenido → «¿Cómo se ordenan las propiedades?».
const MODO_CATALOGO: Record<string, string> = {
  precio_alto: 'por precio, de mayor a menor',
  precio_bajo: 'por precio, de menor a mayor',
  aleatorio:   'al azar en cada visita',
}


// Confirmación de guardado, SOLO para propiedades.
//
// Los otros trece paneles siguen con la píldora «Guardado correctamente», que se
// va sola a los 2500 ms. Acá se pidió un diálogo que haya que aceptar: una
// propiedad es la ficha que sale publicada, y confirmar que se guardó vale más
// que no interrumpir.
//
// Diálogo propio y no `alert()`: el nativo no se puede estilar, no respeta el
// sistema y en algunos navegadores bloquea el hilo. Usa el mismo par de hooks
// que los cinco modales del sitio — `useDialogoModal` da Escape, foco atrapado y
// foco devuelto al disparador; `useBloquearScroll` evita que el fondo se mueva y
// devuelve la posición al cerrar.
function DialogoGuardado({ onClose }: { onClose: () => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  useDialogoModal(true, caja, onClose)
  useBloquearScroll(true)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={tituloId}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,37,53,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div ref={caja} tabIndex={-1} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 4, padding: '36px 32px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 12px 40px rgba(15,37,53,0.22)' }}>
        <CheckCircle2 aria-hidden="true" size={44} strokeWidth={1.5} style={{ color: 'var(--green-dark)', margin: '0 auto 16px' }} />
        <h2 id={tituloId} className="font-serif font-light text-sdm-2xl" style={{ color: 'var(--navy-dark)', marginBottom: 8 }}>
          Excelente
        </h2>
        <p className="text-sdm-base" style={{ color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>
          Propiedad guardada con éxito.
        </p>
        {/* `autoFocus` para que Enter cierre sin buscar nada, y 44px de alto. */}
        <button autoFocus onClick={onClose} className="btn-primary"
          style={{ minHeight: 44, minWidth: 120, justifyContent: 'center' }}>
          OK
        </button>
      </div>
    </div>
  )
}

// Aviso discreto: la portada no tiene su versión Open Graph (1200×630) en R2. Sin ella, el enlace de la
// propiedad pegado en WhatsApp o Facebook puede salir sin imagen (WhatsApp descarta las de más de ~300 KB).
// Las fotos subidas desde el panel la generan solas (`subirImagen.ts`): esto cubre las que ya existían y las
// que se subieron por otra vía. NO bloquea nada.
//
// Se comprueba con un <img> y no con `fetch`: el bucket no manda CORS, así que un HEAD desde el panel no
// dejaría leer el estado, mientras que un <img> carga (o falla) sin CORS.
function AvisoOg({ portada }: { portada?: string }) {
  const [estado, setEstado] = useState<'comprobando' | 'ok' | 'falta'>('comprobando')
  const clave = portada ? claveOg(portada) : ''
  useEffect(() => {
    if (!clave) return
    let vivo = true
    setEstado('comprobando')
    const img = new Image()
    img.onload = () => { if (vivo) setEstado('ok') }
    img.onerror = () => { if (vivo) setEstado('falta') }
    img.src = `https://imagenes.sdmcapital.cl/${clave}`
    return () => { vivo = false; img.onload = null; img.onerror = null }
  }, [clave])
  if (!clave || estado !== 'falta') return null
  return (
    <div role="status" className="text-sdm-sm" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, padding: '10px 14px', background: 'var(--off)', borderLeft: '3px solid var(--muted)', color: 'var(--navy-dark)' }}>
      <ImageOff aria-hidden="true" size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        Falta la imagen de vista previa de esta portada (<code>{clave}</code>): al compartir el enlace en WhatsApp o Facebook puede salir sin foto.
        Sube la portada de nuevo, o corre <code>python3 scripts/generar-og-imagenes.py</code>.
      </span>
    </div>
  )
}

export default function Propiedades({ onIrAContenido }: { onIrAContenido?: () => void } = {}) {
  const [items, setItems]         = useState<Propiedad[]>([])
  const [guardado, avisarGuardado] = useGuardado()
  const [guardadaOk, setGuardadaOk] = useState(false)
  // A DÓNDE VA EL FOCO AL CERRAR EL DIÁLOGO.
  //
  // `useDialogoModal` lo devuelve al elemento que lo abrió, pero acá ese
  // elemento ya no existe: `save()` hace `setEditing(null)` y el formulario
  // entero —con su botón «Guardar»— se desmonta antes de que el diálogo aparezca.
  // Sin esto el foco terminaba en el <body> y quien navega con teclado perdía
  // el sitio por completo.
  //
  // Se manda a «Nueva propiedad», que es la acción siguiente natural y está
  // justo encima de la lista que se acaba de actualizar.
  const botonNueva = useRef<HTMLButtonElement>(null)
  const [editing, setEditing]     = useState<Partial<Propiedad> | null>(null)
  const [saving, setSaving]       = useState(false)
  // UN SOLO ESTADO PARA LAS DOS MITADES DEL ORDEN, y no dos `useState`.
  //
  // El ciclo tiene tres pasos —asc → desc → sin ordenar— y el siguiente depende
  // de los dos valores a la vez. Con estados separados, `toggleSort` tenía que
  // leer `sortDir` de la clausura: dos clics dentro del mismo tick veían el
  // mismo valor viejo y el ciclo se quedaba atascado en «desc», sin poder
  // volver a la lista sin ordenar. Con uno solo, el actualizador funcional ve
  // siempre el estado real y el ciclo cierra pase lo que pase.
  type Orden = { field: 'tipo'|'estado'|'precio_uf'; dir: 'asc'|'desc' }
  const [sort, setSort] = useState<Orden | null>(null)
  const sortField = sort?.field ?? null
  const sortDir   = sort?.dir ?? 'asc'
  const [showInactive, setShowInactive] = useState(false)
  // Para poder avisar cuando el orden que se está fijando no se está aplicando.
  const { get: getContenido } = useContenido()
  const modoCatalogo = getContenido('catalogo_orden', 'manual')

  // ORDENA POR `orden`, que es el campo que el arrastre escribe. Antes cargaba
  // por `created_at`, así que aunque se guardara el orden nuevo la lista volvía
  // a saltar al recargar: escribir `orden` sin esto no se nota.
  //
  // `created_at` queda de desempate para las que todavía tengan `orden` en NULL
  // —hoy 32 de 65—, que con `nullsFirst: false` caen al final en el mismo orden
  // de siempre en vez de barajarse. Al primer arrastre dejan de existir.
  const load = () => supabase.from('propiedades').select('*')
    .order('orden', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .then(({ data }) => setItems(data || []))
  useEffect(() => { load() }, [])

  // Tres estados y no dos: ascendente → descendente → SIN ORDENAR.
  //
  // Antes alternaba asc/desc para siempre y no había forma de volver a la lista
  // sin ordenar salvo recargar la página. Daba igual mientras el orden por
  // columna fuera solo una vista; ahora que apaga el arrastre —y con él la
  // única forma de fijar el orden del catálogo—, quedarse atrapado en una
  // columna ordenada sería dejar la pantalla sin su función principal.
  const toggleSort = (field: NonNullable<typeof sortField>) => {
    setSort(prev => {
      if (prev?.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return null
    })
  }

  const toggleActivo = async (p: Propiedad) => {
    const isCurrentlyActive = p.activo !== false
    const newVal = !isCurrentlyActive
    setItems(prev => prev.map(item => item.id === p.id ? { ...item, activo: newVal } : item))
    const { error } = await supabase.from('propiedades').update({ activo: newVal }).eq('id', p.id)
    // El cambio se pinta antes de confirmar; si la base lo rechaza hay que
    // devolver el interruptor a donde estaba o la pantalla queda mintiendo.
    if (avisarError('No se pudo cambiar la visibilidad de la propiedad', error)) {
      setItems(prev => prev.map(item => item.id === p.id ? { ...item, activo: isCurrentlyActive } : item))
    }
  }

  const { items: dragged, arrastrando, filaProps, manijaProps } = useDragSort(items, async (reordered) => {
    // SOLO `orden`. Este PATCH escribía además `destacada: i < 6`, y eso se fue.
    //
    // El Inicio no lee `destacada` salvo como respaldo: toma los IDs de la clave
    // `home_destacadas_ids` de `contenido_sitio`, que se administra en Contenido
    // → «Propiedades destacadas en el Inicio». Esa clave tiene seis IDs válidos,
    // así que el respaldo no corre nunca y lo que se escribía acá no cambiaba
    // nada de lo que ve el visitante.
    //
    // Lo que sí hacía era pisar en silencio los seis `destacada` que alguien
    // había puesto a mano. Se comprobó contra la base: las seis marcadas están
    // en las posiciones 0, 1, 2, 31, 32 y 52 por antigüedad, o sea que NO son
    // las primeras seis de ninguna lista — las eligió una persona, y cada
    // arrastre se las llevaba por delante.
    //
    // `orden` va en el mismo PATCH de siempre: los mismos 65 requests, uno por
    // fila. Es el patrón que ya siguen Equipo y Asociados.
    const updates = reordered.map((p, i) => supabase.from('propiedades').update({ orden: i + 1 }).eq('id', p.id))
    const fallo = (await Promise.all(updates)).find(r => r.error)
    // CORTA ANTES DEL `load()`. Antes avisaba y recargaba igual, y esa recarga
    // era la peor parte: los 65 PATCH no son una transacción, así que un fallo a
    // media lista deja unas filas con el orden nuevo y otras con el viejo. Al
    // recargar, la pantalla mostraba esa mezcla como si fuera el resultado
    // pedido, encima del aviso que acababa de decir que algo había fallado.
    //
    // Sin recargar, la lista se queda como la dejó el arrastre: no es lo que hay
    // en la base, pero es lo que la persona quiso, y le permite volver a
    // intentarlo soltando otra vez en vez de rearmar el orden desde cero.
    if (avisarError('No se pudo guardar el nuevo orden de las propiedades', fallo?.error ?? null)) return
    load()
  })

  const displayItems = [...dragged]
    .filter(p => showInactive ? true : p.activo !== false)
    .sort((a, b) => {
      if (!sortField) return 0
      const aVal = sortField === 'precio_uf' ? (a.precio_uf || 0) : a[sortField] || ''
      const bVal = sortField === 'precio_uf' ? (b.precio_uf || 0) : b[sortField] || ''
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // ── EL ÍNDICE QUE VE EL HOOK NO ES EL ÍNDICE DE LA FILA QUE VES ─────────────
  //
  // `useDragSort` guarda su estado sobre `dragged` —las 65 crudas— pero la tabla
  // pinta `displayItems`, que va filtrada y puede ir ordenada por una columna.
  // Hasta ahora `filaProps(i)` recibía el índice de `displayItems` y el hook lo
  // usaba para hacer `splice` sobre `dragged`: con una sola propiedad pausada
  // oculta, arrastrar movía la fila equivocada.
  //
  // Coincidían de casualidad —0 pausadas y `sortField` en `null`—, y el daño era
  // invisible porque lo único que se escribía era un `destacada` que el Inicio
  // no lee. En cuanto se escriba `orden`, el mismo error corrompe el catálogo.
  //
  // La traducción arregla el caso del FILTRO y es mejor que desactivar: se le
  // pasa al hook el índice de la fila dentro de SU array, así el `splice` cae
  // donde corresponde. Las filas ocultas no están en el DOM, así que tampoco
  // pueden ser destino; se quedan quietas y la que se arrastra aterriza justo
  // donde el usuario la soltó.
  const indiceEnDragged = new Map(dragged.map((p, i) => [p.id, i]))

  // La traducción NO alcanza para el ORDEN POR COLUMNA, y por eso ahí sí se
  // desactiva. El problema no es el índice sino que no hay nada que mirar:
  // `displayItems` se reordena por la columna DESPUÉS del arrastre, así que la
  // fila vuelve a su sitio en pantalla y el usuario no ve ningún movimiento —
  // mientras el `orden` sí se escribiría. Un arrastre sin respuesta visual que
  // igual persiste es peor que un arrastre que no arranca.
  const arrastreActivo = sortField === null

  const del = async (id: string) => {
    const nombre = items.find(p => p.id === id)?.titulo?.trim() || 'esta propiedad'
    if (!confirm(`¿Eliminar «${nombre}»? Se borra la ficha, sus fotos y sus dossiers. No se puede deshacer.`)) return
    const { error } = await supabase.from('propiedades').delete().eq('id', id)
    if (avisarError('No se pudo eliminar la propiedad', error)) return
    load()
  }

  const startEdit = (p: Propiedad) => {
    setEditing({
      ...p,
      activo:               p.activo !== false,
      bono_pie:             !!p.bono_pie,
      bono_pie_porcentaje:  p.bono_pie_porcentaje || 0,
      bodegas:              p.bodegas || 0,
      estado_conservacion:  p.estado_conservacion || '',
      comision_porcentaje:  p.comision_porcentaje ?? 2,
      etapa_construccion:   p.etapa_construccion || undefined,
      fecha_entrega:        p.fecha_entrega || '',
      avance_obra:          p.avance_obra ?? undefined,
      subsidios:            Array.isArray(p.subsidios) ? p.subsidios : [],
      dossiers:             normalizeDossiers(p.dossiers),
      mostrar_boton_reserva: p.mostrar_boton_reserva !== false,
    })
    setTimeout(() => {
      document.getElementById('prop-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const payload = {
      ...editing,
      activo:              editing.activo !== false,
      slug:                editing.slug || slugify(editing.titulo || '', editing.comuna, editing.dormitorios),
      bono_pie:            !!editing.bono_pie,
      bono_pie_porcentaje: editing.bono_pie_porcentaje ? Number(editing.bono_pie_porcentaje) : null,
      bodegas:             Number(editing.bodegas) || 0,
      estado_conservacion: editing.estado_conservacion || null,
      comision_porcentaje: Number(editing.comision_porcentaje ?? 2),
      etapa_construccion:  editing.etapa_construccion ?? null,
      fecha_entrega:       editing.fecha_entrega || null,
      avance_obra:         editing.avance_obra ?? null,
      subsidios:           editing.subsidios ?? [],
      // Lista vacía ⇒ NULL, y NUNCA `undefined`. supabase-js serializa con
      // JSON.stringify, que descarta las claves `undefined`: la columna
      // quedaría fuera del UPDATE y el array anterior sobreviviría. Vaciar la
      // lista tiene que borrarla de verdad.
      unidades:            editing.unidades?.length ? editing.unidades : null,
      // Solo dígitos y sin ceros iniciales (formato wa.me); vacío ⇒ NULL ⇒ el número global del sitio.
      whatsapp_numero:     (editing.whatsapp_numero || '').replace(/\D/g, '').replace(/^0+/, '') || null,
    }
    const { error } = editing.id
      ? await supabase.from('propiedades').update(payload).eq('id', editing.id)
      : await supabase.from('propiedades').insert([{ ...payload, imagenes: editing.imagenes || [], destacada: false, internacional: false, a_consultar: editing.a_consultar || false }])

    setSaving(false)
    if (avisarError('No se pudo guardar la propiedad', error)) return

    setGuardadaOk(true)
    setEditing(null)
    load()
  }

  const blank = (): Partial<Propiedad> => ({ titulo: '', descripcion: '', tipo: 'casa', estado: 'en_venta', categoria: 'usada', a_consultar: false, region: 'R. Metropolitana', comuna: '', pais: 'Chile', imagenes: [], destacada: false, internacional: false, activo: true, etapa_construccion: undefined, fecha_entrega: '', avance_obra: undefined, subsidios: [], dossiers: [], mostrar_boton_reserva: true })

  return (
    <div>
      <div className="flex flex-col items-start gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <div className="flex items-center gap-4"><h2 className="font-serif font-light text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>Propiedades</h2><Guardado visible={guardado} /></div>
        <button ref={botonNueva} className="btn-green" onClick={() => setEditing(blank())}><Plus aria-hidden="true" size={15} strokeWidth={2} /> Nueva propiedad</button>
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
          {arrastreActivo ? (
            <>
              <MousePointer2 size={14} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-0.2em' }} /> <strong>Arrastra</strong> las filas para fijar el orden del catálogo. Las destacadas del Inicio se eligen en <EnlaceContenido onIr={onIrAContenido} />.
              {/* EL AVISO SOLO APARECE CUANDO ES VERDAD.
                  El orden manual únicamente se aplica con `catalogo_orden` en
                  'manual', y hoy en producción está en 'precio_alto': se puede
                  arrastrar toda la tarde sin que el visitante vea un cambio.
                  Decirlo siempre sería mentir el día que alguien lo ponga en
                  Manual, así que se lee la clave y la línea desaparece sola. */}
              {MODO_CATALOGO[modoCatalogo] && (
                <><br /><span style={{ color: 'var(--error)' }}>Ojo:</span> el catálogo está ordenado <strong>{MODO_CATALOGO[modoCatalogo]}</strong>, así que este orden todavía no se aplica. Se cambia en <EnlaceContenido onIr={onIrAContenido} />.</>
              )}
            </>
          ) : (
            /* Con el arrastre apagado la etiqueta no puede seguir prometiéndolo:
               dice qué lo apagó y cómo volver a encenderlo. */
            <>Para reordenar, quita el orden por columna: pulsa <strong>{ENCABEZADO_ORDEN[sortField!]}</strong> hasta dejarla sin flecha.</>
          )}
        </p>
        <label className="flex items-center gap-2 text-sdm-sm" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Mostrar pausadas
        </label>
      </div>

      {/* `scrollMarginTop` CON EL TOKEN DEL ADMIN, no con el del sitio público.
          El `scrollIntoView` de más arriba alinea el borde de este formulario
          con el del viewport, y encima está el header del admin, que es
          `sticky` y mide `--admin-header-h` (80px). Sin esto, al abrir una
          propiedad para editarla el título del formulario quedaba tapado.

          NO se usa `--sdm-header-total`: ése vale 91px y describe el header
          PÚBLICO, que es `fixed` y tiene otra composición. Por eso la regla
          `scroll-padding-top` de `globals.css` está acotada a
          `html.ruta-publica` y el admin no la recibe.

          `--admin-header-h` lo declara `AdminPage` en su div raíz, así que la
          variable resuelve por herencia desde acá. */}
      {editing && (
        <div id="prop-edit-form" className="bg-white border border-[var(--border)] p-8 mb-10 rounded-sm"
          style={{ scrollMarginTop: 'var(--admin-header-h, 80px)' }}>
          {/* El enlace va junto al título del formulario: editando es cuando
              más se quiere comprobar cómo quedó. En una propiedad nueva no se
              dibuja —todavía no hay slug— y en una pausada sale deshabilitado
              con el motivo. Abre la versión GUARDADA, no lo que haya sin
              guardar en el formulario. */}
          <div className="flex items-center justify-between gap-6 mb-6 flex-wrap">
            <h3 className="font-serif font-light text-sdm-2xl" style={{ color: 'var(--navy-dark)' }}>{editing.id ? 'Editar propiedad' : 'Nueva propiedad'}</h3>
            {/* La fila GUARDADA, no `editing`, que es el borrador. El
                formulario trae su propio selector Activa/Pausada, y con el
                borrador el botón lo seguía en vivo: pasar a «Activa» sin
                guardar lo convertía en enlace hacia una ficha que la base
                todavía oculta — justo lo que el estado deshabilitado existe
                para evitar. Este botón abre lo PUBLICADO, así que lee lo
                publicado.

                El respaldo a `editing` cubre la propiedad nueva, que todavía no
                está en `items`; como tampoco tiene slug, sigue sin dibujarse. */}
            <VerPublicada prop={items.find(x => x.id === editing.id) ?? editing} conTexto />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Field label="Título"><Inp value={editing.titulo || ''} onChange={v => setEditing(p => ({ ...p, titulo: v }))} /></Field>
            <Field label="Tipo">
              <Sel value={editing.tipo || 'casa'} onChange={v => setEditing(p => ({ ...p, tipo: v as Propiedad['tipo'] }))}
                options={[{value:'casa',label:'Casa'},{value:'departamento',label:'Departamento'},{value:'oficina',label:'Oficina'},{value:'parcela',label:'Parcela'},{value:'comercial',label:'Comercial'},{value:'hotel',label:'Hotel'},{value:'terreno',label:'Terreno'}]} />
            </Field>
            <Field label="Categoría">
              <Sel value={editing.categoria || 'usada'} onChange={v => {
                if (v === 'proyecto_nuevo') {
                  setEditing(p => ({ ...p, categoria: v as Propiedad['categoria'], comision_porcentaje: 0 }))
                } else {
                  setEditing(p => ({ ...p, categoria: v as Propiedad['categoria'] }))
                }
              }}
                options={[{value:'usada',label:'Propiedad Usada'},{value:'proyecto_nuevo',label:'Proyecto Nuevo'}]} />
            </Field>
            {/* «Estado» a secas y no «Estado de venta»: el selector incluye
                «En arriendo» y «Arrendada», así que el rótulo contradecía sus
                propias opciones y hacía parecer que arriendo y venta eran el
                mismo eje. No colisiona con «Estado de publicación», que va
                calificado justo al lado. */}
            <Field label="Estado">
              <Sel value={editing.estado || 'en_venta'} onChange={v => setEditing(p => ({ ...p, estado: v as Propiedad['estado'] }))}
                options={[{value:'en_venta',label:'En venta'},{value:'en_arriendo',label:'En arriendo'},{value:'vendida',label:'Vendida'},{value:'reservada',label:'Reservada'},{value:'arrendada',label:'Arrendada'}]} />
            </Field>
            <Field label="Estado de publicación">
              <Sel
                value={editing.activo === false ? 'false' : 'true'}
                onChange={v => setEditing(p => ({ ...p, activo: v === 'true' }))}
                options={[
                  { value: 'true',  label: 'Activa — visible en el sitio' },
                  { value: 'false', label: 'Inactiva — oculta del sitio' },
                ]}
              />
            </Field>
            <Field label="Región">
              <select
                value={editing.region || ''}
                onChange={e => setEditing(p => ({ ...p, region: e.target.value, comuna: '' }))}
                className="input-line w-full text-sdm-base"
                style={{ fontFamily: 'inherit', color: 'var(--ink)', background: '#fff', border: 'none', borderBottom: '1px solid var(--border-input)', padding: '6px 0', cursor: 'pointer' }}
              >
                <option value="">Seleccionar región...</option>
                {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Comuna">
              <select
                value={editing.comuna || ''}
                onChange={e => setEditing(p => ({ ...p, comuna: e.target.value }))}
                disabled={!editing.region}
                className="input-line w-full text-sdm-base"
                style={{ fontFamily: 'inherit', color: editing.region ? 'var(--ink)' : 'var(--muted)', background: '#fff', border: 'none', borderBottom: '1px solid var(--border-input)', padding: '6px 0', cursor: editing.region ? 'pointer' : 'not-allowed' , opacity: editing.region ? 1 : 0.5 }}
              >
                <option value="">{editing.region ? 'Seleccionar comuna...' : 'Primero elige una región'}</option>
                {getComunas(editing.region || '').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="País"><Inp value={editing.pais || 'Chile'} onChange={v => setEditing(p => ({ ...p, pais: v }))} /></Field>
          </div>

          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14 }}>Precio</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Precio UF"><Inp type="number" value={editing.precio_uf || ''} onChange={v => setEditing(p => ({ ...p, precio_uf: Number(v) }))} placeholder="Ej: 3500" /></Field>
              <Field label="Precio CLP"><Inp type="number" value={editing.precio_clp || ''} onChange={v => setEditing(p => ({ ...p, precio_clp: Number(v) }))} placeholder="Ej: 120000000" /></Field>
              <Field label="Precio USD"><Inp type="number" value={editing.precio_usd || ''} onChange={v => setEditing(p => ({ ...p, precio_usd: Number(v) }))} placeholder="Opcional" /></Field>
            </div>
            <div className="mt-4 flex gap-6 flex-wrap">
              <Chk label="Precio a consultar" checked={!!editing.a_consultar} onChange={v => setEditing(p => ({ ...p, a_consultar: v }))} />
              <Chk label={<><ArrowDown size={14} strokeWidth={2} />Baja de precio</>} checked={!!editing.baja_precio} onChange={v => setEditing(p => ({ ...p, baja_precio: v }))} />
            </div>
            {editing.baja_precio && (
              <div className="mt-4">
                <Field label="Precio anterior UF (aparece tachado)">
                  <Inp type="number" value={editing.precio_anterior_uf || ''} onChange={v => setEditing(p => ({ ...p, precio_anterior_uf: Number(v) }))} placeholder="Ej: 4200" />
                </Field>
              </div>
            )}
          </div>

          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14 }}>Características</div>
            {/* `items-end`: los rótulos de esta fila envuelven a distinta
                cantidad de líneas según el ancho —«Superficie construida m²»
                ocupa tres líneas a 390px donde «Superficie total m²» ocupa dos—
                y sin esto los inputs quedaban a 16px de distancia. Pegando las
                celdas abajo comparten línea de base sea cual sea el alto del
                rótulo. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
              <Field label="Dormitorios"><Inp type="number" value={editing.dormitorios || ''} onChange={v => setEditing(p => ({ ...p, dormitorios: Number(v) }))} /></Field>
              <Field label="Baños"><Inp type="number" value={editing.banos || ''} onChange={v => setEditing(p => ({ ...p, banos: Number(v) }))} /></Field>
              <Field label="Superficie total m²"><Inp type="number" value={editing.superficie_total || ''} onChange={v => setEditing(p => ({ ...p, superficie_total: Number(v) }))} /></Field>
              <Field label="Superficie construida m²"><Inp type="number" value={editing.superficie_util || ''} onChange={v => setEditing(p => ({ ...p, superficie_util: Number(v) }))} /></Field>
              <Field label="Estacionamientos"><Inp type="number" value={editing.estacionamientos || ''} onChange={v => setEditing(p => ({ ...p, estacionamientos: Number(v) }))} placeholder="0" /></Field>
              <Field label="Bodegas"><Inp type="number" value={editing.bodegas || ''} onChange={v => setEditing(p => ({ ...p, bodegas: Number(v) }))} placeholder="0" /></Field>
              <Field label="Año construcción"><Inp type="number" value={editing.ano_construccion || ''} onChange={v => setEditing(p => ({ ...p, ano_construccion: Number(v) }))} placeholder="Ej: 2018" /></Field>
              <Field label="Estado conservación">
                <Sel value={editing.estado_conservacion || ''}
                  onChange={v => setEditing(p => ({ ...p, estado_conservacion: v as 'nuevo' | 'seminuevo' | '' }))}
                  options={[{value:'',label:'No especificado'},{value:'nuevo',label:'Nuevo'},{value:'seminuevo',label:'Seminuevo'}]} />
              </Field>
            </div>
          </div>

          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14 }}>Unidades disponibles</div>
            <UnidadesEditor
              items={editing.unidades || []}
              onChanged={items => setEditing(p => ({ ...p, unidades: items }))}
            />
          </div>

          {editing.categoria === 'proyecto_nuevo' && (
            <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
              <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14 }}>Información del Proyecto</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Etapa de construcción">
                  <Sel value={editing.etapa_construccion || ''}
                    onChange={v => setEditing(p => ({ ...p, etapa_construccion: v as Propiedad['etapa_construccion'] }))}
                    options={[
                      { value: '', label: 'Seleccionar...' },
                      { value: 'en_blanco', label: 'En Blanco' },
                      { value: 'en_verde', label: 'En Verde' },
                      { value: 'planos', label: 'En Planos' },
                      { value: 'inicio', label: 'Inicio de obras' },
                      { value: 'avanzado', label: 'Obra avanzada' },
                      { value: 'proxima_entrega', label: 'Próxima entrega' },
                      { value: 'entrega_inmediata', label: 'Entrega inmediata' },
                    ]} />
                </Field>
                <Field label="Fecha estimada de entrega">
                  <Sel value={editing.fecha_entrega || '2026'}
                    onChange={v => setEditing(p => ({ ...p, fecha_entrega: v }))}
                    options={FECHA_ENTREGA_OPTIONS} />
                </Field>
                <Field label="% Avance de obra">
                  <Sel value={editing.avance_obra !== undefined && editing.avance_obra !== null ? String(editing.avance_obra) : ''}
                    onChange={v => setEditing(p => ({ ...p, avance_obra: v === '' ? undefined : Number(v) }))}
                    options={AVANCE_OBRA_OPTIONS} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Subsidios aplicables">
                    <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '12px 16px', maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {SUBSIDIO_OPTIONS.map(opt => {
                        const selected = editing.subsidios || []
                        return (
                          <Chk key={opt.value} label={opt.label} checked={selected.includes(opt.value)}
                            onChange={checked => setEditing(p => {
                              const current = p?.subsidios || []
                              const next = checked ? [...current, opt.value] : current.filter(v => v !== opt.value)
                              return { ...p, subsidios: next }
                            })} />
                        )
                      })}
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} strokeWidth={2} />Ubicación en mapa</div>
            <MapPicker
              address={editing.map_address || ''}
              lat={editing.map_lat}
              lng={editing.map_lng}
              onUpdate={({ address, lat, lng }) => setEditing(p => ({ ...p, map_address: address, map_lat: lat, map_lng: lng }))}
            />
          </div>

          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 20 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} strokeWidth={2} />Comisión y Beneficios</div>
            {/* `items-end` EN LA FILA, no alturas fijas en los campos.
                La celda de la derecha lleva la casilla «Bono Pie» encima de su
                campo, así que es más alta que la de la izquierda. Con el
                `stretch` por defecto las dos celdas ocupaban toda la fila pero
                su contenido quedaba pegado arriba, y los dos inputs terminaban a
                31px de distancia.
                Con `items-end` cada celda se pega abajo: el input de cada una
                queda en el borde inferior de la fila y comparten línea de base.
                Aguanta que el rótulo envuelva o que la casilla crezca, porque no
                depende de ninguna altura escrita a mano.
                Va en ESTA fila y no en `Field`: hacerlo global empujaría los
                campos cortos al fondo en las filas donde conviven con un
                `<Txa>`, que hoy están bien alineadas. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <Field label="Comisión corredora (%)">
                <Inp type="number" value={editing.comision_porcentaje ?? 2}
                  onChange={v => setEditing(p => ({ ...p, comision_porcentaje: Number(v) }))} placeholder="2" />
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Chk label="Bono Pie" checked={!!editing.bono_pie}
                  onChange={v => setEditing(p => ({ ...p, bono_pie: v }))} />
                {editing.bono_pie && (
                  <Field label="% Bono Pie">
                    <Inp type="number" value={editing.bono_pie_porcentaje || ''}
                      onChange={v => setEditing(p => ({ ...p, bono_pie_porcentaje: Number(v) }))} placeholder="Ej: 10" />
                  </Field>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <FieldGroup label={`Galería de imágenes (hasta ${MAX_FOTOS} fotos)`}>
              <PropImageManager
                imagenes={editing.imagenes || []}
                imagenPrincipal={editing.imagen_principal || ''}
                onChange={(imagenes, principal) => setEditing(p => ({ ...p, imagenes, imagen_principal: principal }))}
              />
            </FieldGroup>
            <AvisoOg portada={editing.imagen_principal || editing.imagenes?.[0]} />
          </div>

          <div className="mb-6">
            <Field label={<><Youtube size={14} strokeWidth={2} />Link de YouTube</>}>
              <Inp
                value={editing.youtube_url || ''}
                onChange={v => setEditing(p => ({ ...p, youtube_url: v }))}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </Field>
          </div>

          <div className="mb-6">
            <Field label="WhatsApp de esta ficha (opcional)">
              <Inp
                value={editing.whatsapp_numero || ''}
                onChange={v => setEditing(p => ({ ...p, whatsapp_numero: v }))}
                placeholder="595992955053 — vacío = el número del sitio"
              />
              <div className="text-sdm-xs" style={{ color: 'var(--muted)', marginTop: 4 }}>
                Solo para el botón «Consultar por WhatsApp» de esta ficha. Con código de país y sin «+», espacios ni ceros iniciales: se limpia al guardar.
              </div>
            </Field>
          </div>

          <div className="mb-6 bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px' }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><File size={14} strokeWidth={2} />Dossiers / Fichas técnicas</div>
            <DossierUploader
              items={editing.dossiers || []}
              onChanged={items => setEditing(p => ({ ...p, dossiers: items }))}
            />
          </div>

          <div className="mb-6 bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px' }}>
            {/* El rótulo decía «botón de pago Flow». Flow está desactivado
                desde `c737689`: el botón abre `ReservaModal`, que cobra por
                transferencia. */}
            <Chk label="Mostrar botón «Reservar esta propiedad»"
              checked={editing.mostrar_boton_reserva !== false}
              onChange={v => setEditing(p => ({ ...p, mostrar_boton_reserva: v }))} />
          </div>

          <div className="mb-6">
            <FieldGroup label="Descripción">
              <RichTextEditor
                value={editing.descripcion || ''}
                onChange={v => setEditing(p => ({ ...p, descripcion: v }))}
              />
            </FieldGroup>
          </div>

          <div className="flex gap-3">
            <SaveBtn onClick={save} loading={saving} />
            <button onClick={() => setEditing(null)} className="btn-primary" style={{ background: 'var(--muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Un solo arbol de markup. Debajo de lg la tabla pasa a bloques y cada
          <tr> a flex-wrap, asi sus <td> se vuelven flex items que se reordenan
          con order-* y se dimensionan con w-full, sin envolverlos en nada. De
          lg para arriba vuelve a table-row / table-cell, identica a como
          estaba. Sin display:contents y sin doble render. */}
      <div className="lg:overflow-x-auto">
        <table className="w-full border-collapse block lg:table">
          <thead className="hidden lg:table-header-group">
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[
                { label: '', field: null },
                { label: '#', field: null },
                { label: 'Propiedad', field: null },
                { label: 'Tipo', field: 'tipo' },
                { label: 'Estado', field: 'estado' },
                { label: 'Precio', field: 'precio_uf' },
                { label: 'País', field: null },
                { label: 'Activo', field: null },
                { label: 'Acciones', field: null },
              ].map(({ label, field }) => (
                // El <th> deja de ser clicable: quien ordena es un <button>
                // dentro, que es el patrón correcto para una cabecera
                // ordenable. El `aria-sort` va en el <th> con su valor real,
                // para que un lector anuncie por qué columna está ordenada la
                // tabla y en qué sentido.
                <th key={label} className="text-left pb-3 pr-4 text-sdm-xs tracking-sdm-wide"
                  aria-sort={!field ? undefined : sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ textTransform: 'uppercase', color: field ? 'var(--navy)' : 'var(--muted)', fontWeight: 400, userSelect: 'none', whiteSpace: 'nowrap' }}
                >
                  {field ? (
                    <button type="button" onClick={() => toggleSort(field as typeof sortField)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit', color: 'inherit', textTransform: 'uppercase' }}>
                      {label}{sortField === field ? (sortDir === 'asc' ? <ArrowUp aria-hidden="true" size={14} strokeWidth={2} /> : <ArrowDown aria-hidden="true" size={14} strokeWidth={2} />) : <ArrowUpDown aria-hidden="true" size={14} strokeWidth={2} />}
                    </button>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block lg:table-row-group">
            {displayItems.map((p, i) => {
              // El índice del hook, no el de la fila pintada. Ver el comentario
              // largo junto a `indiceEnDragged`.
              const idx = indiceEnDragged.get(p.id) ?? i
              return (
              <tr
                key={p.id}
                {...(arrastreActivo ? filaProps(idx) : {})}
                className="flex flex-wrap items-center gap-y-0.5 rounded-sm border border-[var(--border)] p-3 mb-2 lg:table-row lg:rounded-none lg:border-0 lg:p-0 lg:mb-0"
                style={{ borderBottom: '1px solid var(--border)', cursor: arrastreActivo ? 'grab' : 'default', opacity: arrastrando === idx ? 0.45 : p.activo === false ? 0.5 : 1, background: p.activo === false ? '#fff8f8' : 'transparent' }}
              >
                {/* Debajo de lg la manija es una franja propia arriba de la
                    tarjeta: la fila es flex-wrap y la celda del titulo lleva
                    w-full, asi que cualquier order la empuja a su propia linea.
                    Con el arrastre desactivado la manija no se dibuja: un asa
                    que no agarra nada es peor que ninguna. */}
                <td className="order-first lg:table-cell lg:py-3 lg:pr-2" style={{ color: 'var(--muted)' }}>
                  {arrastreActivo && (
                    <span {...manijaProps} className="flex items-center" style={{ ...manijaProps.style, padding: '8px 10px', margin: '-8px -10px' }}>
                      <GripVertical size={16} strokeWidth={2} />
                    </span>
                  )}
                </td>
                {/* El numero de orden a secas es ruido en movil: no se puede
                    reordenar desde el telefono, asi que solo se ve desde lg.
                    Aqui vivia ademas la estrella verde de las 6 primeras con un
                    «aparece en el Inicio»: repetia la misma promesa falsa que la
                    etiqueta, porque el Inicio toma sus destacadas de la lista de
                    Contenido y no de esta posicion. */}
                <td className="hidden lg:table-cell lg:grow-0 lg:py-3 lg:pr-4">
                  <span className="hidden lg:inline text-sdm-sm" style={{ fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</span>
                </td>
                <td className="block w-full order-1 lg:table-cell lg:w-auto lg:py-3 lg:pr-4">
                  <div className="flex items-center gap-3">
                    {(p.imagen_principal || p.imagenes?.[0])
                      ? <img src={thumbUrl(p.imagen_principal || p.imagenes[0])} alt="" loading="lazy" decoding="async" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                      : <div className="w-10 h-10 rounded flex-shrink-0" style={{ background: 'var(--navy)', opacity: 0.3 }} />
                    }
                    <div>
                      <div style={{ fontWeight: 500 }} className="lg:max-w-[220px] lg:truncate text-sdm-base">{p.titulo}</div>
                      <div className="text-sdm-sm" style={{ color: 'var(--muted)' }}>{p.comuna}</div>
                    </div>
                  </div>
                </td>
                <td className="order-2 text-sdm-sm lg:table-cell lg:py-3 lg:pr-4" style={{ color: 'var(--muted)' }}>{p.tipo}</td>
                <td className="order-6 lg:table-cell lg:py-3 lg:pr-4"><Badge label={p.estado.replace('_',' ')} color={p.estado==='en_venta'?'var(--navy-dark)':p.estado==='en_arriendo'?'var(--green)':p.estado==='vendida'?'var(--estado-vendida)':p.estado==='reservada'?'var(--estado-reservada)':p.estado==='arrendada'?'var(--estado-arrendada)':'#999'} /></td>
                <td className="order-5 grow text-sdm-xl font-medium lg:table-cell lg:grow-0 lg:text-sdm-base lg:font-normal lg:py-3 lg:pr-4">{p.a_consultar ? 'Consultar' : p.precio_uf ? `UF ${p.precio_uf.toLocaleString('es-CL')}` : p.precio_clp ? `$${p.precio_clp.toLocaleString('es-CL')}` : p.precio_usd ? `USD ${p.precio_usd}` : '—'}</td>
                <td className="order-3 grow lg:table-cell lg:grow-0 lg:py-3 lg:pr-4"><span className="lg:hidden" aria-hidden> · </span><span aria-hidden="true">{p.internacional ? '🌐' : '🇨🇱'}</span><span className="sr-only">{p.internacional ? 'Internacional' : 'Chile'}</span></td>
                {/* El toggle lleva flex-1 para que su borde superior se estire hasta
                    encontrarse con el de las acciones: entre los dos dibujan una
                    sola linea continua sin necesidad de un contenedor. */}
                <td className="flex-1 order-7 mt-2 pt-2 border-t border-[var(--border)] lg:table-cell lg:mt-0 lg:pt-0 lg:border-t-0 lg:py-3 lg:pr-4" data-orden-quieto="">
                  <button className="text-sdm-sm min-h-[44px] lg:min-h-0"
                    aria-pressed={p.activo !== false}
                    onClick={e => { e.stopPropagation(); e.preventDefault(); toggleActivo(p) }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onPointerDown={e => e.stopPropagation()}
                    style={{ background: p.activo === false ? 'var(--error-fondo)' : 'var(--admin-ok-fondo)', border: `1px solid ${p.activo === false ? 'var(--error)' : 'var(--admin-ok)'}`, borderRadius: 4, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', color: p.activo === false ? 'var(--error)' : 'var(--admin-ok)', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {p.activo === false ? <><Pause aria-hidden="true" size={14} strokeWidth={2} />Pausada</> : <><Check aria-hidden="true" size={14} strokeWidth={2} />Activa</>}
                  </button>
                </td>
                {/* pr-4 como el resto de las celdas: era la unica sin el, asi que
                    "Eliminar" quedaba pegado al borde del contenedor. El nowrap
                    evita que se parta. Es paliativo: el problema de fondo es que
                    la tabla desborda debajo de ~1100px de viewport, y eso se
                    resuelve con el rediseno a tarjetas apiladas que esta
                    pendiente. */}
                {/* Editar y Eliminar separados 24px y con 44px de alto tactil: en el
                    escritorio estaban a 12px, que en un telefono es un borrado por
                    accidente. En lg vuelven a los dos botones de texto de siempre. */}
                <td className="order-8 mt-2 pt-2 border-t border-[var(--border)] lg:table-cell lg:mt-0 lg:pt-0 lg:border-t-0 lg:py-3 lg:pr-4" data-orden-quieto="">
                  <div className="flex items-center justify-end gap-6 lg:justify-start lg:gap-3">
                    {/* El `data-orden-quieto` lo pone este mismo <td>, así que
                        el enlace no inicia arrastre — el hook lo busca con
                        `closest()`. El `stopPropagation` del mousedown va
                        igual, por consistencia con sus dos vecinos. */}
                    <VerPublicada prop={p} />
                    <button className="text-sdm-sm min-h-[44px] px-1 lg:min-h-0 lg:px-0" onClick={e => { e.stopPropagation(); startEdit(p) }} onMouseDown={e => e.stopPropagation()} style={{ color: 'var(--navy)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' }}>Editar</button>
                    <button className="text-sdm-sm min-h-[44px] px-1 lg:min-h-0 lg:px-0" onClick={e => { e.stopPropagation(); del(p.id) }} onMouseDown={e => e.stopPropagation()} style={{ color: 'var(--error)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            )})}
            {displayItems.length === 0 && <tr className="block lg:table-row"><td colSpan={9} className="block py-12 text-center text-sdm-base lg:table-cell" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sin propiedades. Crea la primera.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Solo aparece cuando el guardado SALIÓ BIEN: si falla, `save()` corta en
          `avisarError` y nunca llega a levantarlo. */}
      {guardadaOk && <DialogoGuardado onClose={() => { setGuardadaOk(false); botonNueva.current?.focus() }} />}
    </div>
  )
}
