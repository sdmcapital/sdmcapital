import { useId, useRef, useState } from 'react'
import { useDialogoModal } from '@/hooks/useDialogoModal'
import { useBloquearScroll } from '@/hooks/useBloquearScroll'
import { X, Check } from 'lucide-react'
import SolicitudCreditoForm from './SolicitudCreditoForm'
import { RadioGroup } from './campos'
import { PRODUCTOS, type ProductoCredito } from './productos'

interface CopyProducto {
  /** Se pinta en mayúsculas por CSS; acá va en capital normal, como el resto del sitio. */
  eyebrow: string
  titulo: string
  /** La última palabra o dos, en cursiva. Mismo patrón que el par título/cursiva del Inicio. */
  tituloEm: string
  parrafo: string
  incluye: string[]
  /** Plazo y, cuando lo hay, la condición propia del producto. */
  notas: string[]
}

// ─── EL COPY DE LOS CUATRO PRODUCTOS ─────────────────────────────────────────
//
// A NIVEL DE MÓDULO y no dentro del componente: son cuatro objetos con arreglos
// dentro, y definidos en el render se recrean enteros en cada pasada —incluso al
// teclear en el formulario del panel derecho, que provoca un render del modal—.
// Acá se construyen una vez al cargar el módulo.
//
// NO SE PUBLICA NINGUNA CIFRA DE HONORARIOS: ni porcentaje, ni monto, ni forma
// de pago. Es una decisión cerrada. Lo que sí se dice es que se informan ANTES
// de presentar el caso, que es lo que el visitante necesita saber para decidir.
//
// El caso hipotecario es el único con una segunda nota, porque es el único donde
// la gratuidad tiene condición: si la compra se hace con SDM, la gestión no se
// cobra. NO se dice cuándo se cobra en el caso contrario — las dos superficies
// que lo declaraban no coincidían entre sí y ninguna describía la política.
// Sigue anotado en `SINCRONIA.md` como pendiente de decisión comercial.
const COPY: Record<ProductoCredito, CopyProducto> = {
  hipotecario: {
    eyebrow: 'Financiamiento · Hipotecario',
    titulo: 'Asesoría hipotecaria',
    tituloEm: 'integral',
    parrafo: 'Acompañamos todo el proceso de obtención de tu crédito hipotecario, desde la preevaluación hasta la inscripción en el Conservador de Bienes Raíces.',
    incluye: [
      'Revisión de tus antecedentes financieros y comerciales',
      'Preparación de la carpeta de evaluación crediticia',
      'Gestión ante varias instituciones a la vez',
      'Seguimiento, negociación y apelación si hay observaciones',
    ],
    notas: [
      'Evaluación en 10 a 15 días hábiles. Es la etapa de evaluación: no incluye tasación, estudio de títulos, escrituración, firma ni inscripción.',
      'Si compras con SDM, la gestión no tiene costo.',
    ],
  },
  consumo: {
    eyebrow: 'Financiamiento · Consumo y deudas',
    titulo: 'Consumo y',
    tituloEm: 'consolidación',
    parrafo: 'Ordenamos tus deudas en una sola operación, o gestionamos el crédito de consumo o de libre disponibilidad que necesitas.',
    incluye: [
      'Revisión de tu carga financiera actual',
      'Preparación del caso con tus antecedentes',
      'Presentación a las instituciones que se ajusten a tu perfil',
      'Seguimiento hasta el curse de la operación',
    ],
    notas: ['Evaluación en 5 a 10 días hábiles.'],
  },
  bancarizacion: {
    eyebrow: 'Financiamiento · Bancarización',
    titulo: 'Bancarización de personas y',
    tituloEm: 'empresas',
    parrafo: 'Abrimos tu acceso al sistema financiero: cuenta, tarjetas y línea de crédito según tu perfil.',
    incluye: [
      'Revisión de antecedentes tributarios y comerciales',
      'Preparación del caso ante bancos e instituciones',
      'Gestión de cupos de tarjeta y línea de crédito',
      'Seguimiento hasta la apertura',
    ],
    notas: ['Evaluación en 5 a 10 días hábiles.'],
  },
  leaseback: {
    eyebrow: 'Financiamiento · Leaseback',
    titulo: 'Operaciones de',
    tituloEm: 'leaseback',
    parrafo: 'Conviertes un activo en capital de trabajo: la institución lo adquiere y tú lo sigues usando bajo contrato, con opción de recompra.',
    incluye: [
      'Evaluación del bien y de la operación',
      'Estructuración según monto y complejidad',
      'Gestión ante las instituciones que operan este producto',
      'Seguimiento hasta la firma',
    ],
    notas: ['Se define caso a caso, según las características de la operación.'],
  },
}

