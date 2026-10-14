// Tests del Simulador de ingreso del dueño: el módulo de cálculo y la tabla de
// precios de referencia.
//
// `node:test`, sin dependencias. Node ≥ 22.18 importa los `.ts` quitándoles
// los tipos, así que se cargan los mismos archivos que usa la aplicación, no
// una copia. Por eso esos dos archivos no importan nada: el alias `@/` es de
// Vite y Node no lo resuelve.
//
// Correr con `npm test`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  simular, validarEntrada, HORIZONTE_MESES, COMISION_COLOCACION_PCT, ADMINISTRACION_PCT,
  MESES_SIN_ARRENDATARIO_INICIALES, FACTOR_ESCENARIO_B, arriendoEscenarioB, arriendosIniciales, puntoDeEmpate,
} from '../src/lib/simuladorIngreso.ts'
import {
  PRECIOS_ARRIENDO, COMUNAS_REFERENCIA, filasDeComuna, buscarPrecio, FUENTE_PRECIOS,
} from '../src/data/precios-arriendo-referencia.ts'

function resultado(entrada) {
  const s = simular(entrada)
  assert.equal(s.ok, true, `se esperaba un resultado válido: ${JSON.stringify(s)}`)
  return s.resultado
}

// ─── Constantes confirmadas ──────────────────────────────────────────────────

test('las constantes son las reglas confirmadas', () => {
  assert.equal(HORIZONTE_MESES, 12)
  assert.equal(COMISION_COLOCACION_PCT, 50)
  assert.equal(ADMINISTRACION_PCT, 7)
})

// ─── Cálculo ─────────────────────────────────────────────────────────────────

test('12 meses ocupados, con administración', () => {
  assert.deepEqual(resultado({ arriendo: 1_000_000, mesesSinArrendatario: 0, conAdministracion: true }), {
    mesesOcupados: 12,
    bruto: 12_000_000,
    colocacion: 500_000,
    administracion: 840_000,
    neto: 10_660_000,
  })
})

test('sin administración, la administración es 0 y no se descuenta', () => {
  assert.deepEqual(resultado({ arriendo: 1_000_000, mesesSinArrendatario: 0, conAdministracion: false }), {
    mesesOcupados: 12,
    bruto: 12_000_000,
    colocacion: 500_000,
    administracion: 0,
    neto: 11_500_000,
  })
})

test('los meses sin arrendatario restan bruto y administración, no colocación', () => {
  assert.deepEqual(resultado({ arriendo: 1_000_000, mesesSinArrendatario: 2, conAdministracion: true }), {
    mesesOcupados: 10,
    bruto: 10_000_000,
    colocacion: 500_000,
    administracion: 700_000,
    neto: 8_800_000,
  })
})

test('12 meses sin arrendatario: la colocación se cobra igual y el neto sale negativo', () => {
  assert.deepEqual(resultado({ arriendo: 1_000_000, mesesSinArrendatario: 12, conAdministracion: true }), {
    mesesOcupados: 0,
    bruto: 0,
    colocacion: 500_000,
    administracion: 0,
    neto: -500_000,
  })
})

test('arriendo 0 da todo en 0', () => {
  assert.deepEqual(resultado({ arriendo: 0, mesesSinArrendatario: 3, conAdministracion: true }), {
    mesesOcupados: 9, bruto: 0, colocacion: 0, administracion: 0, neto: 0,
  })
})

test('montos con decimales: cada línea es entera y el neto cuadra con el desglose', () => {
  // 1.320.001 × 7 % = 92.400,07 → 92.400 por mes. × 50 % = 660.000,5 → 660.001.
  const r = resultado({ arriendo: 1_320_001, mesesSinArrendatario: 1, conAdministracion: true })
  assert.equal(r.mesesOcupados, 11)
  assert.equal(r.bruto, 14_520_011)
  assert.equal(r.colocacion, 660_001)
  assert.equal(r.administracion, 92_400 * 11)
  assert.equal(r.neto, r.bruto - r.colocacion - r.administracion)
  for (const v of Object.values(r)) assert.ok(Number.isInteger(v), `${v} no es entero`)
})

test('los porcentajes se pueden pasar explícitos y aceptan 0 y 100', () => {
  const r0 = resultado({ arriendo: 500_000, mesesSinArrendatario: 0, conAdministracion: true, colocacionPct: 0, administracionPct: 0 })
  assert.equal(r0.neto, 6_000_000)
  const r100 = resultado({ arriendo: 500_000, mesesSinArrendatario: 0, conAdministracion: true, colocacionPct: 100, administracionPct: 100 })
  assert.equal(r100.neto, 6_000_000 - 500_000 - 6_000_000)
})

