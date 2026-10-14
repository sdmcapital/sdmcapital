import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LoginForm from '@/components/admin/LoginForm'
import {
  simular, puntoDeEmpate, arriendosIniciales,
  HORIZONTE_MESES, COMISION_COLOCACION_PCT, ADMINISTRACION_PCT, MESES_SIN_ARRENDATARIO_INICIALES, FACTOR_ESCENARIO_B,
} from '@/lib/simuladorIngreso'
import type { Empate, EntradaSimulacion, Simulacion } from '@/lib/simuladorIngreso'
import {
  COMUNAS_REFERENCIA, ETIQUETA_DORMITORIOS, FUENTE_PRECIOS, buscarPrecio, filasDeComuna,
} from '@/data/precios-arriendo-referencia'
import type { ComunaReferencia, Dormitorios, PrecioReferencia } from '@/data/precios-arriendo-referencia'

// Simulador de ingreso del dueño — /admin/simulador.
//
// Se usa desde el celular, de pie, frente a un propietario: compara cuánto le
// queda en 12 meses con dos arriendos distintos y los meses sin arrendatario
// de cada uno. Por eso:
//   - Pantalla completa, sin el sidebar ni el menú del panel.
//   - Todo se calcula en el navegador con `simular()`. Nada se guarda ni se
//     envía: no hay escrituras a Supabase, ni datos de contacto, ni Sofía.
//   - Las validaciones son de `src/lib/simuladorIngreso.ts`. Esta pantalla solo
//     acota lo que se puede teclear (dígitos, meses con − y +).
//   - Los precios de referencia son de `src/data/precios-arriendo-referencia.ts`,
//     estáticos. La fuente, la fecha y que son precios de aviso van en el pie,
//     que está siempre visible.

// ── Auth ──────────────────────────────────────────────────────────────────────
// Copia del patrón de las demás páginas de /admin, sin cambios.
function useAdminAuth() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setChecking(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s))
    return () => subscription.unsubscribe()
  }, [])
  return { authed, checking }
}

