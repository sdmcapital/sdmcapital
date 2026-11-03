// Cloudflare Pages Function: Open Graph de /politica-de-privacidad
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `PoliticaPrivacidadPage`. Ver `src/lib/og-paginas.js`.

// Las páginas legales cambian de idioma en el cliente; al rastreador se le da el español, que es el idioma por defecto del sitio.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/politica-de-privacidad',
  title: 'Política de Privacidad',
  description: 'Política de privacidad de SDM Capital: cómo recopilamos, usamos y protegemos tus datos personales.',
}))
