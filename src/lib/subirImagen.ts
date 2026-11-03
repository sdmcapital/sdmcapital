// Subida de imágenes a R2 con el mismo pipeline que usó la migración.
//
//   original   lado mayor máx 1920, calidad 82, con regla de no-engordar
//   miniatura  lado mayor 400, calidad 80, bajo el prefijo thumbs/
//   og         1200×630 JPEG ≤ 250 KB, bajo el prefijo og/ (la vista previa de WhatsApp/Facebook)
//   todos      Cache-Control: public, max-age=31536000, immutable
//
// Reglas de formato (idénticas a la migración):
//   JPEG y PNG opaco    -> JPEG
//   PNG con alfa real   -> PNG
//   WebP                -> WebP
//   AVIF                -> tal cual (el navegador no sabe codificar AVIF);
//                          la miniatura sale en JPEG
//
// El procesado va en el navegador a propósito: los Workers no pueden correr
// sharp ni sips, y el costo lo asume quien sube (una persona del equipo), no
// el visitante.

import { supabase } from '@/lib/supabase'

const MAX_ORIGINAL = 1920
const MAX_MINIATURA = 400
const CALIDAD_ORIGINAL = 0.82
const CALIDAD_MINIATURA = 0.80

export type ResultadoSubida = { url: string; thumb: string | null; og?: string | null }

const extensionDe = (nombre: string) => (nombre.split('.').pop() || 'jpg').toLowerCase()

