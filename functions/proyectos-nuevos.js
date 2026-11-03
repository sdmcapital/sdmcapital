// Cloudflare Pages Function: Open Graph de /proyectos-nuevos
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `PropiedadesPage` (META). Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/proyectos-nuevos',
  title: 'Proyectos Nuevos: Bono Pie, Entrega Inmediata',
  description: 'Departamentos nuevos en Chile con bono pie y entrega inmediata. Compara etapa de obra, precio en UF y comuna en los proyectos de SDM Capital.',
}))
