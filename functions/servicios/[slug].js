// Cloudflare Pages Function: Open Graph de /servicios/:slug
//
// Cada servicio se COMPARTE con su propio título, descripción e imagen (los de `contenido_sitio`, los mismos que
// pinta `ServiciosPage`). Pero `/servicios/:slug` NO es una página propia: renderiza `/servicios` entera y solo
// hace scroll al ancla, así que su CANONICAL sigue siendo `/servicios` (decisión documentada en `ServiciosPage`:
// con canonical a sí mismas Google indexaría cinco URLs con el mismo contenido). `og:url`, en cambio, es la URL
// compartida: así Facebook no redirige la tarjeta a la genérica de /servicios.
//
// Un slug desconocido no se toca: la SPA responde como siempre. Un servicio oculto en el admin se comparte como `/servicios`.

import { crearFunctionEstatica } from '../../src/lib/og-paginas.js'

const SERVICIOS = {
  'financiamiento-personas': { key: 'fin_per', titulo: 'Financiamiento Personas' },
  'financiamiento-empresas': { key: 'fin_emp', titulo: 'Financiamiento Empresas' },
  'inversion-internacional': { key: 'inv_int', titulo: 'Inversión Internacional' },
  'bancarizacion-extranjero': { key: 'banco', titulo: 'Bancarización en el Extranjero' },
}

const CLAVES = Object.values(SERVICIOS).flatMap(({ key }) => [`servicio_${key}_titulo`, `servicio_${key}_desc`, `servicio_${key}_imagen`])
CLAVES.push('servicios_intro')
// `_visible` solo existe cuando el admin lo oculta; se lee aparte porque su valor `false` no es texto de contenido.
CLAVES.push(...Object.values(SERVICIOS).map(({ key }) => `servicio_${key}_visible`))

export const onRequestGet = crearFunctionEstatica((ctx, c) => {
  const s = SERVICIOS[ctx.params.slug]
  if (!s) return null
  // Servicio oculto en el admin: su ancla no existe en la página, así que se comparte como `/servicios` a secas.
  if (c[`servicio_${s.key}_visible`] === 'false') {
    return {
      ruta: `/servicios/${ctx.params.slug}`,
      canonical: '/servicios',
      title: 'Servicios',
      description: c.servicios_intro || 'Inversión inmobiliaria en Chile e internacional, financiamiento hipotecario y bancarización.',
    }
  }
  const titulo = c[`servicio_${s.key}_titulo`] || s.titulo
  return {
    ruta: `/servicios/${ctx.params.slug}`,
    canonical: '/servicios',
    title: titulo,
    description: c[`servicio_${s.key}_desc`] || c.servicios_intro || 'Inversión inmobiliaria en Chile e internacional, financiamiento hipotecario y bancarización.',
    claveImagen: `servicio_${s.key}_imagen`,
    imagenAlt: titulo,
  }
}, CLAVES)
