// Cloudflare Pages Function: Open Graph de /rental
// Mismo enfoque que la ficha: el index.html real con las etiquetas al inicio del <head>, sin `meta refresh`.
// Los textos son los de <SEO> en `RentalPage`. Ver `src/lib/og-paginas.js`.

import { crearFunctionEstatica } from '../src/lib/og-paginas.js'

export const onRequestGet = crearFunctionEstatica(() => ({
  ruta: '/rental',
  title: 'SDM Rental — Administración y Arriendo de Propiedades',
  description: 'Administra tu propiedad con SDM Rental. Plan Standard (50% + 7% mensual) o Plan Plus con seguro de rentas impagas (50% + 10% mensual).',
  claveImagen: 'rental_hero_img',
  imagenAlt: 'SDM Rental',
}), ['rental_hero_img'])
