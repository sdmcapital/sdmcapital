// Cloudflare Pages Function: Open Graph para /quienes-somos
//
// Sin ella, un crawler que no ejecuta JS ve el index.html estático y comparte
// esta ruta con el título genérico del sitio, igual que las otras tres.
//
// Calcada del patrón de `functions/blog/[slug].js`: mismo filtro por
// user-agent, mismo escape de HTML, mismo `next()` ante cualquier problema.

import { BASE_URL, DEFAULT_OG_IMAGE } from '../src/lib/seo-compartido.js'
import { imagenParaOg } from '../src/lib/og-propiedades.js'
import { BOT_UA_REGEX, BUSCADOR_UA_REGEX, leerContenido, reescribirCabecera } from '../src/lib/og-estatico.js'

const SUPABASE_URL_FALLBACK = 'https://ugfhgfpgxyfzafudxaeo.supabase.co'
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZmhnZnBneHlmemFmdWR4YWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTIzNjUsImV4cCI6MjA5MzA2ODM2NX0.3l_7lcMIBz-RAwDYW7je9sIjY2iyVHixdxrBgP7bW6Q'

export async function onRequestGet(context) {
  const { request, env, next } = context
  const ua = request.headers.get('user-agent') || ''
  const social = BOT_UA_REGEX.test(ua)
  const buscador = BUSCADOR_UA_REGEX.test(ua)
  if (!social && !buscador) return next()

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK

  try {
    const c = await leerContenido(supabaseUrl, anon, ['qs_subtitulo', 'quienes_imagen_historia'])
    // Su imagen, en la versión OG de 1200×630 si existe en R2 (`scripts/generar-og-imagenes.py`); si no, la original.
    const imagen = c.quienes_imagen_historia ? await imagenParaOg(c.quienes_imagen_historia, env, DEFAULT_OG_IMAGE) : null
    const meta = {
      title: 'Quiénes Somos',
      description: c.qs_subtitulo || 'SDM Capital — Más de 15 años conectando personas con oportunidades inmobiliarias. Conoce nuestro equipo de expertos en bienes raíces y financiamiento.',
      image: imagen ? imagen.url : undefined,
      dimensiones: imagen ? imagen.dimensiones : undefined,
      tipoImagen: imagen ? imagen.tipo : undefined,
      url: `${BASE_URL}/quienes-somos`,
    }
    // El index.html REAL con las etiquetas escritas al inicio del <head>, para sociales y buscadores: sin el
    // documento mínimo con `meta refresh` que rompía la vista previa de WhatsApp. Ver `propiedades/[id].js`.
    return reescribirCabecera(await next(), { ...meta, alPrincipio: true })
  } catch {
    return next()
  }
}
