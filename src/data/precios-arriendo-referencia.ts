// Precios de arriendo de referencia para el Simulador de ingreso del dueño
// (/admin/simulador).
//
// DATO ESTÁTICO A PROPÓSITO. Nunca se pide a un servicio externo: el simulador
// se usa en una reunión, desde el celular, y no puede depender de que una API
// ajena responda. Para actualizarlo se reemplaza la tabla y `FUENTE_PRECIOS`
// entera, nunca solo los números: la fecha que ve el cliente tiene que ser la
// de los datos que ve.
//
// SON PRECIOS PEDIDOS, NO CERRADOS. Salen de avisos publicados, y la pantalla
// lo dice. Una mediana de avisos no es lo que paga un arrendatario.
//
// COBERTURA DESIGUAL, Y ES DEL INFORME, NO UN OLVIDO: Lo Barnechea solo trae
// «Todos» y Vitacura solo «Todos» y 3 dormitorios. El selector ofrece solo las
// filas que existen; por eso no hay celdas vacías que rellenar.
//
// La Reina NO está: el informe no la cubre. Una comuna fuera de esta tabla se
// trabaja con el arriendo ingresado a mano, que es el comportamiento normal
// del formulario.
//
// Este archivo no importa nada: `scripts/test-simulador.mjs` lo carga con Node
// directamente, sin Vite ni alias `@/`.

export const COMUNAS_REFERENCIA = [
  'Las Condes',
  'Lo Barnechea',
  'Ñuñoa',
  'Providencia',
  'Vitacura',
] as const

export type ComunaReferencia = typeof COMUNAS_REFERENCIA[number]

export type Dormitorios = 'todos' | '1' | '2' | '3' | '4+'

export type PrecioReferencia = {
  comuna: ComunaReferencia
  dormitorios: Dormitorios
  /** Número de avisos que respaldan la fila. */
  n: number
  /** CLP al mes. */
  p25: number
  mediana: number
  p75: number
}

export const FUENTE_PRECIOS = {
  nombre: 'Aguila Inmobiliaria',
  informe: 'informe de arriendos de Chile',
  url: 'https://aguilainmobiliaria.cl/informes/arriendos-2026-10/',
  fecha: '2026-10-10',
  fechaTexto: '10 de octubre de 2026',
} as const

// Cortas porque el selector va bajo el rótulo «Dormitorios» y, en celular,
// ocupa media pantalla: «4 o más dormitorios» no cabía.
export const ETIQUETA_DORMITORIOS: Record<Dormitorios, string> = {
  todos: 'Todos',
  '1': '1',
  '2': '2',
  '3': '3',
  '4+': '4 o más',
}

export const PRECIOS_ARRIENDO: readonly PrecioReferencia[] = [
  { comuna: 'Las Condes',   dormitorios: 'todos', n: 419, p25:   900000, mediana: 1320000, p75: 1906000 },
  { comuna: 'Las Condes',   dormitorios: '1',     n: 122, p25:   700000, mediana:  800000, p75:  987000 },
  { comuna: 'Las Condes',   dormitorios: '2',     n: 143, p25:  1039000, mediana: 1350000, p75: 1714000 },
  { comuna: 'Las Condes',   dormitorios: '3',     n: 100, p25:  1458000, mediana: 1840000, p75: 2562000 },
  { comuna: 'Las Condes',   dormitorios: '4+',    n:  50, p25:  1569000, mediana: 1860000, p75: 2630000 },

  { comuna: 'Lo Barnechea', dormitorios: 'todos', n:  56, p25:  1274000, mediana: 1511000, p75: 2272000 },

  { comuna: 'Ñuñoa',        dormitorios: 'todos', n: 591, p25:   480000, mediana:  580000, p75:  701000 },
  { comuna: 'Ñuñoa',        dormitorios: '1',     n: 258, p25:   420000, mediana:  494000, p75:  576000 },
  { comuna: 'Ñuñoa',        dormitorios: '2',     n: 256, p25:   550000, mediana:  640000, p75:  750000 },
  { comuna: 'Ñuñoa',        dormitorios: '3',     n:  70, p25:   663000, mediana:  845000, p75: 1138000 },

  { comuna: 'Providencia',  dormitorios: 'todos', n: 230, p25:   672000, mediana:  900000, p75: 1250000 },
  { comuna: 'Providencia',  dormitorios: '1',     n:  84, p25:   588000, mediana:  650000, p75:  780000 },
  { comuna: 'Providencia',  dormitorios: '2',     n:  78, p25:   835000, mediana:  983000, p75: 1300000 },
  { comuna: 'Providencia',  dormitorios: '3',     n:  53, p25:   905000, mediana: 1200000, p75: 1500000 },

  { comuna: 'Vitacura',     dormitorios: 'todos', n: 100, p25:  1604000, mediana: 2036000, p75: 3000000 },
  { comuna: 'Vitacura',     dormitorios: '3',     n:  46, p25:  1733000, mediana: 2200000, p75: 3238000 },
]

/** Solo las filas que existen para la comuna, en el orden de la tabla. */
export function filasDeComuna(comuna: ComunaReferencia): PrecioReferencia[] {
  return PRECIOS_ARRIENDO.filter(f => f.comuna === comuna)
}

export function buscarPrecio(comuna: ComunaReferencia, dormitorios: Dormitorios): PrecioReferencia | undefined {
  return PRECIOS_ARRIENDO.find(f => f.comuna === comuna && f.dormitorios === dormitorios)
}
