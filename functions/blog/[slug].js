// Cloudflare Pages Function: Open Graph dinámico para /blog/:slug
// Sirve meta tags específicas del artículo a crawlers (WhatsApp, Facebook, etc.)
// que no ejecutan JS, y deja pasar a usuarios reales hacia la SPA React.
//
// Calcada de functions/propiedades/[id].js, que resuelve exactamente el mismo
// problema para las fichas. Mismo patrón, misma forma de consultar Supabase,
// mismo escape de HTML.
//
// Por qué hace falta: `<SEO>` escribe los meta desde el cliente, y un crawler
// que no ejecuta JavaScript ve solo el index.html estático — o sea el título
// genérico del sitio. Los trece artículos se compartían iguales.

// Un solo sitio para lo que el cliente y las Functions tienen que decir igual.
// Antes la descripción estaba copiada a mano acá con un comentario pidiendo que
// no divergiera de `src/components/SEO.tsx`.
import { BASE_URL, DEFAULT_OG_IMAGE, DEFAULT_DESCRIPTION } from '../../src/lib/seo-compartido.js'
import { BOT_UA_REGEX, BUSCADOR_UA_REGEX, reescribirCabecera, recortar } from '../../src/lib/og-estatico.js'
import { imagenParaOg, inicioDeDescripcion } from '../../src/lib/og-propiedades.js'
import { schemaArticulo, bloqueJsonLd } from '../../src/lib/schema.js'

// Anon key pública (la misma que va embebida en el bundle del cliente) usada
// como fallback si no se configuran variables de entorno en Cloudflare Pages.
const SUPABASE_URL_FALLBACK = 'https://ugfhgfpgxyfzafudxaeo.supabase.co'
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmhnZnBneHlmemFmdWR4YWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTIzNjUsImV4cCI6MjA5MzA2ODM2NX0.3l_7lcMIBz-RAwDYW7je9sIjY2iyVHixdxrBgP7bW6Q'

export async function onRequestGet(context) {
  const { request, params, env, next } = context
  const userAgent = request.headers.get('user-agent') || ''

  if (!BOT_UA_REGEX.test(userAgent) && !BUSCADOR_UA_REGEX.test(userAgent)) {
    return next()
  }

  const slug = params.slug
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK

  try {
    // `publicado=eq.true` explícito y no confiando solo en RLS: desde fuera no
    // se puede distinguir «RLS filtra los borradores» de «no hay borradores»,
    // y un artículo sin publicar no debe filtrarse por el previsualizador de
    // WhatsApp.
    const query =
      `${supabaseUrl}/rest/v1/blog_posts` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&publicado=eq.true` +
      `&select=titulo,resumen,contenido,imagen_portada,slug` +
      `&limit=1`

    const supaRes = await fetch(query, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!supaRes.ok) return next()

    const rows = await supaRes.json()
    const post = Array.isArray(rows) ? rows[0] : null

    // Sin post no se revienta: pasa al index.html y el SPA muestra su propio
    // "Artículo no encontrado".
    if (!post) return next()

    const pageUrl = `${BASE_URL}/blog/${post.slug || slug}`

    // Descripción: el resumen del artículo; si no lo tiene (la mayoría), el inicio de su contenido, sin la
    // línea de titular con la que abren. Solo si tampoco hay contenido, la genérica del sitio.
    const inicio = post.resumen ? '' : inicioDeDescripcion(post.contenido)
    const descripcion = post.resumen || (inicio ? recortar(inicio, 200) : DEFAULT_DESCRIPTION)
    const imagen = await imagenParaOg(post.imagen_portada, env, DEFAULT_OG_IMAGE)

    // El index.html REAL con las etiquetas escritas al inicio del <head>, para sociales y buscadores: sin el
    // documento mínimo con `meta refresh` que rompía la vista previa de WhatsApp. Ver `propiedades/[id].js`.
    return reescribirCabecera(await next(), {
      jsonLd: bloqueJsonLd(schemaArticulo(post, pageUrl)),
      title: post.titulo || 'Artículo',
      description: descripcion,
      image: imagen.url,
      dimensiones: imagen.dimensiones || null,
      tipoImagen: imagen.tipo,
      imagenAlt: post.titulo || 'Artículo',
      url: pageUrl,
      tipoOg: 'article',
      alPrincipio: true,
    })
  } catch (err) {
    return next()
  }
}
