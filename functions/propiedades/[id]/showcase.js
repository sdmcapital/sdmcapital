// Cloudflare Pages Function: Open Graph de /propiedades/:id/showcase
// El showcase es una página aparte de la ficha y tiene su propio contenido (`showcase_contenido`,
// `showcase_items`): sin esta Function, un crawler que no ejecuta JavaScript ve el index.html y
// la vista previa sale con el título genérico del sitio. A los crawlers sociales (WhatsApp,
// Facebook…) y a los buscadores les devuelve el index.html real con la cabecera reescrita; a los
// navegadores, la SPA tal cual (`next()`).
//
// Todo sale de la base, así que vale para cualquier propiedad con showcase:
//   og:title        seo_titulo (o hero_titulo) en el idioma por defecto del showcase
//   og:description  seo_descripcion (o hero_tagline)
//   og:image        la primera foto del hero, en su versión OG de 1200×630 si existe
//   og:url          SIEMPRE con el slug; el UUID solo si la propiedad no tiene slug público

import { BASE_URL, DEFAULT_OG_IMAGE } from '../../../src/lib/seo-compartido.js'
import { BOT_UA_REGEX, BUSCADOR_UA_REGEX, reescribirCabecera, recortar } from '../../../src/lib/og-estatico.js'
import { imagenParaOg } from '../../../src/lib/og-propiedades.js'

const SUPABASE_URL_FALLBACK = 'https://ugfhgfpgxyfzafudxaeo.supabase.co'
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmhnZnBneHlmemFmdWR4YWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTIzNjUsImV4cCI6MjA5MzA2ODM2NX0.3l_7lcMIBz-RAwDYW7je9sIjY2iyVHixdxrBgP7bW6Q'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CLAVES = ['hero_titulo', 'seo_titulo', 'seo_titulo_es', 'seo_descripcion', 'seo_descripcion_es', 'hero_tagline', 'hero_tagline_es', 'idioma_default']

export async function onRequestGet(context) {
  const { request, params, env, next } = context
  const userAgent = request.headers.get('user-agent') || ''
  if (!BOT_UA_REGEX.test(userAgent) && !BUSCADOR_UA_REGEX.test(userAgent)) return next()

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  const rest = async (ruta) => {
    const r = await fetch(`${supabaseUrl}/rest/v1/${ruta}`, { headers })
    if (!r.ok) throw new Error(`REST ${r.status}`)
    return r.json()
  }

  try {
    const idOSlug = params.id
    let id = ''
    let slug = ''

    if (UUID_REGEX.test(idOSlug)) {
      id = idOSlug
      // `propiedades` solo muestra las activas: de una inactiva no se conoce el slug y la URL queda con el UUID.
      const filas = await rest(`propiedades?id=eq.${encodeURIComponent(id)}&select=slug&limit=1`)
      slug = (Array.isArray(filas) && filas[0] && filas[0].slug) || ''
    } else {
      const filas = await rest(`propiedades?slug=eq.${encodeURIComponent(idOSlug)}&select=id,slug&limit=1`)
      if (Array.isArray(filas) && filas[0]) {
        id = filas[0].id
        slug = filas[0].slug
      } else {
        // Propiedad inactiva con showcase: el mismo resolutor que usa la página (migración 20261103000900).
        const r = await fetch(`${supabaseUrl}/rest/v1/rpc/showcase_id_por_slug`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: idOSlug }),
        })
        if (!r.ok) return next()
        const res = await r.json()
        if (!res) return next()
        id = res
        slug = idOSlug
      }
    }
    if (!id) return next()

    const lista = CLAVES.map((c) => `"${c}"`).join(',')
    const [filasContenido, filasHero] = await Promise.all([
      rest(`showcase_contenido?propiedad_id=eq.${encodeURIComponent(id)}&clave=in.(${encodeURIComponent(lista)})&select=clave,valor`),
      rest(`showcase_items?propiedad_id=eq.${encodeURIComponent(id)}&seccion=eq.hero&order=orden.asc&limit=1&select=img`),
    ])
    const c = {}
    for (const f of filasContenido) if (f && typeof f.valor === 'string' && f.valor.trim()) c[f.clave] = f.valor
    if (!Object.keys(c).length) return next()   // sin contenido de showcase: la página dirá «no encontrada»

    const es = c.idioma_default === 'es'
    const t = (clave) => (es && c[`${clave}_es`]) || c[clave] || ''
    const titulo = t('seo_titulo') || c.hero_titulo || 'Showcase'
    const descripcion = t('seo_descripcion') || t('hero_tagline')
    const urlHero = Array.isArray(filasHero) && filasHero[0] ? filasHero[0].img : ''
    const imagen = await imagenParaOg(urlHero, env, DEFAULT_OG_IMAGE)
    const pageUrl = `${BASE_URL}/propiedades/${slug || id}/showcase`

    const meta = {
      title: titulo,
      description: recortar(descripcion, 200),
      image: imagen.url,
      url: pageUrl,
      dimensiones: imagen.dimensiones,
      tipoImagen: imagen.tipo,
      imagenAlt: c.hero_titulo || titulo,
    }

    // Siempre el index.html real con la cabecera reescrita (sin `meta refresh`): ver `[id].js`.
    return reescribirCabecera(await next(), { ...meta, dimensiones: imagen.dimensiones || null, alPrincipio: true })
  } catch {
    return next()
  }
}
