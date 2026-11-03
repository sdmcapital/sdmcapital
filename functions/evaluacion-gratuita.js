// Cloudflare Pages Function: Open Graph de /evaluacion-gratuita
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `EvaluacionGratuitaPage`. Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/evaluacion-gratuita',
  title: 'Evaluación Hipotecaria Gratuita',
  description: 'Solicita tu preevaluación hipotecaria sin costo. Evaluación en 10 a 15 días hábiles. Sin pagos adelantados.',
}))