// ── Formato ───────────────────────────────────────────────────────────────────
// Punto de miles escrito a mano y no con `Intl.NumberFormat('es-CL')`: el
// español no agrupa los números de cuatro cifras («5000», no «5.000»), así que
// mientras se teclea un arriendo el separador aparecería recién en la quinta
// cifra. Acá siempre agrupa.
function miles(n: number): string {
  return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** «$ 1.320.000», y «−$ 500.000» con el signo menos tipográfico. */
function pesos(n: number): string {
  return `${n < 0 ? '−' : ''}$ ${miles(n)}`
}

function nMeses(n: number): string {
  return `${n} ${n === 1 ? 'mes' : 'meses'}`
}

// Diez cifras: hasta $ 9.999.999.999. Ningún arriendo se acerca, y el tope
// impide que un dedo apoyado en el teclado lleve el número fuera de los
// enteros exactos de JavaScript.
const MAX_DIGITOS = 10

type Escenario = {
  /** Solo dígitos; '' mientras no se ha ingresado. */
  arriendo: string
  mesesSin: number
}

const NOMBRES = ['A', 'B'] as const

// ─── LOS COMPONENTES VAN A NIVEL DE MÓDULO ───────────────────────────────────
// Nunca dentro de `Simulador`: ver la regla de `src/components/admin/layout.tsx`.

const rotulo = 'text-sdm-xs tracking-sdm-wide uppercase'

// ── Campo de arriendo ─────────────────────────────────────────────────────────
// Muestra el monto con puntos de miles mientras se escribe. Al reformatear,
// React deja el cursor al final; el efecto lo devuelve detrás de la misma
// cantidad de dígitos que tenía delante, para que corregir una cifra del medio
// no mande el cursor al final.
function CampoArriendo({ escenario, valor, onCambio }: {
  escenario: string
  valor: string
  onCambio: (digitos: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const digitosAntesDelCursor = useRef<number | null>(null)
  const mostrado = valor === '' ? '' : miles(Number(valor))

  useLayoutEffect(() => {
    const el = input.current
    const n = digitosAntesDelCursor.current
    digitosAntesDelCursor.current = null
    if (!el || n === null || document.activeElement !== el) return
    let pos = 0
    for (let quedan = n; pos < mostrado.length && quedan > 0; pos++) {
      if (/\d/.test(mostrado[pos])) quedan--
    }
    el.setSelectionRange(pos, pos)
  }, [mostrado])

  return (
    <label className="flex flex-col gap-1.5">
      <span className={rotulo} style={{ color: 'var(--muted)' }}>Arriendo mensual</span>
      <span className="flex items-baseline gap-2">
        <span aria-hidden="true" className="font-serif text-[2rem] leading-none" style={{ color: 'var(--navy-dark)' }}>$</span>
        <input
          ref={input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          aria-label={`Arriendo mensual del escenario ${escenario}, en pesos`}
          placeholder="0"
          value={mostrado}
          onChange={e => {
            const crudo = e.target.value
            const cursor = e.target.selectionStart ?? crudo.length
            digitosAntesDelCursor.current = crudo.slice(0, cursor).replace(/\D/g, '').length
            onCambio(crudo.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITOS))
          }}
          className="input-line text-[1.75rem] font-sdm-normal tabular-nums"
          style={{ color: 'var(--navy-dark)' }}
        />
      </span>
    </label>
  )
}

// ── Atajos a p25 / mediana / p75 ──────────────────────────────────────────────
function AtajosReferencia({ referencia, valor, onElegir }: {
  referencia: PrecioReferencia
  valor: string
  onElegir: (monto: number) => void
}) {
  const atajos = [
    { etiqueta: 'P25', monto: referencia.p25 },
    { etiqueta: 'Mediana', monto: referencia.mediana },
    { etiqueta: 'P75', monto: referencia.p75 },
  ]
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Usar un valor de referencia">
      {atajos.map(a => {
        const activo = valor === String(a.monto)
        return (
          <button key={a.etiqueta} type="button" aria-pressed={activo} onClick={() => onElegir(a.monto)}
            className={`min-h-[44px] px-1 py-1.5 flex flex-col items-center justify-center rounded-sdm-control border transition-colors duration-sdm-rapido ${
              activo
                ? 'bg-[var(--navy-dark)] border-[var(--navy-dark)] text-white'
                : 'bg-white border-[var(--border-input)] text-[var(--navy-dark)] hover:bg-[var(--sky-pale)] active:bg-[var(--sky-light)]'
            }`}>
            <span className="text-sdm-xs tracking-sdm-wide uppercase">{a.etiqueta}</span>
            <span className="text-sdm-sm font-sdm-medio tabular-nums">{pesos(a.monto)}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Meses sin arrendatario ────────────────────────────────────────────────────
const botonPaso =
  'h-12 w-12 shrink-0 inline-flex items-center justify-center rounded-sdm-control border border-[var(--border-input)] ' +
  'bg-white text-[var(--navy-dark)] hover:bg-[var(--sky-pale)] active:bg-[var(--sky-light)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-sdm-rapido'

function PasoMeses({ escenario, valor, onCambio }: {
  escenario: string
  valor: number
  onCambio: (meses: number) => void
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5">
      <span id={id} className={rotulo} style={{ color: 'var(--muted)' }}>Meses sin arrendatario</span>
      <div className="flex items-center gap-3">
        <button type="button" className={botonPaso} disabled={valor <= 0}
          aria-label={`Un mes menos sin arrendatario en el escenario ${escenario}`}
          onClick={() => onCambio(valor - 1)}>
          <Minus aria-hidden="true" size={22} strokeWidth={2} />
        </button>
        <output className="font-serif text-[2.75rem] leading-none lining-nums tabular-nums min-w-[3.5rem] text-center" style={{ color: 'var(--navy-dark)' }}>
          {valor}
        </output>
        <button type="button" className={botonPaso} disabled={valor >= HORIZONTE_MESES}
          aria-label={`Un mes más sin arrendatario en el escenario ${escenario}`}
          onClick={() => onCambio(valor + 1)}>
          <Plus aria-hidden="true" size={22} strokeWidth={2} />
        </button>
        <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>de {HORIZONTE_MESES}</span>
      </div>
    </div>
  )
}

// ── Interruptor de administración ─────────────────────────────────────────────
// Toda la fila es el botón: el blanco táctil mide el ancho de la tarjeta y
// 48 px de alto, no solo la pista. Encendido se distingue por la POSICIÓN de la
// perilla además del color, y la pista apagada lleva borde de control (3:1).
function InterruptorAdministracion({ activo, onCambio }: { activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onCambio(!activo)}
      className="w-full min-h-[48px] flex items-center justify-between gap-4 text-left">
      <span className="flex flex-col">
        <span className="text-sdm-lg font-sdm-medio" style={{ color: 'var(--navy-dark)' }}>Administración SDM</span>
        <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>{ADMINISTRACION_PCT}% de cada mes arrendado</span>
      </span>
      <span aria-hidden="true"
        className={`relative shrink-0 w-[3.25rem] h-8 rounded-full border transition-colors duration-sdm-normal ${
          activo ? 'bg-[var(--green-dark)] border-[var(--green-dark)]' : 'bg-white border-[var(--border-input)]'
        }`}>
        <span className={`absolute top-[3px] h-6 w-6 rounded-full transition-all duration-sdm-normal ${
          activo ? 'left-[calc(100%-1.5rem-3px)] bg-white' : 'left-[3px] bg-[var(--border-input)]'
        }`} />
      </span>
    </button>
  )
}

// ── Desglose y neto de un escenario ───────────────────────────────────────────
function Fila({ etiqueta, monto, fuerte = false }: { etiqueta: string; monto: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={fuerte ? 'text-sdm-base font-sdm-semi' : 'text-sdm-base'} style={{ color: fuerte ? 'var(--navy-dark)' : 'var(--ink)' }}>{etiqueta}</dt>
      <dd className={`tabular-nums whitespace-nowrap ${fuerte ? 'text-sdm-lg font-sdm-semi' : 'text-sdm-base'}`} style={{ color: 'var(--navy-dark)' }}>{monto}</dd>
    </div>
  )
}

function Resultado({ simulacion, conAdministracion }: { simulacion: Simulacion | null; conAdministracion: boolean }) {
  // Panel oscuro: el neto es el número que el propietario tiene que ver de
  // lejos. Sobre `--navy-dark` el blanco da 15,71:1 y `--sky` 8,68:1; el filete
  // superior es `--green` y está sobre oscuro, como pide §4.2.
  const panel = (
    <div className="rounded-sdm-contenedor px-5 py-4 border-t-[3px]" style={{ background: 'var(--navy-dark)', borderTopColor: 'var(--green)' }}>
      <div className={rotulo} style={{ color: 'var(--sky)' }}>Te queda en {HORIZONTE_MESES} meses</div>
      <div className="font-serif font-sdm-ligero text-[2.25rem] lg:text-[2.75rem] leading-tight lining-nums tabular-nums text-white mt-1">
        {simulacion?.ok ? pesos(simulacion.resultado.neto) : '—'}
      </div>
    </div>
  )

  if (!simulacion) {
    return (
      <div className="flex flex-col gap-3">
        {panel}
        <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Ingresa el arriendo para ver el cálculo.</p>
      </div>
    )
  }
  // `=== false` y no `!simulacion.ok`: con `strict: false` en tsconfig la
  // negación no estrecha la unión y `errores` no existiría para el compilador.
  if (simulacion.ok === false) {
    return (
      <div className="flex flex-col gap-3">
        {panel}
        <ul className="text-sdm-sm" style={{ color: 'var(--error)' }}>
          {simulacion.errores.map(e => <li key={e}>{e}</li>)}
        </ul>
      </div>
    )
  }

  const r = simulacion.resultado
  return (
    <div className="flex flex-col gap-3">
      {panel}
      <dl className="divide-y divide-[var(--border)]">
        <Fila etiqueta={`Arriendo × ${nMeses(r.mesesOcupados)}`} monto={pesos(r.bruto)} />
        <Fila etiqueta={`Comisión de colocación (${COMISION_COLOCACION_PCT}% de un mes)`} monto={pesos(-r.colocacion)} />
        {conAdministracion
          ? <Fila etiqueta={`Administración (${ADMINISTRACION_PCT}% × ${nMeses(r.mesesOcupados)})`} monto={pesos(-r.administracion)} />
          : <Fila etiqueta="Administración" monto="No incluida" />}
        <Fila etiqueta="Neto" monto={pesos(r.neto)} fuerte />
      </dl>
    </div>
  )
}

// ── Tarjeta de escenario ──────────────────────────────────────────────────────
function TarjetaEscenario({ nombre, escenario, referencia, simulacion, conAdministracion, onCambio }: {
  nombre: string
  escenario: Escenario
  referencia: PrecioReferencia | undefined
  simulacion: Simulacion | null
  conAdministracion: boolean
  onCambio: (cambio: Partial<Escenario>) => void
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="bg-white border border-[var(--border)] rounded-sdm-contenedor p-4 md:p-6 flex flex-col gap-5">
      <h2 id={id} className="font-serif font-sdm-ligero text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>
        Escenario {nombre}
      </h2>
      <div className="flex flex-col gap-3">
        <CampoArriendo escenario={nombre} valor={escenario.arriendo} onCambio={arriendo => onCambio({ arriendo })} />
        {referencia && (
          <AtajosReferencia referencia={referencia} valor={escenario.arriendo}
            onElegir={monto => onCambio({ arriendo: String(monto) })} />
        )}
      </div>
      <PasoMeses escenario={nombre} valor={escenario.mesesSin} onCambio={mesesSin => onCambio({ mesesSin })} />
      <Resultado simulacion={simulacion} conAdministracion={conAdministracion} />
    </section>
  )
}

// ── Referencia de mercado ─────────────────────────────────────────────────────
function SelectorReferencia({ comuna, dormitorios, referencia, onComuna, onDormitorios }: {
  comuna: ComunaReferencia | ''
  dormitorios: Dormitorios
  referencia: PrecioReferencia | undefined
  onComuna: (valor: string) => void
  onDormitorios: (d: Dormitorios) => void
}) {
  const id = useId()
  return (
    // COMPACTO EN CELULAR A PROPÓSITO. En 375×667, debajo de esta tarjeta y del
    // interruptor tiene que caber entera la «Diferencia» sin hacer scroll: es el
    // número que resuelve la conversación. Por eso en celular el rótulo de la
    // sección queda solo para el lector de pantalla, los dos selectores van
    // lado a lado y la línea de avisos es una sola.
    <section aria-labelledby={id} className="bg-white border border-[var(--border)] rounded-sdm-contenedor p-4 md:p-6 flex flex-col gap-3 md:gap-4">
      <h2 id={id} className={`${rotulo} sr-only md:not-sr-only`} style={{ color: 'var(--muted)' }}>Referencia de mercado</h2>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <label className={`flex flex-col gap-1 ${comuna ? '' : 'col-span-2'}`}>
          <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Comuna</span>
          <select className="input-line" value={comuna} onChange={e => onComuna(e.target.value)}>
            <option value="">Otra comuna · arriendo a mano</option>
            {COMUNAS_REFERENCIA.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {/* Solo las filas que el informe trae para esa comuna: Lo Barnechea
            tiene una sola y Vitacura dos. Nunca una opción sin datos. */}
        {comuna && (
          <label className="flex flex-col gap-1">
            <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Dormitorios</span>
            <select className="input-line" value={dormitorios} onChange={e => onDormitorios(e.target.value as Dormitorios)}>
              {filasDeComuna(comuna).map(f => (
                <option key={f.dormitorios} value={f.dormitorios}>{ETIQUETA_DORMITORIOS[f.dormitorios]}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {referencia ? (
        <div className="flex flex-col gap-1.5 md:gap-2">
          <dl className="grid grid-cols-3 gap-2">
            {[
              { etiqueta: 'P25', monto: referencia.p25 },
              { etiqueta: 'Mediana', monto: referencia.mediana },
              { etiqueta: 'P75', monto: referencia.p75 },
            ].map(c => (
              <div key={c.etiqueta} className="flex flex-col gap-0.5 rounded-sdm-control px-2 py-1 md:py-2" style={{ background: 'var(--sky-pale)' }}>
                <dt className="text-sdm-xs tracking-sdm-wide uppercase" style={{ color: 'var(--muted)' }}>{c.etiqueta}</dt>
                <dd className="text-sdm-sm md:text-sdm-base font-sdm-semi tabular-nums whitespace-nowrap" style={{ color: 'var(--navy-dark)' }}>{pesos(c.monto)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
            {referencia.n} avisos · A parte en la mediana y B un {Math.round((FACTOR_ESCENARIO_B - 1) * 100)}% sobre ella
          </p>
        </div>
      ) : (
        <p className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
          Sin referencia: ingresa los arriendos a mano.
        </p>
      )}
    </section>
  )
}

// ── Diferencia entre escenarios ───────────────────────────────────────────────
// Va ARRIBA de las tarjetas, debajo del interruptor: en celular tiene que verse
// sin scroll, y por eso repite los dos arriendos con sus meses sin
// arrendatario. Así el propietario lee la comparación completa en una pantalla,
// y Roberto mueve los meses más abajo mientras conversa.
//
// El monto y quién gana van en UNA fila —«$ 1.494.900 a favor de A»— y no
// como titular más monto: con «A deja más que B» al lado, el monto no cabía en
// 375 px y bajaba a otra línea. Esa fila es la que deja sitio a la línea del
// punto de empate sin que el bloque se meta bajo el pie en 375×667.

/**
 * El punto de empate en una línea. Aritmética sobre supuestos editables, no una
 * predicción: por eso dice «conviene con hasta N meses», nunca cuánto tardará
 * en arrendarse. `null` cuando no hay nada que decir — los dos arriendos
 * iguales, o falta uno.
 */
function textoEmpate(empate: Empate): string | null {
  if (empate.tipo === 'incompleto' || empate.tipo === 'iguales') return null
  const alto = empate.alto.toUpperCase()
  const bajo = empate.alto === 'a' ? 'B' : 'A'
  if (empate.tipo === 'pierde-siempre') return `${alto} deja menos que ${bajo} aunque se arriende sin meses vacíos.`
  if (empate.tipo === 'conviene-siempre') return `${alto} conviene en todo el rango de ${HORIZONTE_MESES} meses.`
  if (empate.hastaMes === 0) return `${alto} conviene solo si se arrienda sin meses vacíos.`
  return `${alto} conviene con hasta ${nMeses(empate.hastaMes)} sin arrendatario.`
}

function Diferencia({ escenarios, simulaciones, empate }: {
  escenarios: [Escenario, Escenario]
  simulaciones: (Simulacion | null)[]
  empate: Empate
}) {
  const [a, b] = simulaciones
  const ambos = !!(a?.ok && b?.ok)
  let titular: string
  let monto: string | null = null
  if (a?.ok && b?.ok) {
    const d = b.resultado.neto - a.resultado.neto
    if (d === 0) {
      titular = 'Los dos dejan lo mismo'
    } else {
      titular = `a favor de ${d > 0 ? 'B' : 'A'}`
      monto = pesos(Math.abs(d))
    }
  } else {
    titular = 'Ingresa los dos arriendos para compararlos'
  }
  const lineaEmpate = ambos ? textoEmpate(empate) : null
  return (
    <section aria-live="polite" className="bg-white border border-[var(--border)] rounded-sdm-contenedor p-4 md:p-6 flex flex-col gap-1">
      <h2 className={rotulo} style={{ color: 'var(--muted)' }}>Diferencia en {HORIZONTE_MESES} meses</h2>
      {ambos && (
        <dl className="flex flex-col text-sdm-sm md:text-sdm-base" style={{ color: 'var(--ink)' }}>
          {NOMBRES.map((nombre, i) => (
            <div key={nombre} className="flex gap-2">
              <dt className="font-sdm-semi" style={{ color: 'var(--navy-dark)' }}>{nombre}</dt>
              <dd className="tabular-nums">
                {pesos(Number(escenarios[i].arriendo))} · {nMeses(escenarios[i].mesesSin)} sin arrendatario
              </dd>
            </div>
          ))}
        </dl>
      )}
      {monto ? (
        <p className="flex flex-wrap items-baseline gap-x-2" style={{ color: 'var(--navy-dark)' }}>
          <span className="font-serif font-sdm-ligero text-[2.25rem] md:text-[2.75rem] leading-tight lining-nums tabular-nums">{monto}</span>
          <span className="text-sdm-lg">{titular}</span>
        </p>
      ) : (
        <p className="text-sdm-lg" style={{ color: 'var(--navy-dark)' }}>{titular}</p>
      )}
      {lineaEmpate && (
        <p className="text-sdm-sm md:text-sdm-base" style={{ color: 'var(--ink)' }}>{lineaEmpate}</p>
      )}
    </section>
  )
}

// ── Pie ───────────────────────────────────────────────────────────────────────
// `sticky` al fondo del contenedor de la página, que mide todo el contenido:
// queda visible en cualquier punto del scroll sin tener que reservarle un
// relleno al contenido, como haría `fixed`.
function PieFuente() {
  return (
    <footer className="sticky bottom-0 z-30 bg-white border-t border-[var(--border)]"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
      {/* Un solo párrafo y no dos: partido en dos, el primero terminaba en una
          línea casi vacía que en 375 px le costaba al contenido 16 px de alto. */}
      <p className="max-w-5xl mx-auto px-4 md:px-8 pt-2.5 text-sdm-xs md:text-sdm-sm" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
        Fuente:{' '}
        <a href={FUENTE_PRECIOS.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--navy)' }}>
          {FUENTE_PRECIOS.nombre}, {FUENTE_PRECIOS.informe}
        </a>
        {' · '}datos al {FUENTE_PRECIOS.fechaTexto} · precios publicados en avisos, no arriendos cerrados.
        {' '}Es un supuesto editable: no es una tasación ni una promesa de cuánto tardará en arrendarse la propiedad.
      </p>
    </footer>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Simulador() {
  const { authed, checking } = useAdminAuth()

  // EL ESTADO VIVE ACÁ, POR ENCIMA DE LAS GUARDAS, y no en los componentes de
  // abajo. Si la sesión expira a mitad de la reunión, `useAdminAuth` pasa a
  // `authed = false` y la página muestra el login, pero este componente sigue
  // montado: al volver a entrar, los números están donde quedaron. Con el
  // estado en los hijos, el login los desmontaría y se perdería todo.
  //
  // Y TODOS LOS HOOKS VAN ANTES DE LA PRIMERA GUARDA: ver el error #310 que
  // documenta `Agentes.tsx`.
  const [escenarios, setEscenarios] = useState<[Escenario, Escenario]>([
    { arriendo: '', mesesSin: MESES_SIN_ARRENDATARIO_INICIALES.a },
    { arriendo: '', mesesSin: MESES_SIN_ARRENDATARIO_INICIALES.b },
  ])
  const [conAdministracion, setConAdministracion] = useState(true)
  const [comuna, setComuna] = useState<ComunaReferencia | ''>('')
  const [dormitorios, setDormitorios] = useState<Dormitorios>('todos')

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-dark)' }}>
      <div className="font-serif italic text-sdm-xl" style={{ color: 'rgba(255,255,255,0.7)' }}>Verificando sesión…</div>
    </div>
  )
  if (!authed) return <LoginForm />

  const referencia = comuna ? buscarPrecio(comuna, dormitorios) : undefined

  const cambiarEscenario = (i: 0 | 1, cambio: Partial<Escenario>) =>
    setEscenarios(prev => {
      const sig: [Escenario, Escenario] = [prev[0], prev[1]]
      sig[i] = { ...prev[i], ...cambio }
      return sig
    })

  // Elegir comuna o dormitorios llena LOS DOS arriendos de una vez: A en la
  // mediana y B un 15 % sobre ella (`arriendosIniciales`). Los meses sin
  // arrendatario no se tocan. Los dos montos siguen editables, a mano o con los
  // atajos, y el P75 sigue a un toque.
  const usarReferencia = (fila: PrecioReferencia | undefined) => {
    if (!fila) return
    const { a, b } = arriendosIniciales(fila.mediana)
    setEscenarios(prev => [{ ...prev[0], arriendo: String(a) }, { ...prev[1], arriendo: String(b) }])
  }
  const elegirComuna = (valor: string) => {
    const c = COMUNAS_REFERENCIA.find(x => x === valor) ?? ''
    setComuna(c)
    setDormitorios('todos')
    if (c) usarReferencia(buscarPrecio(c, 'todos'))
  }
  const elegirDormitorios = (d: Dormitorios) => {
    setDormitorios(d)
    if (comuna) usarReferencia(buscarPrecio(comuna, d))
  }

  const entradas: (EntradaSimulacion | null)[] = escenarios.map(e => e.arriendo === ''
    ? null
    : { arriendo: Number(e.arriendo), mesesSinArrendatario: e.mesesSin, conAdministracion })
  const simulaciones = entradas.map(e => e ? simular(e) : null)
  const empate = puntoDeEmpate(entradas[0], entradas[1])

  return (
    <div className="min-h-screen supports-[height:100dvh]:min-h-[100dvh] flex flex-col" style={{ background: 'var(--off)' }}>
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-2.5 md:py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="logo-stripes"><div className="logo-stripe logo-stripe--sky" /><div className="logo-stripe logo-stripe--green" /><div className="logo-stripe logo-stripe--navy" /></div>
            <span className="font-serif text-sdm-xl tracking-sdm-wide" style={{ color: 'var(--navy-dark)' }}>SDM Capital</span>
          </div>
          <Link to="/admin" className="area-44 inline-flex items-center gap-1.5 text-sdm-sm" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            <ArrowLeft aria-hidden="true" size={16} /> Panel
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-8 flex flex-col gap-3 md:gap-6">
        <div>
          <h1 className="font-serif font-sdm-ligero text-sdm-display-sm md:text-sdm-display-md lining-nums" style={{ color: 'var(--navy-dark)' }}>
            ¿Cuánto te queda en {HORIZONTE_MESES} meses?
          </h1>
          <p className="hidden md:block text-sdm-base mt-2" style={{ color: 'var(--muted)' }}>
            Compara dos arriendos y los meses que la propiedad podría pasar sin arrendatario.
          </p>
        </div>

        <SelectorReferencia comuna={comuna} dormitorios={dormitorios} referencia={referencia}
          onComuna={elegirComuna} onDormitorios={elegirDormitorios} />

        <section aria-label="Supuestos" className="bg-white border border-[var(--border)] rounded-sdm-contenedor px-4 md:px-6 md:py-2">
          <InterruptorAdministracion activo={conAdministracion} onCambio={setConAdministracion} />
        </section>

        <Diferencia escenarios={escenarios} simulaciones={simulaciones} empate={empate} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {NOMBRES.map((nombre, i) => (
            <TarjetaEscenario key={nombre} nombre={nombre} escenario={escenarios[i]} referencia={referencia}
              simulacion={simulaciones[i]} conAdministracion={conAdministracion}
              onCambio={cambio => cambiarEscenario(i as 0 | 1, cambio)} />
          ))}
        </div>
      </main>

      <PieFuente />
    </div>
  )
}
