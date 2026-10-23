import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useContenido } from '@/hooks/useContenido'
import { useLang } from '@/hooks/useLang'

// ─── DOS LLAMADOS BAJO EL BUSCADOR ───────────────────────────────────────────
//
// Gestión crediticia y SDM Rental, lado a lado. Reemplaza a la sección suelta
// «¿El banco te dijo no?»: aquel bloque es ahora la tarjeta izquierda y no
// existe en ningún otro sitio.
//
// VA DESPUÉS DEL BUSCADOR, NO ANTES. Estuvo entre el hero y el buscador y eso
// invertía la jerarquía de `GUIA-DE-VOZ-SDM.md` §4: el corretaje es el eje y el
// financiamiento el respaldo, y «si una página habla de financiamiento antes de
// decir qué propiedad se vende, el orden está invertido». Primero se busca qué
// comprar; después, cómo pagarlo o cómo arrendar lo propio.
//
// Y POR ENCIMA DEL BANNER PROMOCIONAL, por la misma razón que ya tenía el
// bloque de financiamiento: el banner se apaga desde el admin, y lo que define
// a la empresa no puede cambiar de puesto según haya o no campaña corrida.
//
// ─── BANDA OSCURA CON TARJETAS BLANCAS ───────────────────────────────────────
//
// En blanco, con tarjetas en `--off` y el buscador blanco encima, eran tres
// superficies apiladas casi sin contraste —`--off` contra blanco es 1,045:1— y
// se leían como una sola masa clara de dos pantallas. La banda `--navy-dark`
// alterna el ritmo del arranque: foto oscura, franja clara del buscador, banda
// oscura, destacadas en blanco.
//
// Las tarjetas son BLANCAS y no `--off`: 15,71:1 contra la banda (`--off` daría
// 15,04, igual de claro), y sobre blanco cada texto gana margen — el rótulo
// pasa de 4,64 a 4,85 y el cuerpo de 4,81 a 5,03. Es además la superficie de la
// tarjeta del buscador que tienen encima. Sin borde: el límite lo da el salto
// de 15,71:1, y un filete `--border` sobre navy no aportaría nada.
//
// Si el banner promocional se enciende, va justo debajo y es del mismo
// `--navy-dark`. Lo que los separa vive en `BannerPromo`, que es quien sabe si
// se dibuja: ver su nota.
//
// LAS DOS TARJETAS PESAN LO MISMO, y eso es una regla, no un punto de partida:
// misma superficie, misma escala tipográfica, mismo botón (`.btn-green`). Si
// alguna vez una tiene que destacar, se decide aparte; no se cuela subiéndole el
// tamaño a un titular.
//
// Todo el texto sale de `contenido_sitio` (claves `dual_credito_*` y
// `dual_rental_*`, editables en Contenido → Inicio). Los defaults de acá son el
// texto vigente: la clave no existe en la base hasta el primer guardado del
// panel, igual que las del banner.
//
// Los rótulos se escriben en minúscula y los pasa a mayúscula `.section-label`.