/** Nombre único con el mismo patrón que ya usaba el admin. */
export function nombreDestino(carpeta: string, archivo: File): string {
  const ext = extensionDe(archivo.name)
  return `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
}

/** ¿El navegador sabe codificar este tipo? */
async function soportaCodificar(tipo: string): Promise<boolean> {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, tipo))
    return Boolean(blob && blob.type === tipo)
  } catch {
    return false
  }
}

/** Detecta si la imagen usa transparencia real (algún píxel con alfa < 255). */
function usaTransparencia(bitmap: ImageBitmap): boolean {
  // Se muestrea a tamaño reducido: basta para saber si hay alfa, y evita
  // recorrer decenas de millones de bytes en fotos grandes.
  const lado = 256
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * escala))
  const h = Math.max(1, Math.round(bitmap.height * escala))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return true          // ante la duda, se conserva PNG
  ctx.drawImage(bitmap, 0, 0, w, h)
  const datos = ctx.getImageData(0, 0, w, h).data
  for (let i = 3; i < datos.length; i += 4) if (datos[i] < 255) return true
  return false
}

/** Redimensiona a `lado` como lado mayor y codifica. Sin ampliar nunca. */
async function render(bitmap: ImageBitmap, lado: number, tipo: string, calidad: number): Promise<Blob | null> {
  const mayor = Math.max(bitmap.width, bitmap.height)
  const escala = mayor > lado ? lado / mayor : 1
  const w = Math.round(bitmap.width * escala)
  const h = Math.round(bitmap.height * escala)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise<Blob | null>((r) => c.toBlob(r, tipo, calidad))
}


// ─── Versión Open Graph ──────────────────────────────────────────────────────
//
// 1200×630, JPEG ≤ 250 KB (WhatsApp descarta las imágenes de más de ~300 KB). MISMO CRITERIO QUE
// `scripts/generar-og-imagenes.py`, que se queda como herramienta de respaldo para reprocesar en lote:
//   · apaisada (ancho/alto ≥ 1,35): recorte «cover», centrado un poco hacia arriba (40 %);
//   · cuadrada o vertical: la foto ENTERA, centrada, sobre su propio fondo desenfocado (σ = 28 px) y
//     oscurecido al 55 % (una capa negra al 45 %: es el mismo producto en espacio sRGB que el
//     `Brightness(0.55)` de Pillow).
// Sin `ctx.filter` (Safari anterior a 18) el desenfoque se aproxima reduciendo la imagen a 1/24 y
// ampliándola con suavizado: no es una gaussiana, pero a esa escala y con la capa oscura no se nota.
const OG_ANCHO = 1200
const OG_ALTO = 630
const OG_MAX_BYTES = 250 * 1024
const OG_CALIDADES = [0.84, 0.80, 0.76, 0.72, 0.68, 0.64, 0.60]
const OG_UMBRAL_APAISADA = 1.35

export type ResultadoOg = { blob: Blob; calidad: number; modo: 'cover' | 'contain+fondo' }

function renderOg(bitmap: ImageBitmap): Promise<ResultadoOg | null> {
  const w = bitmap.width, h = bitmap.height
  const c = document.createElement('canvas')
  c.width = OG_ANCHO; c.height = OG_ALTO
  const ctx = c.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, OG_ANCHO, OG_ALTO)

  const cover = Math.max(OG_ANCHO / w, OG_ALTO / h)
  const cw = Math.round(w * cover), ch = Math.round(h * cover)
  let modo: ResultadoOg['modo']

  if (w / h >= OG_UMBRAL_APAISADA) {
    modo = 'cover'
    ctx.drawImage(bitmap, -Math.floor((cw - OG_ANCHO) / 2), -Math.round((ch - OG_ALTO) * 0.4), cw, ch)
  } else {
    modo = 'contain+fondo'
    // Fondo: la misma foto en «cover», con un poco de sobrante (4 %) para que el desenfoque no deje los
    // bordes transparentes, desenfocada y oscurecida.
    const fx = Math.round(cw * 1.04), fy = Math.round(ch * 1.04)
    const dx = Math.round((OG_ANCHO - fx) / 2), dy = Math.round((OG_ALTO - fy) / 2)
    const hayFiltro = typeof (ctx as { filter?: unknown }).filter === 'string'   // Safari < 18: undefined
    if (hayFiltro) {
      ctx.filter = 'blur(28px)'
      ctx.drawImage(bitmap, dx, dy, fx, fy)
      ctx.filter = 'none'
    } else {
      const chico = document.createElement('canvas')
      chico.width = Math.max(1, Math.round(fx / 24)); chico.height = Math.max(1, Math.round(fy / 24))
      const cctx = chico.getContext('2d')
      if (cctx) {
        cctx.imageSmoothingQuality = 'high'
        cctx.drawImage(bitmap, 0, 0, chico.width, chico.height)
        ctx.drawImage(chico, dx, dy, fx, fy)
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, OG_ANCHO, OG_ALTO)
    // Primer plano: la foto entera, a la altura del recuadro (o al ancho, si así cabe).
    let esc = OG_ALTO / h
    let fw = Math.round(w * esc), fh = OG_ALTO
    if (fw > OG_ANCHO) { esc = OG_ANCHO / w; fw = OG_ANCHO; fh = Math.round(h * esc) }
    ctx.drawImage(bitmap, Math.floor((OG_ANCHO - fw) / 2), Math.floor((OG_ALTO - fh) / 2), fw, fh)
  }

  // La calidad baja hasta que pesa ≤ 250 KB (misma escala que el script de Python).
  const intentar = async (): Promise<ResultadoOg | null> => {
    let ultimo: Blob | null = null
    for (const q of OG_CALIDADES) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', q))
      if (!blob) return null
      ultimo = blob
      if (blob.size <= OG_MAX_BYTES) return { blob, calidad: q, modo }
    }
    return ultimo ? { blob: ultimo, calidad: OG_CALIDADES[OG_CALIDADES.length - 1] as number, modo } : null
  }
  return intentar()
}

/**
 * Procesa y sube una imagen a R2. Devuelve las URLs públicas, o null si falló.
 * `onError`, si se pasa, recibe el mensaje real del fallo (el `error` que
 * devuelve `/api/subir`) para mostrarlo en pantalla; sin él solo se loguea.
 * `carpeta` es el prefijo dentro del bucket: 'propiedades', 'blog', 'hero'…
 */
export async function subirImagen(
  archivo: File,
  carpeta: string,
  rutaExacta?: string,
  onError?: (mensaje: string) => void,
): Promise<ResultadoSubida | null> {
  const ruta = rutaExacta || nombreDestino(carpeta, archivo)
  const ext = extensionDe(archivo.name)
  const esAvif = ext === 'avif' || archivo.type === 'image/avif'

  let blobOriginal: Blob = archivo
  let tipoOriginal = archivo.type || 'image/jpeg'
  let blobMiniatura: Blob | null = null
  let tipoMiniatura = 'image/jpeg'
  let blobOg: Blob | null = null

  try {
    const bitmap = await createImageBitmap(archivo)

    // ── formato de salida
    let tipoSalida = 'image/jpeg'
    if (esAvif) {
      tipoSalida = ''                                  // no se recodifica
    } else if (archivo.type === 'image/webp' && (await soportaCodificar('image/webp'))) {
      tipoSalida = 'image/webp'
    } else if (archivo.type === 'image/png' && usaTransparencia(bitmap)) {
      tipoSalida = 'image/png'                         // conservar el alfa
    }

    // ── original
    if (tipoSalida) {
      const calidad = tipoSalida === 'image/png' ? undefined : CALIDAD_ORIGINAL
      const salida = await render(bitmap, MAX_ORIGINAL, tipoSalida, calidad as number)
      const huboRedimension = Math.max(bitmap.width, bitmap.height) > MAX_ORIGINAL
      // No engordar: si no se redimensionó y el resultado no es más chico,
      // se sube el archivo tal como vino.
      if (salida && (huboRedimension || salida.size < archivo.size)) {
        blobOriginal = salida
        tipoOriginal = tipoSalida
      }
    }

    // ── miniatura (los AVIF la llevan en JPEG)
    const tipoThumb = tipoSalida === 'image/png' ? 'image/png'
      : tipoSalida === 'image/webp' ? 'image/webp'
      : 'image/jpeg'
    const thumb = await render(bitmap, MAX_MINIATURA, tipoThumb, CALIDAD_MINIATURA)
    if (thumb) { blobMiniatura = thumb; tipoMiniatura = tipoThumb }

    // ── versión Open Graph (siempre JPEG). Si falla, la subida sigue sin ella: la Function de la ficha cae a
    // la original y el panel de Propiedades avisa de que falta.
    try { blobOg = (await renderOg(bitmap))?.blob ?? null } catch { blobOg = null }

    bitmap.close?.()
  } catch {
    // Si el navegador no puede decodificarla, se sube sin procesar antes que
    // perder la subida. Queda sin miniatura.
    blobOriginal = archivo
    tipoOriginal = archivo.type || 'application/octet-stream'
    blobMiniatura = null
    blobOg = null
  }

  return enviar(ruta, blobOriginal, tipoOriginal, blobMiniatura, tipoMiniatura, onError, blobOg)
}

/** Sube un archivo sin procesar (PDF de dossiers, por ejemplo). */
export async function subirArchivo(archivo: File, carpeta: string): Promise<ResultadoSubida | null> {
  const ruta = nombreDestino(carpeta, archivo)
  return enviar(ruta, archivo, archivo.type || 'application/octet-stream', null, '')
}

async function enviar(
  ruta: string, original: Blob, tipoOriginal: string,
  miniatura: Blob | null, tipoMiniatura: string,
  onError?: (mensaje: string) => void,
  og: Blob | null = null,
): Promise<ResultadoSubida | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    console.error('[subir] sin sesion de Supabase')
    onError?.('Sin sesión de Supabase: vuelve a iniciar sesión.')
    return null
  }

  const fd = new FormData()
  fd.append('ruta', ruta)
  fd.append('original', original, ruta.split('/').pop())
  fd.append('tipoOriginal', tipoOriginal)
  if (miniatura) {
    fd.append('miniatura', miniatura, 'thumb')
    fd.append('tipoMiniatura', tipoMiniatura)
  }
  if (og) fd.append('og', og, 'og.jpg')

  try {
    const res = await fetch('/api/subir', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: fd,
    })
    if (!res.ok) {
      const cuerpo = await res.text()
      console.error('[subir] fallo', res.status, cuerpo)
      let detalle = cuerpo
      try { detalle = JSON.parse(cuerpo).error ?? cuerpo } catch { /* cuerpo no JSON */ }
      onError?.(`${detalle || 'error desconocido'} (HTTP ${res.status})`)
      return null
    }
    return await res.json()
  } catch (e) {
    console.error('[subir] error de red', e)
    onError?.(`Error de red: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}
