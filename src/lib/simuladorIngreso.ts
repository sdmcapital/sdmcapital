// Cálculo del Simulador de ingreso del dueño (/admin/simulador).
//
// TODO EL CÁLCULO Y TODA LA VALIDACIÓN VIVEN ACÁ, no en la pantalla. La UI
// acota lo que se puede teclear, pero eso es comodidad: la regla de qué
// entrada es válida es ésta, y es la que cubren los tests de
// `scripts/test-simulador.mjs`.
//
// Las reglas de negocio, confirmadas:
//   - Horizonte fijo de 12 meses.
//   - meses ocupados = 12 − meses sin arrendatario, con piso en 0.
//   - bruto = arriendo × meses ocupados.
//   - Colocación = 50 % de UN mes de arriendo, una sola vez, y SE COBRA
//     SIEMPRE, incluso con 0 meses ocupados. No es una simplificación: es la
//     regla real. Por eso el neto PUEDE SALIR NEGATIVO, y se muestra así.
//   - Administración = 7 % del arriendo por cada mes ocupado, opcional.
//   - neto = bruto − colocación − administración.
//
// PESOS ENTEROS, Y CADA LÍNEA SE REDONDEA ANTES DE RESTAR. Así el neto es
// exactamente la resta de los números que ve el cliente: si se redondeara solo
// el final, el desglose podría no cuadrar por un peso. La administración se
// redondea por mes —es lo que se factura cada mes— y después se multiplica.
//
// Este archivo no importa nada: `scripts/test-simulador.mjs` lo carga con Node
// directamente, sin Vite ni alias `@/`.

export const HORIZONTE_MESES = 12
export const COMISION_COLOCACION_PCT = 50
export const ADMINISTRACION_PCT = 7

// Con los dos escenarios en 0 meses sin arrendatario, el arriendo más alto
// gana siempre y la herramienta no muestra nada. Partiendo de 1 y 3 la
// comparación queda planteada apenas se abre: pedir más cuesta meses vacíos.
export const MESES_SIN_ARRENDATARIO_INICIALES = { a: 1, b: 3 } as const

// EL ESCENARIO B PARTE EN LA MEDIANA MÁS 15 %, NO EN EL P75. El P75 no es la
// misma propiedad pedida más cara: es el cuartil alto del mercado —más
// grande, mejor ubicada o más nueva—, y compararlo con la mediana compara dos
// propiedades distintas. Con B en el P75 la pantalla abría mostrando que pedir
// más conviene aunque haya 3 meses vacíos (en Vitacura, por $ 4.077.060). El
// P75 sigue a un toque en los atajos de cada escenario.
export const FACTOR_ESCENARIO_B = 1.15

/**
 * Mediana × `FACTOR_ESCENARIO_B`, a la decena de miles más cercana.
 *
 * Primero se fija el producto a centavos: `1.350.000 × 1,15` da en coma
 * flotante 1.552.499,9999… y no 1.552.500, y en un caso que cae justo en la
 * mitad de una decena de miles ese residuo decidiría hacia dónde redondea.
 */
export function arriendoEscenarioB(mediana: number): number {
  const conFactor = Math.round(mediana * FACTOR_ESCENARIO_B * 100) / 100
  return Math.round(conFactor / 10_000) * 10_000
}

/** Los arriendos con que el selector plantea la comparación. */
export function arriendosIniciales(mediana: number): { a: number; b: number } {
  return { a: mediana, b: arriendoEscenarioB(mediana) }
}

export type EntradaSimulacion = {
  /** Arriendo mensual en CLP. */
  arriendo: number
  /** Meses del horizonte sin arrendatario, entero entre 0 y 12. */
  mesesSinArrendatario: number
  conAdministracion: boolean
  /** Por defecto `COMISION_COLOCACION_PCT`. */
  colocacionPct?: number
  /** Por defecto `ADMINISTRACION_PCT`. */
  administracionPct?: number
}

export type ResultadoSimulacion = {
  mesesOcupados: number
  bruto: number
  colocacion: number
  /** 0 cuando la administración no está incluida. */
  administracion: number
  /** Puede ser negativo: la colocación se cobra aunque no haya meses ocupados. */
  neto: number
}

export type Simulacion =
  | { ok: true; resultado: ResultadoSimulacion }
  | { ok: false; errores: string[] }

function esPorcentajeValido(pct: number): boolean {
  return Number.isFinite(pct) && pct >= 0 && pct <= 100
}

export function validarEntrada(e: EntradaSimulacion): string[] {
  const errores: string[] = []
  const colocacionPct = e.colocacionPct ?? COMISION_COLOCACION_PCT
  const administracionPct = e.administracionPct ?? ADMINISTRACION_PCT

  // `Number.isFinite` descarta NaN e Infinity, que pasan cualquier comparación
  // con `>=` de forma engañosa (NaN >= 0 es false, pero Infinity >= 0 es true).
  if (!Number.isFinite(e.arriendo) || e.arriendo < 0) {
    errores.push('El arriendo tiene que ser un monto igual o mayor que 0.')
  }
  if (!Number.isInteger(e.mesesSinArrendatario)
      || e.mesesSinArrendatario < 0
      || e.mesesSinArrendatario > HORIZONTE_MESES) {
    errores.push(`Los meses sin arrendatario tienen que ser un número entero entre 0 y ${HORIZONTE_MESES}.`)
  }
  if (!esPorcentajeValido(colocacionPct)) {
    errores.push('El porcentaje de colocación tiene que estar entre 0 y 100.')
  }
  if (!esPorcentajeValido(administracionPct)) {
    errores.push('El porcentaje de administración tiene que estar entre 0 y 100.')
  }
  return errores
}