// Contrastes sobre la tarjeta blanca, medidos con la fórmula de WCAG:
// rótulo `--green-dark` 4,85:1 (texto normal de 13px, pide 4,5), titular
// `--navy-dark` 15,71:1, cuerpo y metadato `--muted` 5,03:1, `.btn-green` como
// objeto contra la tarjeta 4,85:1 (1.4.11 pide 3:1) y su texto blanco 4,85:1.
// `--green` no sirve acá aunque la sección sea oscura: lo que el rótulo tiene
// al lado es la tarjeta blanca, y ahí da 2,93:1 (regla 4.2).
function Tarjeta({ rotulo, titulo, bajada, metadato, children }: {
  rotulo: string
  titulo: string
  bajada: string
  metadato: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-sdm-contenedor bg-white p-6 md:p-8">
      <div className="section-label mb-3">{rotulo}</div>

      {/* Un punto por debajo del titular del bloque anterior (28–40 px y no
          40–52): a media columna, la escala de antes partía «¿Necesitas
          arrendar tu propiedad?» en cuatro líneas a 1024. Es la misma escala
          de los demás <h2> del home. */}
      <h2 className="font-serif font-light tracking-sdm-tight text-[length:clamp(var(--sdm-display-sm),3vw,var(--sdm-display-md))] leading-[1.12] text-[var(--navy-dark)]">
        {titulo}
      </h2>

      <p className="mt-4 text-sdm-base font-sdm-ligero leading-[1.8] text-[var(--muted)]">
        {bajada}
      </p>

      {/* `mt-auto` empuja el metadato y el botón al pie: con titulares de
          distinto largo, los dos botones quedan a la misma altura. El filete
          es el mismo del bloque anterior y sigue `aria-hidden`: `--muted` al
          45 % sobre blanco resuelve a #B7BFC7, 1,86:1. Es decoración —una
          línea de 1px sin información, que separa sin delimitar ningún
          control—, así que 1.4.11 no le aplica, igual que a `--border`. */}
      <div className="mt-auto flex flex-col items-start gap-2.5 pt-[18px]">
        <span aria-hidden="true" className="block h-px w-10 bg-[var(--muted)] opacity-[0.45]" />
        <div className="text-sdm-sm font-sdm-ligero text-[var(--muted)]">{metadato}</div>
      </div>

      <div className="mt-[18px]">{children}</div>
    </div>
  )
}

// A todo el ancho de la tarjeta en móvil, donde el rótulo cae en dos líneas y
// un botón ajustado a su texto queda con el renglón partido contra la
// izquierda. `min-h-[44px]` por 2.5.8; el foco lo dibuja la regla global
// `*:focus-visible`, por fuera del botón y dentro de la tarjeta, así que el
// anillo se ve contra blanco: 4,85:1.
const BOTON = 'btn-green min-h-[44px] w-full justify-center text-center sm:w-auto'

export default function DualCTASection({ onSolicitarCredito }: { onSolicitarCredito: () => void }) {
  const { get } = useContenido()
  const { t } = useLang()

  return (
    <section className="bg-[var(--navy-dark)] px-[clamp(16px,5vw,48px)] py-8 md:py-14">
      {/* Una columna hasta `lg` y no hasta `md`: a 768 cada tarjeta quedaría en
          ~330 px y los titulares en cuatro líneas. */}
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Tarjeta
          rotulo={get('dual_credito_label', t.sections.financiamiento.label)}
          titulo={get('dual_credito_titulo', '¿El banco te dijo no?')}
          bajada={get('dual_credito_body', 'Hacemos la evaluación hipotecaria y te acompañamos en todo el proceso. Sin pagos adelantados.')}
          metadato={get('dual_credito_meta', 'Roberto Urrutia · Director Comercial · +20 años en banca')}
        >
          {/* Abre el modal de solicitud, como el bloque al que reemplaza: trae
              foco atrapado, Escape, foco devuelto y bloqueo de scroll. */}
          <button type="button" onClick={onSolicitarCredito} className={BOTON}>
            {get('dual_credito_cta', 'Solicita tu preevaluación gratuita')}
          </button>
        </Tarjeta>

        <Tarjeta
          rotulo={get('dual_rental_label', 'SDM Rental')}
          titulo={get('dual_rental_titulo', '¿Necesitas arrendar tu propiedad?')}
          bajada={get('dual_rental_body', 'Buscamos al arrendatario, verificamos sus antecedentes y administramos el arriendo mes a mes.')}
          metadato={get('dual_rental_meta', 'Comisión 50% de un mes al firmar · Administración desde 7% mensual')}
        >
          <Link to="/rental" className={BOTON}>
            {get('dual_rental_cta', 'Quiero arrendar mi propiedad')}
          </Link>
        </Tarjeta>
      </div>
    </section>
  )
}
