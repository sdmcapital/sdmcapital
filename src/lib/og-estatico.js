// Open Graph para las rutas ESTÁTICAS del sitio público.
//
// `<SEO>` escribe los meta desde el cliente, y un crawler que no ejecuta
// JavaScript ve solo el index.html: el título genérico. Las fichas y los
// artículos ya tenían su Pages Function; estas cuatro rutas no, así que
// /blog, /asociados, /quienes-somos y /servicios se compartían todas iguales.
//
// Se llama desde `functions/`, no desde el cliente: es el mismo truco que
// `seo-compartido.js` —módulo hoja, sin dependencias, sin nada del navegador—
// para no tener cuatro copias del mismo render.
//
// LOS TEXTOS SALEN DE `contenido_sitio` CUANDO HAY CLAVE, y si no, del mismo
// texto que usa `<SEO>` hoy. Así lo que ve el crawler y lo que ve el navegador
// dicen lo mismo, y editar desde el admin cambia los dos.
//
// El TÍTULO, en cambio, no sale de `contenido_sitio` aunque haya claves
// parecidas: `blog_titulo` vale «Blog SDM Capital» y es el encabezado de la
// página, no un meta title. Interpolarlo daría «Blog SDM Capital | SDM Capital».
// Los títulos se quedan con el texto que ya pasa `<SEO>`.

import { SITE_NAME, DEFAULT_OG_IMAGE } from './seo-compartido.js'

// DOS FILTROS, PORQUE SON DOS PROBLEMAS DISTINTOS.
//
// BOT_UA_REGEX — crawlers SOCIALES. Solo leen la cabecera para dibujar la
// tarjeta de un enlace compartido; el cuerpo les da igual. Reciben
// `renderOgHtml()`, un documento mínimo con los meta correctos.
//
// BUSCADOR_UA_REGEX — BUSCADORES. Estos NO pueden recibir ese documento: lleva
// un `<meta http-equiv="refresh">` a su propia URL y diez palabras de cuerpo.
// Servírselo sería darles una página que se redirige a sí misma, sin contenido,
// sin `<div id="root">` y sin scripts — o sea, peor que hoy, porque hoy al menos
// reciben el SPA y lo renderizan en su segunda pasada.
//
// Lo que reciben es el index.html REAL con la cabecera reescrita: se quedan con
// todo el HTML de la aplicación y además leen en la primera pasada el título, la
// descripción y el canonical de la ruta, en vez del genérico del sitio.
//
// Googlebot Desktop y Smartphone tienen user-agent distinto —uno pone
// `compatible; Googlebot/2.1` dentro del paréntesis, el otro lo añade al final
// tras `Mobile Safari`— pero los dos contienen la cadena `Googlebot`, así que un
// solo patrón cubre los dos. `Google-InspectionTool` es el de «Inspeccionar URL»
// de Search Console: sin él, la herramienta le enseñaría algo distinto de lo que
// ve Googlebot, que es justo lo que no queremos.
export const BOT_UA_REGEX =
  /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|iMessage|curl|Signal|Viber|SkypeUriPreview|MicrosoftPreview|Pinterest|redditbot|Mastodon|Embedly|vkShare/i

export const BUSCADOR_UA_REGEX =
  /Googlebot|Google-InspectionTool|Storebot-Google|bingbot|BingPreview|DuckDuckBot|Applebot|Yandex/i