export function simular(e: EntradaSimulacion): Simulacion {
  const errores = validarEntrada(e)
  if (errores.length > 0) return { ok: false, errores }

  const colocacionPct = e.colocacionPct ?? COMISION_COLOCACION_PCT
  const administracionPct = e.administracionPct ?? ADMINISTRACION_PCT

  const mesesOcupados = Math.max(0, HORIZONTE_MESES - e.mesesSinArrendatario)
  const bruto = Math.round(e.arriendo * mesesOcupados)
  const colocacion = Math.round(e.arriendo * colocacionPct / 100)
  const administracion = e.conAdministracion
    ? Math.round(e.arriendo * administracionPct / 100) * mesesOcupados
    : 0
  const neto = bruto - colocacion - administracion

  return { ok: true, resultado: { mesesOcupados, bruto, colocacion, administracion, neto } }
}

// ─── PUNTO DE EMPATE ─────────────────────────────────────────────────────────
//
// ¿Con cuántos meses sin arrendatario el escenario de arriendo MÁS ALTO deja
// exactamente lo mismo que el más bajo, con los meses vacíos del más bajo
// fijos? Cuál es el alto lo decide lo que se haya escrito: puede ser A o B.
//
// La fórmula es la del prototipo, con la política de redondeo de este módulo.
// Para el arriendo alto H, con su administración mensual ya redondeada:
//
//   neto(x) = (H − administraciónMes) × (12 − x) − colocación
//
// que es lineal en x. Igualándolo al neto del bajo:
//
//   x = 12 − (netoBajo + colocación) / (H − administraciónMes)
//
// `meses` es ese x, continuo. `hastaMes` es el último mes ENTERO en que el alto
// todavía deja estrictamente más, y no se deduce de x sino que se comprueba
// con `simular()` mes a mes: así nunca discrepa del desglose que ve el
// cliente. Coincide con `Math.floor(x)` salvo en un empate exacto en un mes
// entero, donde ese mes deja lo mismo y no cuenta como «conviene».
//
// LOS DOS CASOS EXTREMOS NO OCURREN CON 50 % Y 7 %, y conviene saberlo:
//   - 'pierde-siempre' exige que el alto deje menos que el bajo ya con 0 meses
//     vacíos. Con los porcentajes reales, más arriendo con 0 meses siempre deja
//     más. Solo aparece con porcentajes extremos.
//   - 'conviene-siempre' exige que el alto no deje menos ni con 12 meses vacíos.
//     Con 12 meses vacíos el bruto es 0 y solo queda la colocación, que es
//     mayor para el arriendo alto: el alto pierde salvo que la colocación sea 0,
//     y aun así llega a empatar, nunca a ganar. Un x mayor que 12 es
//     inalcanzable con entradas válidas; el borde real es x = 12.
// Se manejan igual, porque los porcentajes son parámetros del módulo.

export type NombreEscenario = 'a' | 'b'

export type Empate =
  /** Falta un escenario o alguno no es válido. */
  | { tipo: 'incompleto' }
  /** Los dos arriendos son iguales: no hay un «más alto». */
  | { tipo: 'iguales' }
  /** El alto deja lo mismo o menos ya sin meses vacíos. */
  | { tipo: 'pierde-siempre'; alto: NombreEscenario }
  /** El alto no deja menos en ningún punto de los 12 meses. */
  | { tipo: 'conviene-siempre'; alto: NombreEscenario }
  | { tipo: 'hasta'; alto: NombreEscenario; meses: number; hastaMes: number }

function netoDe(e: EntradaSimulacion): number {
  const s = simular(e)
  return s.ok ? s.resultado.neto : NaN
}

export function puntoDeEmpate(a: EntradaSimulacion | null, b: EntradaSimulacion | null): Empate {
  if (!a || !b || validarEntrada(a).length > 0 || validarEntrada(b).length > 0) return { tipo: 'incompleto' }
  if (a.arriendo === b.arriendo) return { tipo: 'iguales' }

  const alto: NombreEscenario = a.arriendo > b.arriendo ? 'a' : 'b'
  const caro = alto === 'a' ? a : b
  const barato = alto === 'a' ? b : a
  const netoBarato = netoDe(barato)
  const netoCaroCon = (meses: number) => netoDe({ ...caro, mesesSinArrendatario: meses })

  if (netoCaroCon(0) <= netoBarato) return { tipo: 'pierde-siempre', alto }
  if (netoCaroCon(HORIZONTE_MESES) >= netoBarato) return { tipo: 'conviene-siempre', alto }

  // neto(x) no crece con x, así que los meses que convienen son un tramo que
  // empieza en 0. El 0 ya se comprobó arriba.
  let hastaMes = 0
  while (hastaMes + 1 < HORIZONTE_MESES && netoCaroCon(hastaMes + 1) > netoBarato) hastaMes++

  const colocacion = Math.round(caro.arriendo * (caro.colocacionPct ?? COMISION_COLOCACION_PCT) / 100)
  const administracionMes = caro.conAdministracion
    ? Math.round(caro.arriendo * (caro.administracionPct ?? ADMINISTRACION_PCT) / 100)
    : 0
  const meses = HORIZONTE_MESES - (netoBarato + colocacion) / (caro.arriendo - administracionMes)

  return { tipo: 'hasta', alto, meses, hastaMes }
}
