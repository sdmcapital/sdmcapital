import { useId, useRef } from 'react'

// Piezas de formulario compartidas por `SolicitudCreditoForm` y
// `SolicitudCreditoModal`. Mismo papel que `src/components/admin/campos.tsx`
// para el admin, y misma convención: exports con nombre, componentes a nivel de
// módulo.

// El estilo del rótulo de un campo. Vive acá y no en el formulario porque lo
// usan los dos: el <span> de cada <label> y el rótulo del propio `RadioGroup`,
// que tienen que verse idénticos.
export const labelStyle: React.CSSProperties = {
  fontSize: 'var(--sdm-text-xs)', fontWeight: 500, letterSpacing: 'var(--sdm-tracking-wide)', textTransform: 'uppercase', color: 'var(--muted)',
}

export interface OpcionRadio { value: string; label: string }

export function RadioGroup({ label, options, value, onChange, superficie = 'clara', rotuloOculto = false }: {
  label: string
  options: OpcionRadio[]
  value: string
  onChange: (v: string) => void
  /** `oscura` = el panel navy del modal. Cambia SOLO los colores, no la geometría. */
  superficie?: 'clara' | 'oscura'
  /** El rótulo sigue siendo el nombre accesible del grupo; deja de pintarse. */
  rotuloOculto?: boolean
}) {
  // Opciones mutuamente excluyentes con un solo valor: el patrón es
  // `radiogroup` con `radio`, no un grupo de botones sueltos.
  //
  // TABULACIÓN ITINERANTE: dentro de un radiogroup solo UNA opción está en el
  // orden de tabulación; entre ellas se navega con las flechas. Así el grupo
  // entero cuenta como una parada, que es como se comporta un <input
  // type="radio"> nativo.
  //
  // Con `value` en '' —el estado inicial, nada elegido— el tabulable es el
  // PRIMERO. Si se dejara que solo lo fuera el seleccionado, sin selección el
  // grupo se saldría entero del orden de tabulación y no habría forma de
  // llegar a él.
  const labelId = useId()
  const indiceActivo = Math.max(0, options.findIndex(o => o.value === value))
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const oscura = superficie === 'oscura'

  const alTeclear = (e: React.KeyboardEvent, i: number) => {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    // Circular: de la última se pasa a la primera, como en un radiogroup nativo.
    const siguiente = (i + paso + options.length) % options.length
    onChange(options[siguiente].value)
    refs.current[siguiente]?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Oculto sigue siendo el nombre accesible: `.sr-only` recorta a 1px, no
          hace `display: none`, así que `aria-labelledby` lo sigue encontrando.
          Cuando va oculto NO se le pone `labelStyle`: su `--muted` (#5F7183) no
          contrasta con el panel navy, y el día que alguien lo quiera visible ahí
          hará falta un color propio, no éste. */}
      <span id={labelId} className={rotuloOculto ? 'sr-only' : undefined} style={rotuloOculto ? undefined : labelStyle}>{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={labelId}>
        {options.map((opt, i) => {
          const elegido = value === opt.value
          return (
            <button
              key={opt.value}
              ref={el => { refs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={elegido}
              tabIndex={i === indiceActivo ? 0 : -1}
              onKeyDown={e => alTeclear(e, i)}
              onClick={() => onChange(opt.value)}
              className="px-4 py-2 text-[13px] border transition-colors"
              /* SUPERFICIE CLARA — LAS DOS CARAS DE LA REGLA 4.2 EN UN SOLO
                 CONTROL, y las dos fallaban.
                 ELEGIDO: `--green` de fondo con texto blanco encima daba 2,93:1 a
                 13px. Es exactamente el caso que `SISTEMA-DISENO.md` 4.2 describe
                 como el que «se escapó dos veces», porque el barrido buscaba
                 `color:` y esto es `background:`. Con `--green-dark` da 4,85:1.
                 SIN ELEGIR: el borde era `--border` (1,18:1) y es lo ÚNICO que
                 delimita el control —el fondo es transparente—, así que cae en
                 1.4.11. Pasa a `--border-input`, igual que los del buscador.

                 SUPERFICIE OSCURA — no se inventa paleta: es el par que
                 `SISTEMA-DISENO.md` 2.1 ya define para fondo oscuro.
                 ELEGIDO = `.btn-inverse`: blanco sólido con `--navy-dark`
                 encima, 15,71:1. `--green-dark` acá NO sirve: sobre el panel
                 #1C2B3A el propio botón queda en 1,9:1 contra el fondo y deja de
                 leerse como objeto.
                 SIN ELEGIR = `.btn-outline`: transparente con borde blanco al
                 40 %. Ese borde es LO ÚNICO que delimita el control, o sea
                 1.4.11: sobre #1C2B3A da 3,60:1 y el texto al 65 %, 6,98:1.
                 Al 25 % —de donde venía `.btn-outline`— daba 2,3:1 y no cumplía. */
              style={{
                borderRadius: 2,
                borderColor: elegido
                  ? (oscura ? '#FFFFFF' : 'var(--green-dark)')
                  : (oscura ? 'rgba(255,255,255,0.40)' : 'var(--border-input)'),
                background: elegido ? (oscura ? '#FFFFFF' : 'var(--green-dark)') : 'transparent',
                color: elegido
                  ? (oscura ? 'var(--navy-dark)' : '#fff')
                  : (oscura ? 'rgba(255,255,255,0.65)' : 'var(--navy-dark)'),
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