// Reescribe la cabecera del documento REAL en vez de fabricar uno nuevo.
//
// `HTMLRewriter` es la API de streaming de Cloudflare: transforma la respuesta
// que ya venía de `next()` sin cargarla entera en memoria y sin tocar el cuerpo.
// El resultado es el mismo index.html —mismos scripts, mismo `#root`, mismo
// JSON-LD— con cuatro etiquetas cambiadas.
//
// `og:url` y `canonical` reciben el mismo valor a propósito: son el mismo dato
// dicho a dos consumidores.
//
// `dimensiones` (opcional): `{ ancho, alto }` de la imagen. Sin el parámetro no se toca
// `og:image:width/height` (queda lo que trae el index.html: 1200×630, la imagen por defecto);
// con `null` se QUITAN, porque la imagen es otra y no se sabe cuánto mide; con valores, se
// escriben. `imagenAlt` (opcional) rellena `og:image:alt` y `twitter:image:alt`.
export function reescribirCabecera(respuesta, { title, description, image, url, jsonLd, dimensiones, imagenAlt }) {
  const t = `${title} | ${SITE_NAME}`
  const d = recortar(description)
  const img = image || DEFAULT_OG_IMAGE

  const rw = new HTMLRewriter()
    .on('title', { element: (e) => e.setInnerContent(t) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute('content', d) })
    .on('link[rel="canonical"]', { element: (e) => e.setAttribute('href', url) })
    .on('meta[property="og:title"]', { element: (e) => e.setAttribute('content', t) })
    .on('meta[property="og:description"]', { element: (e) => e.setAttribute('content', d) })
    .on('meta[property="og:image"]', { element: (e) => e.setAttribute('content', img) })
    .on('meta[property="og:url"]', { element: (e) => e.setAttribute('content', url) })
    .on('meta[name="twitter:title"]', { element: (e) => e.setAttribute('content', t) })
    .on('meta[name="twitter:description"]', { element: (e) => e.setAttribute('content', d) })
    .on('meta[name="twitter:image"]', { element: (e) => e.setAttribute('content', img) })

  if (dimensiones === null) {
    rw.on('meta[property="og:image:width"]', { element: (e) => e.remove() })
    rw.on('meta[property="og:image:height"]', { element: (e) => e.remove() })
  } else if (dimensiones) {
    rw.on('meta[property="og:image:width"]', { element: (e) => e.setAttribute('content', String(dimensiones.ancho)) })
    rw.on('meta[property="og:image:height"]', { element: (e) => e.setAttribute('content', String(dimensiones.alto)) })
  }
  if (imagenAlt) {
    const alt = escapeHtml(imagenAlt)
    rw.on('head', { element: (e) => e.append(`<meta property="og:image:alt" content="${alt}" /><meta name="twitter:image:alt" content="${alt}" />`, { html: true }) })
  }

  // El JSON-LD del recurso se AÑADE al final de <head>, no reemplaza nada: el
  // `RealEstateAgent` del index.html describe a la empresa y este describe la
  // página. Google lee todos los bloques y los une.
  if (jsonLd) rw.on('head', { element: (e) => e.append(jsonLd, { html: true }) })

  return rw.transform(respuesta)
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Las claves de `contenido_sitio` son párrafos de página, no meta descriptions:
// `asociados_intro` son casi 300 caracteres. Se recorta en el último espacio
// antes del límite para no cortar una palabra por la mitad.
export function recortar(texto, max = 200) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const corte = t.slice(0, max)
  const espacio = corte.lastIndexOf(' ')
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd() + '…'
}

// Lee varias claves de `contenido_sitio` de una sola vez. Devuelve `{}` ante
// cualquier problema: quien llama usa sus valores por defecto y el crawler
// recibe igual unos meta correctos, solo que no editados desde el admin.
export async function leerContenido(supabaseUrl, anonKey, claves) {
  try {
    const lista = claves.map((c) => `"${c}"`).join(',')
    const res = await fetch(
      `${supabaseUrl}/rest/v1/contenido_sitio?select=clave,valor&clave=in.(${encodeURIComponent(lista)})`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
    )
    if (!res.ok) return {}
    const filas = await res.json()
    if (!Array.isArray(filas)) return {}
    const mapa = {}
    for (const f of filas) {
      if (f && typeof f.clave === 'string' && typeof f.valor === 'string' && f.valor.trim()) {
        mapa[f.clave] = f.valor
      }
    }
    return mapa
  } catch {
    return {}
  }
}

// `dimensiones`, `tipoImagen` e `imagenAlt` son opcionales: las rutas estáticas no los pasan y su salida
// no cambia. Las propiedades sí, para que WhatsApp y Facebook sepan el tamaño antes de bajar la imagen.
export function renderOgHtml({ title, description, image, url, dimensiones, tipoImagen, imagenAlt }) {
  const safeTitle = escapeHtml(`${title} | ${SITE_NAME}`)
  const safeDescription = escapeHtml(recortar(description))
  const safeImage = escapeHtml(image || DEFAULT_OG_IMAGE)
  const safeUrl = escapeHtml(url)

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="0;url=${safeUrl}" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />

<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${safeImage}" />${dimensiones ? `
<meta property="og:image:width" content="${dimensiones.ancho}" />
<meta property="og:image:height" content="${dimensiones.alto}" />` : ''}${tipoImagen ? `
<meta property="og:image:type" content="${escapeHtml(tipoImagen)}" />` : ''}${imagenAlt ? `
<meta property="og:image:alt" content="${escapeHtml(imagenAlt)}" />` : ''}
<meta property="og:url" content="${safeUrl}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImage}" />${imagenAlt ? `
<meta name="twitter:image:alt" content="${escapeHtml(imagenAlt)}" />` : ''}

<link rel="canonical" href="${safeUrl}" />
</head>
<body>
<p>Redirigiendo a <a href="${safeUrl}">${safeTitle}</a>...</p>
</body>
</html>`
}