test('los límites 0 y 12 de meses sin arrendatario son válidos', () => {
  assert.equal(simular({ arriendo: 1, mesesSinArrendatario: 0, conAdministracion: false }).ok, true)
  assert.equal(simular({ arriendo: 1, mesesSinArrendatario: 12, conAdministracion: false }).ok, true)
})

// ─── Validación ──────────────────────────────────────────────────────────────

const base = { arriendo: 800_000, mesesSinArrendatario: 1, conAdministracion: true }

for (const [nombre, cambio] of [
  ['arriendo negativo', { arriendo: -1 }],
  ['arriendo NaN', { arriendo: NaN }],
  ['arriendo infinito', { arriendo: Infinity }],
  ['meses negativos', { mesesSinArrendatario: -1 }],
  ['meses sobre 12', { mesesSinArrendatario: 13 }],
  ['meses no enteros', { mesesSinArrendatario: 1.5 }],
  ['meses NaN', { mesesSinArrendatario: NaN }],
  ['colocación sobre 100', { colocacionPct: 101 }],
  ['colocación negativa', { colocacionPct: -1 }],
  ['administración sobre 100', { administracionPct: 100.01 }],
  ['administración negativa', { administracionPct: -0.5 }],
  ['administración NaN', { administracionPct: NaN }],
]) {
  test(`rechaza ${nombre}`, () => {
    const s = simular({ ...base, ...cambio })
    assert.equal(s.ok, false)
    assert.equal(s.errores.length, 1)
  })
}

test('junta todos los errores, no solo el primero', () => {
  assert.equal(validarEntrada({ arriendo: -1, mesesSinArrendatario: 20, conAdministracion: true, colocacionPct: 200, administracionPct: -1 }).length, 4)
})

// ─── Tabla de referencia ─────────────────────────────────────────────────────

