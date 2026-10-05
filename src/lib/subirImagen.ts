// Subida de imágenes a R2 con el mismo pipeline que usó la migración.
//
//   original   lado mayor máx 1920, calidad 82, con regla de no-engordar
//   miniatura  lado mayor 400, calidad 80, bajo el prefijo thumbs/
//   ambos      Cache-Control: public, max-age=31536000, immutable
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

export type ResultadoSubida = { url: string; thumb: string | null }

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

    bitmap.close?.()
  } catch {
    // Si el navegador no puede decodificarla, se sube sin procesar antes que
    // perder la subida. Queda sin miniatura.
    blobOriginal = archivo
    tipoOriginal = archivo.type || 'application/octet-stream'
    blobMiniatura = null
  }

  return enviar(ruta, blobOriginal, tipoOriginal, blobMiniatura, tipoMiniatura, onError)
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
