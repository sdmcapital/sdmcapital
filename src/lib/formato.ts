// Formato de superficie y de ubicación, compartido por la tarjeta del catálogo, la ficha, el PDF
// de cotización y los mapas.
//
// SUPERFICIE. En la base `superficie_total` está siempre en m², como entero (el terreno de 102 ha
// de Futaleufú es 1023000). Un número así no se lee: de 10.000 m² para arriba se muestra en
// hectáreas, bajo eso en metros, y con separador de miles en los dos casos. El separador se
// escribe a mano y no con `toLocaleString`: el ICU de `es` no agrupa los números de cuatro
// cifras (6400 saldría «6400»), y acá se quiere «6.400».
//
// UBICACIÓN. El país solo se agrega cuando NO es Chile: las propiedades chilenas se leen como
// siempre y la extranjera dice dónde está. Sin `pais` no se agrega nada.

export type IdiomaFormato = 'es' | 'en'

export const M2_POR_HECTAREA = 10000

function numero(n: number, lang: IdiomaFormato, maxDecimales: number): string {
  const miles = lang === 'en' ? ',' : '.'
  const decimal = lang === 'en' ? '.' : ','
  const [ent, dec] = String(Number(n.toFixed(maxDecimales))).split('.')
  const agrupado = (ent as string).replace(/\B(?=(\d{3})+(?!\d))/g, miles)
  return dec ? `${agrupado}${decimal}${dec}` : agrupado
}

export interface SuperficieFormateada {
  /** El número ya formateado, sin unidad: «21», «102,3», «6.400». */
  valor: string
  unidad: 'ha' | 'm²'
  /** «21 ha», «6.400 m²». */
  texto: string
}

/** Superficie en m² → hectáreas desde 10.000 m², metros por debajo; con separador de miles. */
export function formatSuperficie(m2: number, lang: IdiomaFormato = 'es'): SuperficieFormateada {
  const enHectareas = m2 >= M2_POR_HECTAREA
  const valor = enHectareas ? numero(m2 / M2_POR_HECTAREA, lang, 2) : numero(m2, lang, 2)
  const unidad = enHectareas ? 'ha' : 'm²'
  return { valor, unidad, texto: `${valor} ${unidad}` }
}

/** Metros cuadrados con separador de miles, sin pasar a hectáreas (superficie construida, útil). */
export function formatM2(m2: number, lang: IdiomaFormato = 'es'): string {
  return `${numero(m2, lang, 2)} m²`
}

/** El país, solo si no es Chile; '' si no hay que decirlo. */
export function paisSiExtranjero(pais?: string | null): string {
  const p = (pais ?? '').trim()
  return p && p.toLowerCase() !== 'chile' ? p : ''
}

/** «comuna · región» (o con la separación que se pase), más el país si no es Chile. */
export function formatUbicacion(
  p: { comuna?: string | null; region?: string | null; pais?: string | null },
  separador = ' · ',
): string {
  return [p.comuna, p.region, paisSiExtranjero(p.pais)].filter(Boolean).join(separador)
}
