// Registro de iconos del showcase.
//
// El icono de un ítem es un NOMBRE guardado en `showcase_items.icono`, no una
// posición. Antes la amenidad 1 llevaba la cama porque era la primera; ahora lleva
// la cama porque su fila dice `bed`. Un nombre ausente o desconocido no pinta icono.
//
// Los once primeros son los SVG originales de El Barranco, sin tocar. El resto
// son de lucide-react, con el mismo tamaño (28) y grosor de trazo (1,2) para que
// convivan en la misma grilla. El color lo pone quien llama: es el acento de la
// paleta de cada propiedad, que sale del dato.

import type { ReactElement } from 'react'
import {
  Building2, Warehouse, Tent, Sun, BatteryCharging, Plug, Droplets, Leaf, Sprout,
  TreePine, Trees, Apple, Bird, Egg, Milk, Wheat, PawPrint, Utensils, Flame, Fence, Tractor,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = { color: string }

const svg28 = (hijos: ReactElement, extra: Record<string, string> = {}) =>
  ({ color }: Props) => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" {...extra}>
      {hijos}
    </svg>
  )

const lucide = (I: LucideIcon) => ({ color }: Props) => <I size={28} strokeWidth={1.2} color={color} />

export const ICONOS: Record<string, { etiqueta: string; Comp: (p: Props) => ReactElement }> = {
  // ── originales de El Barranco ──
  bed:      { etiqueta: 'Cama / habitación', Comp: svg28(<><path d="M3 20V10a2 2 0 012-2h18a2 2 0 012 2v10"/><path d="M3 16h22"/><path d="M7 12h4a1 1 0 011 1v3H6v-3a1 1 0 011-1z"/><path d="M1 20h26M1 23h26" strokeOpacity="0.4"/></>) },
  fork:     { etiqueta: 'Restaurante', Comp: svg28(<><path d="M9 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V3"/><path d="M12 12v13"/><path d="M20 3v18M20 3c0 4-3 6-3 9h6c0-3-3-5-3-9z"/></>) },
  spa:      { etiqueta: 'Bienestar / spa', Comp: svg28(<><circle cx="14" cy="12" r="5"/><path d="M14 7C14 4 17 2 20 3c0 3-2 6-6 7z"/><path d="M14 7C14 4 11 2 8 3c0 3 2 6 6 7z"/><path d="M8 20c0-3.31 2.69-6 6-6s6 2.69 6 6v1H8v-1z"/></>) },
  home:     { etiqueta: 'Casa', Comp: svg28(<><path d="M3 12L14 3l11 9"/><path d="M6 10v13h6v-7h4v7h6V10"/></>) },
  bolt:     { etiqueta: 'Energía / rayo', Comp: svg28(<path d="M15 3L6 16h8l-1 9 11-13h-8l1-9z"/>) },
  car:      { etiqueta: 'Estacionamiento', Comp: svg28(<><path d="M5 17H3v3h2v1a1 1 0 002 0v-1h14v1a1 1 0 002 0v-1h2v-3h-2L19 9H9L5 17z"/><circle cx="8.5" cy="17.5" r="1.5"/><circle cx="19.5" cy="17.5" r="1.5"/><path d="M9.5 9l-2 8M18.5 9l2 8M9 13h10"/></>) },
  key:      { etiqueta: 'Llave', Comp: svg28(<><circle cx="10" cy="11" r="5"/><path d="M14.5 15.5L25 25"/><path d="M21 22l-2-2M24 19l-2 2"/></>) },
  badge:    { etiqueta: 'Sello / marca', Comp: svg28(<path d="M14 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L14 17.3l-5.6 2.9 1.1-6.2L5 9.6l6.2-.9L14 3z"/>) },
  wave:     { etiqueta: 'Río / ola', Comp: svg28(<><path d="M3 14c2-4 4-6 6-6s4 4 6 4 4-6 6-6"/><path d="M3 20c2-4 4-6 6-6s4 4 6 4 4-6 6-6" strokeOpacity="0.4"/></>, { strokeLinejoin: 'miter' }) },
  fish:     { etiqueta: 'Pez / pesca', Comp: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12c0 5-4 9-10 10C6 23 3 20 3 16c0-2 1-4 3-5C3 8 6 5 12 4c2 3 4 6 4 8h2l4-4v8l-4-4h-2z"/>
      <circle cx="9" cy="13" r="1" fill={color}/>
    </svg>
  ) },
  mountain: { etiqueta: 'Montaña', Comp: svg28(<><path d="M3 24L10 10l5 8 3-4 7 10H3z"/><path d="M18 8a2 2 0 100-4 2 2 0 000 4z"/></>) },

  // ── lucide ──
  building:  { etiqueta: 'Edificio / construcción', Comp: lucide(Building2) },
  warehouse: { etiqueta: 'Galpón / bodega',         Comp: lucide(Warehouse) },
  tent:      { etiqueta: 'Posada / cabaña',         Comp: lucide(Tent) },
  sun:       { etiqueta: 'Paneles solares',         Comp: lucide(Sun) },
  battery:   { etiqueta: 'Baterías',                Comp: lucide(BatteryCharging) },
  plug:      { etiqueta: 'Inversor / conexión',     Comp: lucide(Plug) },
  droplets:  { etiqueta: 'Agua / pozo / estanque',  Comp: lucide(Droplets) },
  leaf:      { etiqueta: 'Hoja / bambú',            Comp: lucide(Leaf) },
  sprout:    { etiqueta: 'Cultivo',                 Comp: lucide(Sprout) },
  tree:      { etiqueta: 'Árbol / frutales',        Comp: lucide(TreePine) },
  trees:     { etiqueta: 'Bosque',                  Comp: lucide(Trees) },
  apple:     { etiqueta: 'Fruta',                   Comp: lucide(Apple) },
  bird:      { etiqueta: 'Aves / gallinero',        Comp: lucide(Bird) },
  egg:       { etiqueta: 'Huevos',                  Comp: lucide(Egg) },
  milk:      { etiqueta: 'Lácteos / quesería',      Comp: lucide(Milk) },
  wheat:     { etiqueta: 'Cereal',                  Comp: lucide(Wheat) },
  paw:       { etiqueta: 'Ganado / cabras',         Comp: lucide(PawPrint) },
  utensils:  { etiqueta: 'Cocina / comedor',        Comp: lucide(Utensils) },
  flame:     { etiqueta: 'Fuego / calefacción',     Comp: lucide(Flame) },
  fence:     { etiqueta: 'Corral / cerco',          Comp: lucide(Fence) },
  tractor:   { etiqueta: 'Maquinaria',              Comp: lucide(Tractor) },
}

export const NOMBRES_ICONOS = Object.keys(ICONOS)

export function Icono({ nombre, color }: { nombre?: string | null; color: string }) {
  const entrada = nombre ? ICONOS[nombre] : undefined
  return entrada ? <entrada.Comp color={color} /> : null
}

/** Flecha del botón «Volver»: es de la interfaz, no del contenido. */
export function FlechaIzquierda() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5"/>
    </svg>
  )
}
