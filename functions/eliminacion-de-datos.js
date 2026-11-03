// Cloudflare Pages Function: Open Graph de /eliminacion-de-datos
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `EliminacionDatosPage`. Ver `src/lib/og-paginas.js`.

// Las páginas legales cambian de idioma en el cliente; al rastreador se le da el español, que es el idioma por defecto del sitio.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/eliminacion-de-datos',
  title: 'Eliminación de Datos',
  description: 'Cómo solicitar la eliminación de tus datos personales recopilados por SDM Capital a través de la web y WhatsApp.',
}))
