import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useContenido } from '@/hooks/useContenido'

// ─── Contador animado ─────────────────────────────────────────────────────────
//
// `active` tiene que significar dos cosas a la vez: que el contador entró en
// pantalla Y que `target` ya es el número definitivo. Si arranca antes de que
// llegue `contenido_sitio`, anima hacia el default y a mitad de camino el
// objetivo cambia — y como el efecto depende de `target`, el intervalo se rehace
// con `start = 0` y el número vuelve a cero a la vista. Medido en países, que
// tenía 10 de default y 2 en la base: 0→1→2→3 a los 657ms, de vuelta a 0 a los
// 807ms cuando contestó la consulta, y recién a los 2390ms el 2 final.
function useCounter(target: number, duration = 1800, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    // Con «reduce», el número aparece directo. Contar de 0 a 120 es movimiento
    // igual que rotar una foto, y acá además el dato tarda 1,8s en ser legible.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target)
      return
    }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [active, target, duration])
  return count
}

function AnimatedStat({ n, unit, label, habilitado }: { n: number; unit: string; label: string; habilitado: boolean }) {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Dos condiciones, y las dos hacen falta: `active` es «entró en pantalla» y
  // `habilitado` es «el número ya es el definitivo». Ver la nota de arriba.
  const count = useCounter(n, 1600, active && habilitado)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
      <div className="font-serif text-sdm-display-md" style={{ fontWeight: 300, color: '#fff' }}>
        {/* `--sky`, igual que el kicker: mismo color, misma fotografía, mismo
            defecto. `--green-dark` daba 2,13–3,59 según la foto, y a 28px el
            umbral es 3:1 (texto grande), así que fallaba en tres de las cuatro.
            Con `--sky` van de 5,71 a 9,63, o sea que cumplen incluso el 4,5 de
            texto normal.
            EL VALOR VIVE ACÁ UNA SOLA VEZ: `AnimatedStat` se instancia tres
            veces —propiedades, años, países—, así que los tres «+» no pueden
            separarse. */}
        {count}<span className="text-sdm-display-sm" style={{ color: 'var(--sky)' }}>{unit}</span>
      </div>
      <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 400, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Carrusel de fotos ────────────────────────────────────────────────────────
const INTERVAL_MS = 5000 // Cambia cada 5 segundos

function HeroCarousel({ images, positions }: { images: string[]; positions: string[] }) {
  const [current, setCurrent] = useState(0)
  // 2.2.2 pide poder detener cualquier movimiento automático que dure más de 5
  // segundos. Este rota indefinidamente, así que necesita un control explícito.
  // Nace pausado si el sistema pide menos movimiento — ver el efecto de abajo.
  const [pausado, setPausado] = useState(false)
  const [prev, setPrev] = useState<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  // `prefers-reduced-motion: reduce` significa «no me muevas cosas sin que yo
  // lo pida». La rotación automática arranca detenida; los puntos y el botón
  // siguen funcionando, así que no se pierde ninguna foto.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setPausado(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  useEffect(() => {
    if (images.length < 2 || pausado) return
    const timer = setInterval(() => {
      setPrev(current)
      setTransitioning(true)
      setCurrent(c => (c + 1) % images.length)
      // Limpiar prev después de la transición
      setTimeout(() => { setPrev(null); setTransitioning(false) }, 1200)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [images.length, current, pausado])

  const goTo = (idx: number) => {
    if (idx === current) return
    setPrev(current)
    setTransitioning(true)
    setCurrent(idx)
    setTimeout(() => { setPrev(null); setTransitioning(false) }, 1200)
  }

  if (images.length === 0) {
    return (
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,var(--navy) 0%,var(--navy-dark) 55%,#071524 100%)' }} />
    )
  }

  return (
    <>
      {/* Imagen anterior — se desvanece */}
      {prev !== null && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${images[prev]})`,
            backgroundSize: 'cover',
            backgroundPosition: positions[prev] || 'center center',
            opacity: transitioning ? 0 : 1,
            transition: 'opacity 1.2s ease',
            zIndex: 1,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${images[current]})`,
          backgroundSize: 'cover',
          backgroundPosition: positions[current] || 'center center',
          opacity: 1,
          transition: 'opacity 1.2s ease',
          zIndex: 2,
        }}
      >
        {/* Preload hint para el navegador */}
        {images[current] && (
          <link rel="preload" as="image" href={images[current]} />
        )}
      </div>

      {/* Dots de navegación */}
      {images.length > 1 && (
        <div
          className="absolute flex items-center bottom-[62px] lg:bottom-[76px]"
          /* 18px entre puntos por 2.5.8: con 8px el paso era 16 y los círculos de
             24px se cortaban. Ahora 26. El punto sigue midiendo 8px. */
          /* ─── NUNCA POR DEBAJO DE 48: LA TARJETA DEL BUSCADOR SE COME ESA FRANJA ───
             `SearchBar` sube 48px sobre el hero (`marginTop: -48`), así que los
             últimos 48px del hero están tapados por una tarjeta blanca opaca. A
             `bottom: 24` estos seis controles caen enteros dentro de esa franja:
             invisibles y, medido por hit-test, impulsables — el clic sobre ellos
             lo recibe un botón del buscador.

             DOS ALTURAS, PORQUE HAY DOS GEOMETRÍAS DE CONTADORES:
             · Desde `lg`, 76px: la misma línea de base que los contadores
               (`lg:pb-[76px]` abajo), que van a la izquierda. Los puntos van al
               centro y no se tocan.
             · Por debajo de `lg`, 62px y en su propia línea. Los tres contadores
               ocupan casi todo el ancho, y en la línea de los contadores los
               puntos caían encima de «Años» — medido a 390 y a 768, y ya pasaba
               en producción. A 62 quedan entre la tarjeta (14px debajo) y los
               contadores (14px encima, por el `pb-[98px]` de la columna).

             SUBIR EL z-index NO LO ARREGLA, y conviene saber por qué. La raíz de
             `SearchBar` es `position: relative; z-index: 10`, y este envoltorio es
             `position: absolute; z-index: 10`. La raíz del hero es `relative` sin
             z-index, así que NO crea contexto de apilamiento y los dos compiten en
             el mismo: **mismo z-index, y el empate lo rompe el orden del DOM.**
             `SearchBar` va después en `HomePage`, así que gana siempre. Ponerle 11
             los pintaría ENCIMA de la tarjeta blanca, que es peor: su contraste
             está calculado contra la fotografía, no contra blanco.

             `bottom` va en clases y no en el `style`: es lo único de este
             envoltorio que cambia con el ancho. */
          style={{ left: '50%', transform: 'translateX(-50%)', zIndex: 10, gap: 18 }}
        >
          {/* El control de 2.2.2. Va junto a los puntos, que cambian de foto
              pero NO detienen la rotación: sin esto no había forma de pararla. */}
          <button
            type="button"
            onClick={() => setPausado(p => !p)}
            aria-label={pausado ? 'Reanudar el cambio automático de fotos' : 'Pausar el cambio automático de fotos'}
            className="area-44"
            style={{ width: 22, height: 22, marginRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,37,53,0.55)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', padding: 0 }}
          >
            {pausado ? <Play aria-hidden="true" size={10} fill="currentColor" /> : <Pause aria-hidden="true" size={10} fill="currentColor" />}
          </button>
          {/* NOMBRE ACCESIBLE Y LÍMITE VISIBLE, que faltaban los dos.
              Eran cinco <button> sin texto ni `aria-label`: el lector decía
              «botón» cinco veces seguidas (WCAG 4.1.2). El botón de pausa de
              aquí arriba sí lo llevaba — la tanda de accesibilidad cubrió el
              control de 2.2.2 y dejó fuera los puntos.

              EL ANILLO NO ES DECORACIÓN: ES LO QUE HACE QUE EL PUNTO EXISTA.
              Los puntos van en `zIndex: 10`, o sea POR ENCIMA del degradado, así
              que su fondo es la fotografía cruda. Medido el punto inactivo
              contra las cuatro luminancias posibles:

                                 foto blanca  clara  media  oscura
                blanco 0.40           1.00    1.14   1.88    3.63
                blanco 0.85           1.00    1.31   3.32   11.11

              Subir la opacidad NO ARREGLA el caso que importa: blanco sobre una
              foto blanca es 1.00 a cualquier alfa, porque es el mismo color. Y
              las cinco fotos de hoy son exteriores con cielo.

              El anillo sólido en `--navy-deeper` —el mismo navy del degradado—
              da un límite que NO depende de la foto: punto contra anillo son
              17,92:1 siempre. Y los dos extremos se cubren entre sí: sobre foto
              clara se ve el anillo, sobre foto oscura se ve el punto.

              `aria-current` y no `aria-pressed`: esto no es un interruptor sino
              «cuál de los cinco estás viendo», que es exactamente lo que
              `aria-current` expresa. */}
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ver la foto ${i + 1} de ${images.length}`}
              aria-current={i === current ? 'true' : undefined}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? 'var(--green)' : 'rgba(255,255,255,0.85)',
                boxShadow: '0 0 0 1px var(--navy-deeper)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Hero principal ───────────────────────────────────────────────────────────
export default function HeroSection() {
  const { get, listo } = useContenido()

  // Los defaults son lo que se ve mientras no haya semilla ni respuesta. Tienen
  // que decir la verdad: hasta hoy quedaron «Tu socio», «Chile y el extranjero»
  // y «10 países» de una época anterior, y eso se pintaba en cada carga. No
  // están para calzar con la base — para eso está la semilla de index.html —
  // sino para no mentir cuando la base no está.
  // El kicker vuelve a salir de la base. Los renglones se separan con \n en el
  // valor: era lo único que impedía tenerlo acá, porque necesita el corte en un
  // punto exacto y meter un <br> dentro de un texto plano no correspondía.
  const kicker    = get('hero_kicker',      'Inversión inmobiliaria\nChile & Paraguay')
  const titulo1   = get('hero_titulo_1',   'Tu socio confiable')
  const titulo2   = get('hero_titulo_2',   'en bienes')
  const titulo3   = get('hero_titulo_3',   'raíces')
  const subtitulo = get('hero_subtitulo',  'Más de 15 años conectando personas con oportunidades inmobiliarias.')
  const statProp  = Number(get('stats_propiedades', '120'))
  const statAnios = Number(get('stats_anios',        '15'))
  const statPais  = Number(get('stats_paises',        '2'))

  // El contador no arranca hasta que el número es definitivo — ver useCounter.
  // El plazo es la red de seguridad: si la consulta se cuelga sin resolver ni
  // fallar, `listo` no llegaría nunca y los tres números se quedarían en 0. A
  // los 2,5s se anima igual, hacia lo sembrado o hacia el default. Nunca cero.
  const [plazoVencido, setPlazoVencido] = useState(false)
  useEffect(() => {
    if (listo) return
    const t = setTimeout(() => setPlazoVencido(true), 2500)
    return () => clearTimeout(t)
  }, [listo])
  const numeroDefinitivo = listo || plazoVencido

  // Fotos del carrusel — hero_imagen_url_1 hasta hero_imagen_url_5
  // También acepta el campo original hero_imagen_url como primera imagen
  const heroImages = [
    get('hero_imagen_url',   ''),
    get('hero_imagen_url_2', ''),
    get('hero_imagen_url_3', ''),
    get('hero_imagen_url_4', ''),
    get('hero_imagen_url_5', ''),
  ]

  const heroPositions = [
    get('hero_pos_1', 'center center'),
    get('hero_pos_2', 'center center'),
    get('hero_pos_3', 'center center'),
    get('hero_pos_4', 'center center'),
    get('hero_pos_5', 'center center'),
  ]

  // Solo las fotos que tienen URL, con sus posiciones correspondientes
  const filled = heroImages.reduce<{ img: string; pos: string }[]>((acc, img, i) => {
    if (img) acc.push({ img, pos: heroPositions[i] })
    return acc
  }, [])

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - var(--sdm-header-total))', minHeight: 540, maxHeight: 920 }}
    >
      <HeroCarousel images={filled.map(f => f.img)} positions={filled.map(f => f.pos)} />

      <div
        className="absolute inset-0"
        style={{
          background: filled.length > 0
            ? 'linear-gradient(100deg,rgba(8,24,40,0.82) 0%,rgba(8,24,40,0.5) 55%,rgba(8,24,40,0.12) 100%)'
            : 'none',
          zIndex: 3,
        }}
      />

      {/* Contenido encima de todo.
          EL RELLENO INFERIOR NO ES SIMÉTRICO CON EL SUPERIOR, y es a propósito.
          La tarjeta del buscador sube 48px sobre el hero (`marginTop: -48` en
          `SearchBar`), así que se come el relleno de abajo entero: con `py-12`
          (48px) quedaban 0px de aire entre la base de los contadores y el borde
          de la tarjeta a 390 y a 768, y con `lg:py-14` (56px) apenas 8 a 1440.
          Desde `lg`, `pb-[76px]` deja 28px libres — los mismos 28 que ya hay
          DEBAJO de la tarjeta, así que respira igual por los dos lados. Por
          debajo de `lg` es `pb-[98px]`: 48 de solapamiento + 14 de aire + los
          22 de la fila de controles del carrusel + 14 de aire. Ahí los
          controles no caben al lado de los contadores (ver su nota).

          EL BUSCADOR NO VA DENTRO DEL HERO, y se midió antes de descartarlo
          (2026-10-21). Integrado en la columna, sin crecer el hero ni recortar
          contadores, le faltan 278px a 375×667, 48 a 390×844 y 26 a 1280×720:
          la tarjeta móvil mide 396px. Y esta raíz lleva `overflow-hidden`, que
          recortaría los desplegables de Tipo (314px) y Región.

          NO TOCA NINGUNA ALTURA: el hero mide `calc(100vh - var(--sdm-header-total))` acotado
          entre 540 y 920, o sea que su alto lo fija la ventana, no su relleno.
          Subir el relleno mueve los contadores hacia arriba dentro de una caja
          que no cambia de tamaño — cero desplazamiento de layout, cero CLS. */}
      <div className="relative h-full flex flex-col justify-between px-8 lg:px-16 py-12 lg:py-14 pb-[98px] lg:pb-[76px]" style={{ zIndex: 4 }}>

        {/* Kicker — un renglón por línea del valor. Se filtran las líneas
            vacías y se recortan los espacios: la clave viene de un campo de
            texto del admin y un espacio al final o un renglón de más no pueden
            mover el diseño. */}
        {/* `--sky` Y NO NINGUNO DE LOS DOS VERDES, y es el reverso de la regla 4.2.
            Esa regla dice «`--green` solo sobre oscuro, `--green-dark` en todo lo
            demás», y acá el fondo ES oscuro —el degradado arranca en
            rgba(8,24,40,0.82)—, así que parecía tocar `--green`. Pero debajo del
            degradado hay una FOTOGRAFÍA que carga el admin, y el contraste real
            depende de ella. Medido contra las cuatro luminancias posibles:

                              foto blanca  clara  media  oscura
              --green-dark          2,13   2,35   2,98    3,59   ✗ falla en las 4
              --green               3,53   3,89   4,94    5,96   ✗ falla en 2
              --sky                 5,71   6,29   7,98    9,63   ✓

            Las cinco fotos de hoy son exteriores con cielo, o sea la columna
            «clara». `--sky` es además el acento que ya usa el <h1> de aquí abajo,
            así que no entra un color nuevo al hero.

            EL SEPARADOR DE LA LÍNEA SIGUIENTE SE QUEDA EN `--green`: es una
            línea de 1px sin texto, o sea decoración, y 1.4.11 no le aplica. */}
        <div className="flex items-start gap-3 text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 400, textTransform: 'uppercase', color: 'var(--sky)' }}>
          <span style={{ width: 28, minWidth: 28, height: 1, background: 'var(--green)', display: 'inline-block', marginTop: 6 }} />
          <span>
            {kicker.split('\n').map(l => l.trim()).filter(Boolean).map((linea, i) => (
              <span key={i} style={{ display: 'block' }}>{linea}</span>
            ))}
          </span>
        </div>

        {/* Headline */}
        <div>
          {/* El <h1> de la home. Las tres claves de contenido_sitio van dentro
              de UNO solo, no en tres encabezados: son una sola frase partida en
              renglones. El reset de Tailwind deja los encabezados en
              `font-size: inherit` y sin margen, así que el estilo es el mismo
              que tenía el <div>. */}
          <h1 className="font-serif tracking-sdm-tight" style={{ fontSize: 'clamp(var(--sdm-display-lg),6.5vw,var(--sdm-display-xl))', fontWeight: 300, lineHeight: 1.03, color: '#fff' }}>
            <span style={{ display: 'block' }}>{titulo1}</span>
            <span style={{ display: 'block' }}>
              {titulo2.startsWith('en ') ? (
                <>en <em style={{ fontStyle: 'italic', color: 'var(--sky)' }}>{titulo2.replace('en ', '')}</em></>
              ) : (
                <em style={{ fontStyle: 'italic', color: 'var(--sky)' }}>{titulo2}</em>
              )}
            </span>
            <span style={{ display: 'block', fontWeight: 600 }}>{titulo3}</span>
          </h1>
          <p className="text-sdm-base" style={{ fontWeight: 300, color: 'rgba(255,255,255,0.8)', borderLeft: '2px solid var(--green)', paddingLeft: 16, maxWidth: 460, lineHeight: 1.85, marginTop: 24 }}>
            {subtitulo}
          </p>
        </div>

        {/* Stats + location */}
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div className="flex gap-12">
            <AnimatedStat n={statProp}  unit="+" label="Propiedades" habilitado={numeroDefinitivo} />
            <AnimatedStat n={statAnios} unit="+" label="Años"        habilitado={numeroDefinitivo} />
            <AnimatedStat n={statPais}  unit="+" label="Países"      habilitado={numeroDefinitivo} />
          </div>
        </div>
      </div>
    </section>
  )
}
