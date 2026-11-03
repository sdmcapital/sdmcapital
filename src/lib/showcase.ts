// Datos del showcase de una propiedad (`/propiedades/:id/showcase`).
//
// Dos tablas, ambas con `propiedad_id`:
//   showcase_contenido   (propiedad_id, clave, valor)   textos y cifras sueltas
//   showcase_items       una fila por ítem de una lista (amenidades, galería…)
//
// REGLA DE LECTURA, y es la que sostiene todo el showcase: SIN DATO, SIN
// SECCIÓN. Aquí no hay textos por defecto. Antes cada `t('clave', 'texto')`
// llevaba el inglés de El Barranco como respaldo, de modo que a una propiedad
// nueva le faltaba una clave y mostraba «Whitewater Rafting» en su lugar. Un
// valor ausente o vacío devuelve '' y el componente no pinta esa pieza.
//
// Bilingüe por sufijo: `clave` es el inglés y `clave_es` el español; si el
// español falta o está vacío se usa el inglés. En los ítems, lo mismo con
// `titulo` / `titulo_es`, etc.

import { supabase } from '@/lib/supabase'

export type Idioma = 'en' | 'es'

export interface ShowcaseItem {
  id: string
  seccion: string
  orden: number
  titulo: string | null
  titulo_es: string | null
  descripcion: string | null
  descripcion_es: string | null
  valor: string | null
  valor_es: string | null
  img: string | null
  icono: string | null
}

/** Campos de texto de un ítem que tienen variante `_es`. */
export type CampoItem = 'titulo' | 'descripcion' | 'valor'

export interface PropiedadMini {
  id: string
  slug: string | null
  titulo: string | null
}

export interface ShowcaseData {
  propiedadId: string
  /** null cuando la propiedad no es visible al público (inactiva): el showcase
   *  se resuelve igual por UUID, directo en showcase_contenido. */
  propiedad: PropiedadMini | null
  contenido: Record<string, string>
  items: Record<string, ShowcaseItem[]>
}

export type ResultadoShowcase =
  | { estado: 'ok'; data: ShowcaseData }
  | { estado: 'no-existe' }
  | { estado: 'error' }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function agruparItems(filas: ShowcaseItem[]): Record<string, ShowcaseItem[]> {
  const porSeccion: Record<string, ShowcaseItem[]> = {}
  for (const f of filas) (porSeccion[f.seccion] ||= []).push(f)
  for (const lista of Object.values(porSeccion)) lista.sort((a, b) => a.orden - b.orden)
  return porSeccion
}

/**
 * Resuelve `:id` (UUID o slug) y trae el contenido de esa propiedad.
 *
 * Con UUID, las tres consultas salen en paralelo: no hace falta saber nada de
 * `propiedades` para pedir su contenido. Con slug hay que resolver primero el
 * id, y `propiedades` solo muestra al público las activas.
 *
 * «No existe» incluye a una propiedad real que no tiene showcase: sin una sola
 * fila de contenido no hay página que mostrar, y si no, cada ficha del sitio
 * tendría una landing vacía con formulario en `/propiedades/<id>/showcase`.
 */
export async function cargarShowcase(idOSlug: string): Promise<ResultadoShowcase> {
  try {
    const pedirContenido = (id: string) => Promise.all([
      supabase.from('showcase_contenido').select('clave, valor').eq('propiedad_id', id),
      supabase.from('showcase_items').select('*').eq('propiedad_id', id).order('seccion').order('orden'),
    ])

    let propiedadId: string
    let propiedad: PropiedadMini | null
    let cont, its

    if (UUID_REGEX.test(idOSlug)) {
      propiedadId = idOSlug
      const [p, [c, i]] = await Promise.all([
        supabase.from('propiedades').select('id, slug, titulo').eq('id', idOSlug).maybeSingle(),
        pedirContenido(idOSlug),
      ])
      if (p.error) throw p.error
      propiedad = p.data as PropiedadMini | null
      cont = c; its = i
    } else {
      const p = await supabase.from('propiedades').select('id, slug, titulo').eq('slug', idOSlug).maybeSingle()
      if (p.error) throw p.error
      if (!p.data) return { estado: 'no-existe' }
      propiedad = p.data as PropiedadMini
      propiedadId = propiedad.id
      ;[cont, its] = await pedirContenido(propiedadId)
    }

    if (cont.error) throw cont.error
    if (its.error) throw its.error

    const contenido: Record<string, string> = {}
    for (const { clave, valor } of (cont.data ?? []) as { clave: string; valor: string }[]) contenido[clave] = valor
    const filas = (its.data ?? []) as ShowcaseItem[]
    if (Object.keys(contenido).length === 0 && filas.length === 0) return { estado: 'no-existe' }

    return { estado: 'ok', data: { propiedadId, propiedad, contenido, items: agruparItems(filas) } }
  } catch (e) {
    console.error('[showcase] no se pudo cargar', e)
    return { estado: 'error' }
  }
}

/**
 * Lectores de texto para un idioma.
 *   t(clave)   texto bilingüe: `clave_es` si el idioma es es y existe, si no `clave`
 *   c(clave)   valor sin variante de idioma (fotos, colores, cifras sueltas)
 *   ti(it, f)  campo de un ítem, con su variante `_es`
 * Todos devuelven '' si no hay dato.
 */
export function lector(contenido: Record<string, string>, lang: Idioma) {
  const t = (clave: string): string => (lang === 'es' && contenido[`${clave}_es`]) || contenido[clave] || ''
  const c = (clave: string): string => contenido[clave] || ''
  const ti = (it: ShowcaseItem, campo: CampoItem): string =>
    (lang === 'es' && it[`${campo}_es`]) || it[campo] || ''
  return { t, c, ti }
}
