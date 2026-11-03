// Cloudflare Pages Function: Open Graph de /condiciones-del-servicio
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `CondicionesServicioPage`. Ver `src/lib/og-paginas.js`.

// Las páginas legales cambian de idioma en el cliente; al rastreador se le da el español, que es el idioma por defecto del sitio.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/condiciones-del-servicio',
  title: 'Condiciones del Servicio',
  description: 'Condiciones del servicio de SDM Capital: alcance del servicio de corretaje, información de propiedades y condiciones comerciales.',
}))
