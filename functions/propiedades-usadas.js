// Cloudflare Pages Function: Open Graph de /propiedades-usadas
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `PropiedadesPage` (META). Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/propiedades-usadas',
  title: 'Propiedades Usadas: Casas y Departamentos',
  description: 'Casas y departamentos de segunda mano en Chile, listos para habitar. Revisa superficie, dormitorios y comuna de cada propiedad usada de SDM Capital.',
}))