// IDÉNTICO EN LOS CUATRO, y por eso vive fuera de `COPY`: si algún día cambia,
// cambia una vez. La segunda línea acota los plazos de arriba y la decisión de
// cada institución — es lo que impide que «evaluación en 5 a 10 días hábiles» se lea
// como una promesa de aprobación.
const PIE = [
  'Preevaluación sin costo. Te informamos los honorarios antes de presentar tu caso. Sin pagos adelantados en ninguna etapa.',
  'Los plazos se cuentan desde que tenemos tu documentación completa y son referenciales: dependen de la complejidad del caso y de los procesos de cada institución. La aprobación, el monto, la tasa y el plazo los define cada institución financiera.',
]

export default function SolicitudCreditoModal({ onClose, productoInicial = 'hipotecario' }: {
  onClose: () => void
  /* PUNTO DE PARTIDA, NO CANDADO. Quien llega desde la ficha de «Financiamiento
     Empresas» abre el modal ya en bancarización en vez de tener que darse cuenta
     de que el selector existe — pero puede cambiarlo, y los cuatro chips siguen
     ahí. Un modal que llegara clavado a un producto sería otra cosa, y no es
     ésta.

     OPCIONAL CON DEFAULT, no obligatoria: `HomePage.tsx` monta este modal sin
     pasar nada y está fuera de esta tanda. Obligatoria le rompería el `tsc` y con
     él el build entero. */
  productoInicial?: ProductoCredito
}) {
  const caja = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  // Valor INICIAL de `useState`, así que un cambio posterior de la prop no
  // arrastra el selector: si el visitante ya eligió otro producto, no se lo
  // movemos por debajo.
  const [producto, setProducto] = useState<ProductoCredito>(productoInicial)
  const copy = COPY[producto]

  // Escape, foco atrapado y foco devuelto al disparador. Ya tenía Escape suelto;
  // el hook lo reemplaza para no tener dos oyentes haciendo lo mismo.
  useDialogoModal(true, caja, onClose)

  // `overflow: hidden` sobre body no alcanza en iOS y además dejaba la página
  // arriba del todo al cerrar. El hook usa `position: fixed` + `top: -scrollY`
  // y restaura la posición.
  useBloquearScroll(true)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,37,53,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        ref={caja}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="w-full grid grid-cols-1 md:grid-cols-[2fr_3fr]"
        style={{ maxWidth: 980, maxHeight: '92vh', overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: 2, position: 'relative', backgroundColor: '#FFFFFF' }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X aria-hidden="true" size={20} color="#0F2535" />
        </button>

        {/* ── Panel izquierdo: información del servicio ── */}
        <div style={{ backgroundColor: '#1C2B3A', color: '#FFFFFF', padding: '48px 36px 48px 36px' }}>
          {/* EL SELECTOR VA PRIMERO porque es lo que gobierna todo lo que sigue:
              el panel entero y los campos del formulario de la derecha. Puesto
              debajo del título obligaría a leer un producto para descubrir que se
              puede elegir otro.

              El rótulo va oculto: el grupo necesita nombre accesible, pero en
              pantalla los cuatro chips ya se explican solos y un rótulo más en
              versalitas competiría con el eyebrow que viene justo debajo. */}
          <div style={{ marginBottom: 22 }}>
            <RadioGroup
              label="Tipo de financiamiento"
              rotuloOculto
              superficie="oscura"
              value={producto}
              onChange={v => setProducto(v as ProductoCredito)}
              options={PRODUCTOS}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, backgroundColor: 'transparent' }}>
            <span style={{ display: 'block', width: 24, height: 1, backgroundColor: 'rgba(168,196,220,0.85)' }} />
            <span className="text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 400, textTransform: 'uppercase', color: 'rgba(168,196,220,0.85)', backgroundColor: 'transparent' }}>
              {copy.eyebrow}
            </span>
          </div>

          <h2 id={tituloId} className="font-serif font-light text-sdm-display-sm" style={{ marginBottom: 6, backgroundColor: 'transparent', color: '#FFFFFF' }}>
            {copy.titulo} <em style={{ backgroundColor: 'transparent', color: 'inherit' }}>{copy.tituloEm}</em>
          </h2>
          <p className="text-sdm-base" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 24, backgroundColor: 'transparent' }}>
            Roberto Urrutia · Director Comercial SDM Capital · +20 años en banca
          </p>

          <p className="text-sdm-base" style={{ fontWeight: 300, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', marginBottom: 28, backgroundColor: 'transparent' }}>
            {copy.parrafo}
          </p>

          <div className="text-sdm-sm tracking-sdm-wide" style={{ fontWeight: 500, textTransform: 'uppercase', color: 'var(--sky)', marginBottom: 14, backgroundColor: 'transparent' }}>
            Lo que incluye
          </div>
          <ul style={{ marginBottom: 24, listStyle: 'none', backgroundColor: 'transparent' }}>
            {copy.incluye.map(item => (
              <li key={item} className="flex items-start gap-2 text-sdm-base" style={{ fontWeight: 300, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', marginBottom: 10, backgroundColor: 'transparent' }}>
                {/* `--green` sobre el panel navy da 5,37:1 — es su uso correcto
                    según la regla 4.2, la única cara donde el verde de marca
                    rinde. */}
                <Check size={15} color="#3DAA6E" style={{ marginTop: 3, flexShrink: 0, backgroundColor: 'transparent' }} />
                <span style={{ backgroundColor: 'transparent', color: 'inherit' }}>{item}</span>
              </li>
            ))}
          </ul>

          {copy.notas.map(nota => (
            <p key={nota} className="text-sdm-base" style={{ fontWeight: 300, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: 10, backgroundColor: 'transparent' }}>
              {nota}
            </p>
          ))}

          {/* La línea es DECORATIVA —separa, no delimita un control—, así que
              1.4.11 no le aplica y el 14 % basta. Mismo criterio que `--border`
              en el sitio claro (1,18:1). */}
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'transparent' }}>
            <p className="text-sdm-sm" style={{ fontWeight: 300, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: 10, backgroundColor: 'transparent' }}>
              {PIE[0]}
            </p>
            {/* Al 55 % sobre #1C2B3A da 5,45:1 y cumple AA para texto normal. Es
                la misma atenuación que la línea de Roberto de arriba. */}
            <p className="text-sdm-sm" style={{ fontWeight: 300, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: 0, backgroundColor: 'transparent' }}>
              {PIE[1]}
            </p>
          </div>

          <div style={{ height: '3rem', backgroundColor: 'transparent' }} />
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div style={{ padding: '48px 36px', backgroundColor: '#FFFFFF', color: '#1C2B3A' }}>
          <SolicitudCreditoForm producto={producto} successAction={<button onClick={onClose} className="btn-primary">Cerrar</button>} />
        </div>
      </div>
    </div>
  )
}