test('la fuente trae nombre, fecha y URL', () => {
  assert.equal(FUENTE_PRECIOS.nombre, 'Aguila Inmobiliaria')
  assert.equal(FUENTE_PRECIOS.fecha, '2026-10-10')
  assert.match(FUENTE_PRECIOS.url, /^https:\/\//)
})

test('La Reina no está en la tabla', () => {
  assert.ok(!COMUNAS_REFERENCIA.includes('La Reina'))
  assert.ok(!PRECIOS_ARRIENDO.some(f => f.comuna === 'La Reina'))
})

test('cada comuna del selector tiene filas, y todas tienen «Todos»', () => {
  for (const c of COMUNAS_REFERENCIA) {
    assert.ok(filasDeComuna(c).length > 0, `${c} sin filas`)
    assert.ok(buscarPrecio(c, 'todos'), `${c} sin «Todos»`)
  }
})

test('ninguna fila es de una comuna que no está en el selector', () => {
  for (const f of PRECIOS_ARRIENDO) assert.ok(COMUNAS_REFERENCIA.includes(f.comuna), f.comuna)
})

test('la cobertura desigual queda como en el informe', () => {
  assert.deepEqual(filasDeComuna('Lo Barnechea').map(f => f.dormitorios), ['todos'])
  assert.deepEqual(filasDeComuna('Vitacura').map(f => f.dormitorios), ['todos', '3'])
  assert.deepEqual(filasDeComuna('Las Condes').map(f => f.dormitorios), ['todos', '1', '2', '3', '4+'])
  assert.deepEqual(filasDeComuna('Ñuñoa').map(f => f.dormitorios), ['todos', '1', '2', '3'])
  assert.deepEqual(filasDeComuna('Providencia').map(f => f.dormitorios), ['todos', '1', '2', '3'])
})

test('no hay filas repetidas', () => {
  const claves = PRECIOS_ARRIENDO.map(f => `${f.comuna}|${f.dormitorios}`)
  assert.equal(new Set(claves).size, claves.length)
})

test('cada fila es coherente: n > 0 y p25 ≤ mediana ≤ p75, en pesos enteros', () => {
  for (const f of PRECIOS_ARRIENDO) {
    const id = `${f.comuna} ${f.dormitorios}`
    assert.ok(Number.isInteger(f.n) && f.n > 0, id)
    for (const v of [f.p25, f.mediana, f.p75]) assert.ok(Number.isInteger(v) && v > 0, id)
    assert.ok(f.p25 <= f.mediana && f.mediana <= f.p75, id)
  }
})

test('los valores coinciden con el informe en filas de muestra', () => {
  assert.deepEqual(buscarPrecio('Las Condes', 'todos'), { comuna: 'Las Condes', dormitorios: 'todos', n: 419, p25: 900_000, mediana: 1_320_000, p75: 1_906_000 })
  assert.deepEqual(buscarPrecio('Ñuñoa', '1'), { comuna: 'Ñuñoa', dormitorios: '1', n: 258, p25: 420_000, mediana: 494_000, p75: 576_000 })
  assert.deepEqual(buscarPrecio('Vitacura', '3'), { comuna: 'Vitacura', dormitorios: '3', n: 46, p25: 1_733_000, mediana: 2_200_000, p75: 3_238_000 })
  assert.equal(buscarPrecio('Vitacura', '1'), undefined)
})

// ─── Valores iniciales ───────────────────────────────────────────────────────

test('los escenarios parten con 1 y 3 meses sin arrendatario, y son entradas válidas', () => {
  assert.deepEqual(MESES_SIN_ARRENDATARIO_INICIALES, { a: 1, b: 3 })
  for (const m of Object.values(MESES_SIN_ARRENDATARIO_INICIALES)) {
    assert.deepEqual(validarEntrada({ arriendo: 1_000_000, mesesSinArrendatario: m, conAdministracion: true }), [])
  }
})

test('B parte en la mediana más 15%, a la decena de miles más cercana', () => {
  assert.equal(FACTOR_ESCENARIO_B, 1.15)
  assert.equal(arriendoEscenarioB(1_350_000), 1_550_000) // 1.552.500 → 1.550.000
  assert.equal(arriendoEscenarioB(2_200_000), 2_530_000) // exacto
  assert.equal(arriendoEscenarioB(1_320_000), 1_520_000) // 1.518.000 → 1.520.000
  assert.equal(arriendoEscenarioB(494_000), 570_000)     // 568.100 → 570.000
  // Justo en la mitad: 1.300.000 × 1,15 = 1.495.000 → sube. En coma flotante
  // el producto sin fijar a centavos podría quedar un pelo debajo.
  assert.equal(arriendoEscenarioB(1_300_000), 1_500_000)
  assert.equal(arriendoEscenarioB(900_000), 1_040_000)     // 1.035.000, otra mitad
})

test('el selector pone la mediana en A y la mediana +15% en B, en todas las filas', () => {
  for (const f of PRECIOS_ARRIENDO) {
    const { a, b } = arriendosIniciales(f.mediana)
    const id = `${f.comuna} ${f.dormitorios}`
    assert.equal(a, f.mediana, id)
    assert.equal(b % 10_000, 0, id)
    // `+ 1e-6`: 900.000 × 1,15 da 1.034.999,9999… en coma flotante y cae justo
    // en la mitad (Providencia, «Todos» → 1.040.000).
    assert.ok(Math.abs(b - f.mediana * 1.15) <= 5_000 + 1e-6, id)
  }
})

// ─── Punto de empate ─────────────────────────────────────────────────────────

const conAdmin = { conAdministracion: true }

test('empate con los valores iniciales: Las Condes 2 dormitorios', () => {
  const { a, b } = arriendosIniciales(buscarPrecio('Las Condes', '2').mediana)
  const ea = { arriendo: a, mesesSinArrendatario: MESES_SIN_ARRENDATARIO_INICIALES.a, ...conAdmin }
  const eb = { arriendo: b, mesesSinArrendatario: MESES_SIN_ARRENDATARIO_INICIALES.b, ...conAdmin }
  const e = puntoDeEmpate(ea, eb)
  assert.equal(e.tipo, 'hasta')
  assert.equal(e.alto, 'b')
  assert.equal(e.hastaMes, 2)
  assert.equal(e.hastaMes, Math.floor(e.meses))
  // Comprobado contra el cálculo: con 2 meses B deja más que A, con 3 ya no.
  const netoA = simular(ea).resultado.neto
  assert.ok(simular({ ...eb, mesesSinArrendatario: 2 }).resultado.neto > netoA)
  assert.ok(simular({ ...eb, mesesSinArrendatario: 3 }).resultado.neto <= netoA)
  // Y en x, los dos netos son iguales: la fórmula y el cálculo coinciden.
  const admMes = Math.round(b * 0.07)
  assert.ok(Math.abs((b - admMes) * (12 - e.meses) - Math.round(b * 0.5) - netoA) < 1e-6)
})

test('empate con los valores iniciales: Vitacura 3 dormitorios', () => {
  const { a, b } = arriendosIniciales(buscarPrecio('Vitacura', '3').mediana)
  const e = puntoDeEmpate(
    { arriendo: a, mesesSinArrendatario: MESES_SIN_ARRENDATARIO_INICIALES.a, ...conAdmin },
    { arriendo: b, mesesSinArrendatario: MESES_SIN_ARRENDATARIO_INICIALES.b, ...conAdmin })
  assert.equal(e.tipo, 'hasta')
  assert.equal(e.alto, 'b')
  assert.equal(e.hastaMes, 2)
})

test('el arriendo alto puede ser A: la función no asume que es B', () => {
  const e = puntoDeEmpate(
    { arriendo: 1_740_000, mesesSinArrendatario: 0, ...conAdmin },
    { arriendo: 1_500_000, mesesSinArrendatario: 1, ...conAdmin })
  assert.equal(e.tipo, 'hasta')
  assert.equal(e.alto, 'a')
  const netoB = simular({ arriendo: 1_500_000, mesesSinArrendatario: 1, ...conAdmin }).resultado.neto
  assert.ok(simular({ arriendo: 1_740_000, mesesSinArrendatario: e.hastaMes, ...conAdmin }).resultado.neto > netoB)
  assert.ok(simular({ arriendo: 1_740_000, mesesSinArrendatario: e.hastaMes + 1, ...conAdmin }).resultado.neto <= netoB)
})

test('borde: los dos arriendos iguales no tienen punto de empate', () => {
  assert.deepEqual(puntoDeEmpate(
    { arriendo: 1_000_000, mesesSinArrendatario: 1, ...conAdmin },
    { arriendo: 1_000_000, mesesSinArrendatario: 5, ...conAdmin }), { tipo: 'iguales' })
})

test('borde: si falta un arriendo o uno no es válido, es incompleto', () => {
  const ok = { arriendo: 1_000_000, mesesSinArrendatario: 1, ...conAdmin }
  assert.deepEqual(puntoDeEmpate(null, ok), { tipo: 'incompleto' })
  assert.deepEqual(puntoDeEmpate(ok, null), { tipo: 'incompleto' })
  assert.deepEqual(puntoDeEmpate(ok, { ...ok, arriendo: -1 }), { tipo: 'incompleto' })
})

test('borde: resultado negativo — el alto pierde ya sin meses vacíos', () => {
  // Inalcanzable con 50% y 7%: hace falta que la colocación y la
  // administración se coman más de lo que suma el arriendo extra. Con 100% y
  // 95%, x = 12 − (−400.000 + 2.000.000) / 100.000 = −4.
  const pct = { colocacionPct: 100, administracionPct: 95, ...conAdmin }
  const e = puntoDeEmpate(
    { arriendo: 1_000_000, mesesSinArrendatario: 0, ...pct },
    { arriendo: 2_000_000, mesesSinArrendatario: 0, ...pct })
  assert.deepEqual(e, { tipo: 'pierde-siempre', alto: 'b' })
})

test('borde: 12 o más — el alto no deja menos en todo el rango de 12 meses', () => {
  // Un x mayor que 12 es inalcanzable con entradas válidas: con 12 meses
  // vacíos solo queda la colocación, y es mayor para el arriendo alto. El
  // borde real es x = 12, que se da con colocación 0 y el bajo sin arrendar.
  const pct = { colocacionPct: 0, conAdministracion: false }
  const e = puntoDeEmpate(
    { arriendo: 2_000_000, mesesSinArrendatario: 0, ...pct },
    { arriendo: 1_000_000, mesesSinArrendatario: 12, ...pct })
  assert.deepEqual(e, { tipo: 'conviene-siempre', alto: 'a' })
})

test('un empate exacto en un mes entero no cuenta como «conviene»', () => {
  // Sin colocación ni administración: 1.200.000 × (12 − x) = 12.000.000 → x = 2.
  // Con 2 meses los dos dejan 12.000.000: el último mes que conviene es el 1.
  const pct = { colocacionPct: 0, conAdministracion: false }
  const e = puntoDeEmpate(
    { arriendo: 1_000_000, mesesSinArrendatario: 0, ...pct },
    { arriendo: 1_200_000, mesesSinArrendatario: 0, ...pct })
  assert.equal(e.tipo, 'hasta')
  assert.equal(e.meses, 2)
  assert.equal(e.hastaMes, 1)
})
