// Fábrica de Pages Functions de Open Graph para las rutas ESTÁTICAS del sitio público que no leen nada
// especial de la base (catálogo, Rental, Vende, evaluación, páginas legales y fichas de servicio).
//
// Es el mismo enfoque que ya usan la ficha y el showcase: a los rastreadores sociales y a los buscadores se
// les devuelve el index.html REAL de la SPA con las etiquetas escritas al inicio del <head> (sin `meta
// refresh`); a los navegadores, la SPA tal cual. Los textos son los MISMOS que pasa `<SEO>` en cada página,
// para que lo que ve el rastreador y lo que ve el navegador digan lo mismo.
//
// `claveImagen` (opcional) es una clave de `contenido_sitio` con la URL de la imagen de la página: si existe se
// usa su versión OG de 1200×630 (`og/<clave>.jpg`), y si no, la imagen genérica del sitio.

import { BASE_URL, DEFAULT_OG_IMAGE } from './seo-compartido.js'
import { BOT_UA_REGEX, BUSCADOR_UA_REGEX, leerContenido, reescribirCabecera } from './og-estatico.js'
import { imagenParaOg } from './og-propiedades.js'

const SUPABASE_URL_FALLBACK = 'https://ugfhgfpgxyfzafudxaeo.supabase.co'
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmhnZnBneHlmemFmdWR4YWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTIzNjUsImV4cCI6MjA5MzA2ODM2NX0.3l_7lcMIBz-RAwDYW7je9sIjY2iyVHixdxrBgP7bW6Q'

/**
 * @param {(ctx: object, c: Record<string,string>) => ({ title: string, description: string, ruta: string, canonical?: string, claveImagen?: string, imagenAlt?: string } | null)} resolver
 *        Devuelve los textos de la página (o null para dejar pasar la petición sin tocar).
 * @param {string[]} [clavesContenido] claves de `contenido_sitio` que el resolver necesita.
 */
export function crearFunctionEstatica(resolver, clavesContenido = []) {
  return async function onRequestGet(context) {
    const { request, env, next } = context
    const ua = request.headers.get('user-agent') || ''
    if (!BOT_UA_REGEX.test(ua) && !BUSCADOR_UA_REGEX.test(ua)) return next()

    try {
      const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK
      const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK
      const c = clavesContenido.length ? await leerContenido(supabaseUrl, anon, clavesContenido) : {}
      const p = resolver(context, c)
      if (!p) return next()

      const imagen = p.claveImagen && c[p.claveImagen]
        ? await imagenParaOg(c[p.claveImagen], env, DEFAULT_OG_IMAGE)
        : { url: DEFAULT_OG_IMAGE, dimensiones: undefined, tipo: undefined }
      const url = `${BASE_URL}${p.ruta}`
      return reescribirCabecera(await next(), {
        title: p.title,
        description: p.description,
        image: imagen.url === DEFAULT_OG_IMAGE ? undefined : imagen.url,
        dimensiones: imagen.url === DEFAULT_OG_IMAGE ? undefined : (imagen.dimensiones || null),
        tipoImagen: imagen.url === DEFAULT_OG_IMAGE ? undefined : imagen.tipo,
        imagenAlt: p.imagenAlt,
        url,
        canonical: p.canonical ? `${BASE_URL}${p.canonical}` : undefined,
        alPrincipio: true,
      })
    } catch {
      return next()
    }
  }
}
