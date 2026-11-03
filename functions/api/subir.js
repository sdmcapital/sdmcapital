// Recibe imágenes ya procesadas por el navegador y las escribe en R2.
//
// El navegador no puede llevar credenciales de R2, así que sube por acá y el
// binding `IMAGENES` del proyecto Pages resuelve el acceso: no hay token ni
// secreto que rotar.
//
// El endpoint exige sesión de Supabase: sin eso sería una vía abierta para que
// cualquiera escriba en el bucket.

// La clave de la versión Open Graph la fija `claveOg` (la misma que usan las Functions que la leen), para que
// escritura y lectura no puedan divergir: `og/<ruta sin extensión>.jpg`.
import { claveOg } from '../../src/lib/og-propiedades.js'

const HOST_IMAGENES = 'https://imagenes.sdmcapital.cl/'
const SUPABASE_URL_DEFECTO = 'https://ugfhgfpgxyfzafudxaeo.supabase.co'
// La anon key es publica: viaja en el bundle del sitio, cualquiera puede leerla
// en el navegador. Se embebe como respaldo para que el endpoint funcione sin
// depender de variables de entorno del proyecto Pages. Si algun dia se definen
// SUPABASE_URL / SUPABASE_ANON_KEY, esas tienen prioridad.
const SUPABASE_ANON_DEFECTO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmhnZnBneHlmemFmdWR4YWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTIzNjUsImV4cCI6MjA5MzA2ODM2NX0.3l_7lcMIBz-RAwDYW7je9sIjY2iyVHixdxrBgP7bW6Q'
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

// Prefijos permitidos. Evita que una ruta manipulada escriba fuera de lo previsto.
const PREFIJOS = ['propiedades/', 'blog/', 'equipo/', 'hero/', 'paginas/', 'servicios/',
                  'destinos/', 'asociados/', 'dossiers/', 'cotizaciones/', 'general/',
                  'rental/', 'vende/', 'fichas/', 'banner/']

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

function rutaValida(ruta) {
  if (typeof ruta !== 'string' || !ruta || ruta.length > 300) return false
  if (ruta.includes('..') || ruta.startsWith('/') || ruta.includes('//')) return false
  if (!/^[A-Za-z0-9/._-]+$/.test(ruta)) return false
  return PREFIJOS.some((p) => ruta.startsWith(p))
}

// Verifica que quien sube tenga sesión válida en Supabase.
async function sesionValida(request, env) {
  const auth = request.headers.get('authorization') || ''
  const base = env.SUPABASE_URL || SUPABASE_URL_DEFECTO
  const anon = env.SUPABASE_ANON_KEY || SUPABASE_ANON_DEFECTO

  if (!auth.startsWith('Bearer ')) return false

  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: auth },
    })
    if (!res.ok) return false
    const u = await res.json()
    return Boolean(u?.id)
  } catch {
    return false
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.IMAGENES) return json({ error: 'binding IMAGENES no configurado' }, 500)
  if (!(await sesionValida(request, env))) return json({ error: 'no autorizado' }, 401)

  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'formulario invalido' }, 400)
  }

  const ruta = form.get('ruta')
  const original = form.get('original')
  const miniatura = form.get('miniatura')
  const og = form.get('og')
  const tipoOriginal = form.get('tipoOriginal') || 'application/octet-stream'
  const tipoMiniatura = form.get('tipoMiniatura') || 'image/jpeg'

  if (!rutaValida(ruta)) return json({ error: 'ruta no permitida' }, 400)
  if (!(original instanceof File)) return json({ error: 'falta el archivo' }, 400)

  try {
    await env.IMAGENES.put(ruta, original.stream(), {
      httpMetadata: { contentType: tipoOriginal, cacheControl: CACHE_CONTROL },
    })
    // Los PDF y otros no-imagen no llevan miniatura.
    if (miniatura instanceof File) {
      await env.IMAGENES.put(`thumbs/${ruta}`, miniatura.stream(), {
        httpMetadata: { contentType: tipoMiniatura, cacheControl: CACHE_CONTROL },
      })
    }
    // Versión Open Graph (1200×630, JPEG ≤ 250 KB), generada en el navegador. Es opcional: si falta, la subida
    // vale igual y el panel de Propiedades avisa de que no existe.
    if (og instanceof File) {
      const claveOgImagen = claveOg(`${HOST_IMAGENES}${ruta}`)
      if (claveOgImagen) {
        await env.IMAGENES.put(claveOgImagen, og.stream(), {
          httpMetadata: { contentType: 'image/jpeg', cacheControl: CACHE_CONTROL },
        })
      }
    }
  } catch (e) {
    return json({ error: `no se pudo escribir en R2: ${e.message}` }, 502)
  }

  const claveOgSubida = og instanceof File ? claveOg(`${HOST_IMAGENES}${ruta}`) : ''
  return json({
    url: `https://imagenes.sdmcapital.cl/${ruta}`,
    thumb: miniatura instanceof File ? `https://imagenes.sdmcapital.cl/thumbs/${ruta}` : null,
    og: claveOgSubida ? `${HOST_IMAGENES}${claveOgSubida}` : null,
  })
}
