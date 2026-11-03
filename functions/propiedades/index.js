// Cloudflare Pages Function: Open Graph de /propiedades
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `PropiedadesPage` (META). Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/propiedades',
  title: 'Propiedades en Venta y Arriendo en Chile',
  description: 'Casas, departamentos, parcelas y oficinas en venta y arriendo en todo Chile. Filtra por comuna, tipo, precio y bono pie en el catálogo de SDM Capital.',
}))
