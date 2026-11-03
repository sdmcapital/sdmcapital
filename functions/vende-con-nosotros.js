// Cloudflare Pages Function: Open Graph de /vende-con-nosotros
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `VendeConNosotrosPage`. Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/vende-con-nosotros',
  title: 'Vende con Nosotros — Asesoría y Venta de Propiedades',
  description: 'Pon tu propiedad en venta con SDM Capital. Marketing estratégico, asesoría y respaldo legal en todo el proceso.',
  claveImagen: 'vende_hero_img',
  imagenAlt: 'Vende con SDM Capital',
}), ['vende_hero_img'])
