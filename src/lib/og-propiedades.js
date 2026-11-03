// Open Graph de las propiedades (ficha y showcase), compartido por las dos Pages Functions.
// Módulo hoja y sin dependencias, como `seo-compartido.js`: corre en un Worker.
//
// LA IMAGEN. WhatsApp no pinta la imagen de una vista previa si pesa más de ~300 KB, y Facebook
// pide al menos 1200×630 para la tarjeta grande. Las portadas de las propiedades son lo que haya
// subido el admin: de 540 px a 1620 px, cuadradas, verticales, webp… Por eso cada una tiene una
// VERSIÓN OG propia en R2 —`og/<clave>.jpg`, 1200×630, JPEG ≤ 250 KB— y la Function la usa si
// existe. Si no existe (propiedad recién creada, todavía sin generar), cae a la imagen original y
// NO declara dimensiones, para no prometer un tamaño que no es.

export const OG_ANCHO = 1200
export const OG_ALTO = 630
const HOST_IMAGENES = 'https://imagenes.sdmcapital.cl/'

/** `https://imagenes…/propiedades/x.png` → clave `og/propiedades/x.jpg`; '' si no es de R2. */
export function claveOg(urlImagen) {
  if (typeof urlImagen !== 'string' || !urlImagen.startsWith(HOST_IMAGENES)) return ''
  const clave = urlImagen.slice(HOST_IMAGENES.length)
  if (clave.startsWith('og/')) return clave
  return `og/${clave.replace(/\.[A-Za-z0-9]+$/, '')}.jpg`
}

/**
 * La imagen que va en `og:image`: la versión OG si está en R2, si no la original.
 * Devuelve `{ url, dimensiones, tipo }`; `dimensiones` es null cuando es la original.
 * `env.IMAGENES` es el binding de R2 (el mismo de /api/subir); sin él se pregunta por HTTP.
 */
export async function imagenParaOg(urlImagen, env, porDefecto) {
  const original = urlImagen || porDefecto
  const clave = claveOg(urlImagen)
  if (!clave) return { url: original, dimensiones: null, tipo: '' }
  try {
    let existe = false
    if (env && env.IMAGENES && typeof env.IMAGENES.head === 'function') {
      existe = !!(await env.IMAGENES.head(clave))
    } else {
      const r = await fetch(`${HOST_IMAGENES}${clave}`, { method: 'HEAD' })
      existe = r.ok
    }
    if (existe) return { url: `${HOST_IMAGENES}${clave}`, dimensiones: { ancho: OG_ANCHO, alto: OG_ALTO }, tipo: 'image/jpeg' }
  } catch { /* cae a la original */ }
  return { url: original, dimensiones: null, tipo: '' }
}

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** HTML del editor → texto plano en una línea: sin etiquetas, con las entidades comunes resueltas. */
export function textoPlano(html) {
  return String(html || '')
    .replace(/<\/(p|h[1-6]|li|div|br)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTIDADES[m] || m)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * El INICIO de la descripción de una ficha, para `og:description`. Muchas descripciones abren con
 * una línea de titular (`<h1>`, `<h2>` o un `<p><strong>…</strong></p>` suelto) que repite el título
 * de la ficha: se saltan, y si lo que queda es muy corto se usa el texto completo.
 */
export function inicioDeDescripcion(html) {
  const completo = textoPlano(html)
  let resto = String(html || '').trim()
  for (let i = 0; i < 3; i++) {
    const sinTitular = resto
      .replace(/^\s*<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i, '')
      .replace(/^\s*<p[^>]*>\s*<strong>[\s\S]*?<\/strong>\s*<\/p>/i, '')
      .replace(/^\s*<p[^>]*>(\s|&nbsp;)*<\/p>/i, '')
    if (sinTitular === resto) break
    resto = sinTitular.trim()
  }
  const texto = textoPlano(resto)
  return texto.length >= 60 ? texto : completo
}
