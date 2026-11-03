// Pestaña «Showcase» del admin — contenido del showcase de CUALQUIER propiedad.
//
// Era `Barranco.tsx`: un formulario de 410 líneas con los conteos de El Barranco
// (8 amenidades, 3 actividades, 7 fotos…) y sus textos como valores iniciales
// escritos tres veces. Ahora se elige la propiedad y se edita su contenido en las
// dos tablas nuevas:
//   showcase_contenido   textos y cifras sueltas (clave/valor, con variante _es)
//   showcase_items       listas de largo libre: se agrega, se ordena y se borra
//
// SOLO EDITA, NO CREA: la lista es únicamente de propiedades que ya tienen showcase. Un
// showcase nuevo trae decisiones de diseño y de contenido que se trabajan aparte, y elegir
// una propiedad jamás escribe: el panel solo escribe al pulsar «Guardar cambios».
//
// Sin valores iniciales: un campo vacío se guarda como «no hay dato» (la fila se
// borra) y el showcase no pinta esa pieza. Esa es la regla del lado público.
//
// La clave de pestaña sigue siendo 'barranco' en AdminPage: el orden de las
// pestañas se persiste en localStorage y renombrarla borraría esa preferencia.
//
// ─── REGLA DEL ADMIN ─────────────────────────────────────────────────────────
// Todos los componentes van a nivel de módulo, nunca dentro de otro (ver
// `components/admin/layout.tsx`).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Layers, ExternalLink, Check, Pause } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { avisarError } from '@/lib/errores'
import { Sec, Full } from '@/components/admin/layout'
import { Field, FieldGroup, Inp, Txa } from '@/components/admin/campos'
import { SaveBtn, Guardado, Badge } from '@/components/admin/acciones'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { thumbUrl } from '@/lib/imagenes'
import { ICONOS, NOMBRES_ICONOS, Icono } from '@/components/showcase/iconos'
import { BASE, ACENTO_POR_DEFECTO } from '@/components/showcase/tema'

// ─── Modelo de edición ───────────────────────────────────────────────────────

/** Una fila de showcase_items en el editor. Vacío ('') = nulo en la base. */
interface Fila {
  id: string
  titulo: string; titulo_es: string
  descripcion: string; descripcion_es: string
  valor: string; valor_es: string
  img: string; icono: string
  /** Fotos adicionales, además de `img`. */
  fotos: string[]
}
type CampoFila = 'img' | 'fotos' | 'titulo' | 'descripcion' | 'valor' | 'icono'
type Listas = Record<string, Fila[]>
type Contenido = Record<string, string>

interface PropOpcion { id: string; titulo: string | null; slug: string | null; activo: boolean | null; pais: string | null }

/** Definición de una lista editable: qué campos tiene cada ítem y cómo se rotulan. */
interface ListaDef {
  seccion: string
  titulo: string
  ayuda?: string
  campos: CampoFila[]
  rotulos?: Partial<Record<CampoFila, string>>
  itemRotulo: string
}

const nuevaFila = (): Fila => ({
  id: crypto.randomUUID(),
  titulo: '', titulo_es: '', descripcion: '', descripcion_es: '', valor: '', valor_es: '', img: '', icono: '', fotos: [],
})

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

const aFila = (r: Record<string, unknown>): Fila => ({
  id: r.id as string,
  titulo: txt(r.titulo), titulo_es: txt(r.titulo_es),
  descripcion: txt(r.descripcion), descripcion_es: txt(r.descripcion_es),
  valor: txt(r.valor), valor_es: txt(r.valor_es),
  img: txt(r.img), icono: txt(r.icono),
  fotos: Array.isArray(r.fotos) ? (r.fotos as unknown[]).filter((x): x is string => typeof x === 'string') : [],
})

const nulo = (s: string) => (s.trim() === '' ? null : s)

const LISTAS: Record<string, ListaDef> = {
  hero:            { seccion: 'hero', titulo: 'Carrusel del hero', ayuda: 'Fotos que rotan al inicio. Con una sola no rota.', campos: ['img'], itemRotulo: 'Foto' },
  destino_stats:   { seccion: 'destino_stats', titulo: 'Cifras del destino', campos: ['valor', 'titulo'], rotulos: { valor: 'Cifra', titulo: 'Rótulo' }, itemRotulo: 'Cifra' },
  actividades:     { seccion: 'actividades', titulo: 'Actividades', campos: ['img', 'titulo', 'descripcion', 'icono'], rotulos: { descripcion: 'Subtítulo' }, itemRotulo: 'Actividad' },
  propiedad_fotos: { seccion: 'propiedad_fotos', titulo: 'Fotos de la propiedad', ayuda: 'Se muestran en una grilla de 2 columnas.', campos: ['img'], itemRotulo: 'Foto' },
  amenidades:      { seccion: 'amenidades', titulo: 'Amenidades', campos: ['titulo', 'descripcion', 'icono'], itemRotulo: 'Amenidad' },
  construcciones:  { seccion: 'construcciones', titulo: 'Construcciones', campos: ['img', 'fotos', 'titulo', 'descripcion', 'icono'], itemRotulo: 'Construcción' },
  energia:         { seccion: 'energia', titulo: 'Infraestructura energética', campos: ['img', 'fotos', 'titulo', 'descripcion', 'icono'], itemRotulo: 'Elemento' },
  produccion:      { seccion: 'produccion', titulo: 'Producción agrícola y ganadera', campos: ['img', 'fotos', 'titulo', 'descripcion', 'icono'], itemRotulo: 'Elemento' },
  brief:           { seccion: 'brief', titulo: 'Tarjetas del brief', ayuda: 'Cifra grande, rótulo y nota. Aparecen en la pestaña «Investment Brief».', campos: ['valor', 'titulo', 'descripcion'], rotulos: { valor: 'Cifra', titulo: 'Rótulo', descripcion: 'Nota' }, itemRotulo: 'Tarjeta' },
  galeria_reserva: { seccion: 'galeria_reserva', titulo: 'Reserva de galería', ayuda: 'Fotos ya subidas que NO se muestran en ningún lado. Para usarlas, cámbialas a la galería o a una tarjeta.', campos: ['img'], itemRotulo: 'Foto' },
  galeria:         { seccion: 'galeria', titulo: 'Galería', ayuda: 'Con 7 o más fotos se arma el mosaico; con menos, una grilla pareja. La primera es la grande.', campos: ['img'], itemRotulo: 'Foto' },
}

const SLUG_FICHA = /^[a-z][a-z0-9_]*$/

// ─── Contraste del acento ────────────────────────────────────────────────────
// El acento se pinta como TEXTO sobre el fondo oscuro y como FONDO del botón con
// texto oscuro. Se mide aquí para que un color que no pasa no llegue a producción.

const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const razon = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const esHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s)

// ─── Componentes ─────────────────────────────────────────────────────────────

/** Campo bilingüe: EN y ES lado a lado. ES vacío = usa EN. */
function CampoBi({ clave, label, c, set, filas }: { clave: string; label: string; c: Contenido; set: (k: string, v: string) => void; filas?: number }) {
  return (
    <>
      <Field label={`${label} EN`}>
        {filas ? <Txa rows={filas} value={c[clave] ?? ''} onChange={v => set(clave, v)} /> : <Inp value={c[clave] ?? ''} onChange={v => set(clave, v)} />}
      </Field>
      <Field label={`${label} ES`}>
        {filas ? <Txa rows={filas} value={c[`${clave}_es`] ?? ''} onChange={v => set(`${clave}_es`, v)} placeholder="Vacío = usa EN" /> : <Inp value={c[`${clave}_es`] ?? ''} onChange={v => set(`${clave}_es`, v)} placeholder="Vacío = usa EN" />}
      </Field>
    </>
  )
}

function CampoUno({ clave, label, c, set, placeholder }: { clave: string; label: string; c: Contenido; set: (k: string, v: string) => void; placeholder?: string }) {
  return <Field label={label}><Inp value={c[clave] ?? ''} onChange={v => set(clave, v)} placeholder={placeholder} /></Field>
}

function CampoFoto({ clave, label, c, set }: { clave: string; label: string; c: Contenido; set: (k: string, v: string) => void }) {
  return (
    <Full><FieldGroup label={label}>
      <ImageUploader currentUrl={c[clave]} folder="propiedades" onUploaded={url => set(clave, url)} />
    </FieldGroup></Full>
  )
}

function BotonIcono({ titulo, onClick, disabled, children }: { titulo: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} disabled={disabled}
      style={{ background: 'none', border: '1px solid var(--border-input)', borderRadius: 2, padding: 6, cursor: disabled ? 'not-allowed' : 'pointer', color: 'var(--muted)', opacity: disabled ? 0.35 : 1, display: 'inline-flex' }}>
      {children}
    </button>
  )
}

function SelectorIcono({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ width: 28, height: 28, display: 'inline-flex' }}><Icono nombre={valor} color="#1B3A5C" /></span>
      <select className="input-line flex-1" value={valor} onChange={e => onChange(e.target.value)}>
        <option value="">(sin icono)</option>
        {NOMBRES_ICONOS.map(n => <option key={n} value={n}>{ICONOS[n]?.etiqueta ?? n}</option>)}
      </select>
    </div>
  )
}

/** Un ítem de una lista. El orden y el borrado los gobierna ListaEditor. */
function FilaEditor({ def, fila, indice, total, onCambio, onSubir, onBajar, onQuitar }: {
  def: ListaDef; fila: Fila; indice: number; total: number
  onCambio: (cambios: Partial<Fila>) => void; onSubir: () => void; onBajar: () => void; onQuitar: () => void
}) {
  const rot = (c: CampoFila, porDefecto: string) => def.rotulos?.[c] ?? porDefecto
  return (
    <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '14px 18px', marginBottom: 6 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)' }}>{def.itemRotulo} {indice + 1}</div>
        <div className="flex gap-2">
          <BotonIcono titulo="Subir" onClick={onSubir} disabled={indice === 0}><ArrowUp size={14} /></BotonIcono>
          <BotonIcono titulo="Bajar" onClick={onBajar} disabled={indice === total - 1}><ArrowDown size={14} /></BotonIcono>
          <BotonIcono titulo="Quitar" onClick={onQuitar}><Trash2 size={14} /></BotonIcono>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {def.campos.includes('img') && (
          <Full><FieldGroup label={rot('img', 'Foto')}>
            <ImageUploader currentUrl={fila.img} folder="propiedades" onUploaded={url => onCambio({ img: url })} />
          </FieldGroup></Full>
        )}
        {def.campos.includes('fotos') && (
          <Full><FieldGroup label="Fotos adicionales (se muestran en una franja bajo la principal)">
            {fila.fotos.map((u, i) => (
              <div key={u + i} className="flex items-center gap-3" style={{ marginBottom: 6 }}>
                <img src={thumbUrl(u)} alt="" loading="lazy" className="w-16 h-16 object-cover rounded" style={{ border: '1px solid var(--border)' }} />
                <input value={u} readOnly aria-label={`URL de la foto adicional ${i + 1}`} className="input-line flex-1 text-sdm-sm" style={{ color: 'var(--muted)' }} />
                <BotonIcono titulo="Quitar foto" onClick={() => onCambio({ fotos: fila.fotos.filter((_, j) => j !== i) })}><Trash2 size={14} /></BotonIcono>
              </div>
            ))}
            <ImageUploader folder="propiedades" onUploaded={url => onCambio({ fotos: [...fila.fotos, url] })} />
          </FieldGroup></Full>
        )}
        {def.campos.includes('valor') && (
          <>
            <Field label={`${rot('valor', 'Valor')} EN`}><Inp value={fila.valor} onChange={v => onCambio({ valor: v })} /></Field>
            <Field label={`${rot('valor', 'Valor')} ES`}><Inp value={fila.valor_es} onChange={v => onCambio({ valor_es: v })} placeholder="Vacío = usa EN" /></Field>
          </>
        )}
        {def.campos.includes('titulo') && (
          <>
            <Field label={`${rot('titulo', 'Título')} EN`}><Inp value={fila.titulo} onChange={v => onCambio({ titulo: v })} /></Field>
            <Field label={`${rot('titulo', 'Título')} ES`}><Inp value={fila.titulo_es} onChange={v => onCambio({ titulo_es: v })} placeholder="Vacío = usa EN" /></Field>
          </>
        )}
        {def.campos.includes('descripcion') && (
          <>
            <Field label={`${rot('descripcion', 'Descripción')} EN`}><Inp value={fila.descripcion} onChange={v => onCambio({ descripcion: v })} /></Field>
            <Field label={`${rot('descripcion', 'Descripción')} ES`}><Inp value={fila.descripcion_es} onChange={v => onCambio({ descripcion_es: v })} placeholder="Vacío = usa EN" /></Field>
          </>
        )}
        {def.campos.includes('icono') && (
          <Full><FieldGroup label="Icono"><SelectorIcono valor={fila.icono} onChange={v => onCambio({ icono: v })} /></FieldGroup></Full>
        )}
      </div>
    </div>
  )
}

/** Lista de ítems: agregar, ordenar y borrar, sin tope. */
function ListaEditor({ def, filas, onChange }: { def: ListaDef; filas: Fila[]; onChange: (f: Fila[]) => void }) {
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= filas.length) return
    const copia = filas.slice();
    [copia[i], copia[j]] = [copia[j] as Fila, copia[i] as Fila]
    onChange(copia)
  }
  return (
    <Full>
      <div style={{ marginTop: 8 }}>
        <div className="text-sdm-sm" style={{ fontWeight: 600, color: 'var(--navy-dark)', marginBottom: 2 }}>{def.titulo} ({filas.length})</div>
        {def.ayuda && <div className="text-sdm-xs" style={{ color: 'var(--muted)', marginBottom: 10 }}>{def.ayuda}</div>}
        {filas.map((f, i) => (
          <FilaEditor key={f.id} def={def} fila={f} indice={i} total={filas.length}
            onCambio={cambios => onChange(filas.map(x => (x.id === f.id ? { ...x, ...cambios } : x)))}
            onSubir={() => mover(i, -1)} onBajar={() => mover(i, 1)}
            onQuitar={() => { if (window.confirm(`¿Quitar este ítem (${def.itemRotulo} ${i + 1})? Se borra al guardar.`)) onChange(filas.filter(x => x.id !== f.id)) }} />
        ))}
        {filas.length === 0 && <div className="text-sdm-sm" style={{ color: 'var(--muted)', fontStyle: 'italic', marginBottom: 8 }}>Sin ítems: esta lista no se muestra en el showcase.</div>}
        <button type="button" onClick={() => onChange([...filas, nuevaFila()])} className="text-sdm-xs tracking-sdm-wide"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: '1px dashed var(--border-input)', color: 'var(--navy-dark)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
          <Plus size={14} />Agregar {def.itemRotulo.toLowerCase()}
        </button>
      </div>
    </Full>
  )
}

/** Sección de tarjetas con foto (construcciones, energía, producción). */
function SeccionTarjetas({ id, nombre, c, set, listas, setLista }: { id: string; nombre: string; c: Contenido; set: (k: string, v: string) => void; listas: Listas; setLista: (s: string, f: Fila[]) => void }) {
  const def = LISTAS[id] as ListaDef
  return (
    <Sec title={<><Layers size={18} strokeWidth={1.75} />{nombre}</>}>
      <CampoBi clave={`${id}_eyebrow`} label="Eyebrow / kicker" c={c} set={set} />
      <CampoBi clave={`${id}_titulo`} label="Título de sección" c={c} set={set} />
      <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CampoBi clave={`${id}_intro`} label="Introducción" c={c} set={set} filas={3} /></div></Full>
      <ListaEditor def={def} filas={listas[id] ?? []} onChange={f => setLista(id, f)} />
    </Sec>
  )
}

/** Bloques de la ficha técnica: cada uno con título y filas clave → valor. */
function EditorFicha({ c, set, listas, setLista, quitarClaves, setBloques }: {
  c: Contenido; set: (k: string, v: string) => void; listas: Listas; setLista: (s: string, f: Fila[]) => void
  quitarClaves: (claves: string[]) => void; setBloques: (slugs: string[]) => void
}) {
  const [nuevo, setNuevo] = useState('')
  const slugs = (c.ficha_bloques ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= slugs.length) return
    const copia = slugs.slice();
    [copia[i], copia[j]] = [copia[j] as string, copia[i] as string]
    setBloques(copia)
  }
  const agregar = () => {
    const s = nuevo.trim().toLowerCase()
    if (!SLUG_FICHA.test(s)) { alert('El identificador va en minúsculas, sin espacios ni tildes (letras, números y guion bajo). Ej.: suelo'); return }
    if (slugs.includes(s)) { alert('Ya existe un bloque con ese identificador.'); return }
    setBloques([...slugs, s]); setNuevo('')
  }
  const quitar = (slug: string) => {
    if (!window.confirm(`¿Quitar el bloque «${slug}» y todas sus filas? Se borra al guardar.`)) return
    setBloques(slugs.filter(s => s !== slug))
    quitarClaves([`ficha_${slug}_titulo`, `ficha_${slug}_titulo_es`])
    setLista(`ficha_${slug}`, [])
  }
  return (
    <>
      {slugs.map((slug, i) => {
        const def: ListaDef = { seccion: `ficha_${slug}`, titulo: `Filas del bloque «${slug}»`, campos: ['titulo', 'valor'], rotulos: { titulo: 'Etiqueta', valor: 'Valor' }, itemRotulo: 'Fila' }
        return (
          <Full key={slug}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 16, marginBottom: 12 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)' }}>Bloque {i + 1} · {slug}</div>
                <div className="flex gap-2">
                  <BotonIcono titulo="Subir bloque" onClick={() => mover(i, -1)} disabled={i === 0}><ArrowUp size={14} /></BotonIcono>
                  <BotonIcono titulo="Bajar bloque" onClick={() => mover(i, 1)} disabled={i === slugs.length - 1}><ArrowDown size={14} /></BotonIcono>
                  <BotonIcono titulo="Quitar bloque" onClick={() => quitar(slug)}><Trash2 size={14} /></BotonIcono>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoBi clave={`ficha_${slug}_titulo`} label="Título del bloque" c={c} set={set} />
                <ListaEditor def={def} filas={listas[def.seccion] ?? []} onChange={f => setLista(def.seccion, f)} />
              </div>
            </div>
          </Full>
        )
      })}
      <Full>
        <div className="flex items-end gap-3 flex-wrap">
          <div style={{ minWidth: 240 }}>
            <Field label="Identificador del bloque nuevo"><input className="input-line" value={nuevo} placeholder="ej. suelo" onChange={e => setNuevo(e.target.value)} /></Field>
          </div>
          <button type="button" onClick={agregar} className="text-sdm-xs tracking-sdm-wide"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', padding: '9px 16px', borderRadius: 2, border: '1px dashed var(--border-input)', color: 'var(--navy-dark)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            <Plus size={14} />Agregar bloque
          </button>
        </div>
      </Full>
    </>
  )
}

/** Color del acento con su contraste medido. */
function CampoAcento({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const hex = esHex(valor) ? valor : ACENTO_POR_DEFECTO
  const sobreFondo = razon(hex, BASE.bg)
  const sobreTarjeta = razon(hex, '#161b17')   // el peor caso: tarjeta (3 % blanco) sobre bgMid
  const boton = razon(BASE.tinta, hex)
  const peor = Math.min(sobreFondo, sobreTarjeta, boton)
  return (
    <Full><FieldGroup label="Color de acento (paleta de esta propiedad)">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="color" aria-label="Elegir color de acento" value={hex} onChange={e => onChange(e.target.value.toUpperCase())} style={{ width: 44, height: 36, padding: 0, border: '1px solid var(--border-input)', background: 'none' }} />
        <div style={{ width: 130 }}><Inp value={valor} onChange={v => onChange(v.trim())} placeholder="#7A8B5A" /></div>
        <div className="text-sdm-sm" style={{ color: peor >= 4.5 ? 'var(--green-dark)' : '#b3261e', fontWeight: 600 }}>
          {peor >= 4.5 ? '✓ Contraste suficiente' : '✗ Contraste insuficiente'} · texto sobre fondo {sobreFondo.toFixed(2)}:1 · sobre tarjeta {sobreTarjeta.toFixed(2)}:1 · botón {boton.toFixed(2)}:1 (mínimo 4,5)
        </div>
      </div>
      {valor !== '' && !esHex(valor) && <div className="text-sdm-xs" style={{ color: '#b3261e' }}>Formato inválido: usa #rrggbb. Mientras tanto se usa el color por defecto.</div>}
    </FieldGroup></Full>
  )
}

// ─── Selector de propiedad ───────────────────────────────────────────────────

/** Minúsculas y sin tildes, para que «jardin» encuentre «Jardín». */
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function FilaPropiedad({ p, seleccionada, onElegir }: { p: PropOpcion; seleccionada: boolean; onElegir: (id: string) => void }) {
  const activa = p.activo !== false
  return (
    <button type="button" onClick={() => onElegir(p.id)} aria-current={seleccionada ? 'true' : undefined}
      className="text-sdm-base"
      style={{
        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left', cursor: 'pointer',
        padding: '9px 14px', border: 'none', borderBottom: '1px solid var(--border)', fontFamily: 'inherit',
        borderLeft: `3px solid ${seleccionada ? 'var(--navy)' : 'var(--green)'}`,
        background: seleccionada ? 'var(--off)' : '#fff', color: 'var(--navy-dark)', fontWeight: 500,
      }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Layers size={14} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--green-dark)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo ?? p.id}{p.pais && p.pais !== 'Chile' ? ` · ${p.pais}` : ''}</span>
      </span>
      <Badge label={activa ? 'Activa' : 'Inactiva'} color={activa ? 'var(--green-dark)' : 'var(--muted)'} />
    </button>
  )
}

/** Mientras la lista no pase de esto, el buscador sobra. */
const MAX_SIN_BUSCADOR = 10

/**
 * Lista de las propiedades que YA tienen showcase. El panel solo EDITA: un showcase nuevo lleva
 * decisiones de diseño y de contenido que se trabajan aparte, así que las propiedades sin
 * showcase no se listan, ni se buscan, ni se pueden elegir desde acá.
 */
function SelectorPropiedad({ propiedades, sel, onElegir }: { propiedades: PropOpcion[]; sel: string; onElegir: (id: string) => void }) {
  const [q, setQ] = useState('')
  const conBuscador = propiedades.length > MAX_SIN_BUSCADOR
  const filtradas = useMemo(() => {
    const t = plano(q.trim())
    return conBuscador && t ? propiedades.filter(p => plano(`${p.titulo ?? ''} ${p.slug ?? ''} ${p.pais ?? ''}`).includes(t)) : propiedades
  }, [propiedades, q, conBuscador])
  return (
    <div>
      {conBuscador && (
        <Field label="Buscar propiedad">
          <input className="input-line" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Escribe parte del nombre…" />
        </Field>
      )}
      <div className="text-sdm-xs" style={{ marginTop: conBuscador ? 12 : 0, marginBottom: 6, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)' }}>Propiedades con showcase · {propiedades.length}</div>
      <div role="group" aria-label="Propiedades con showcase" style={{ border: '1px solid var(--border)', maxHeight: 320, overflowY: 'auto', background: '#fff' }}>
        {filtradas.map(p => <FilaPropiedad key={p.id} p={p} seleccionada={p.id === sel} onElegir={onElegir} />)}
        {propiedades.length === 0 && <div className="text-sdm-sm" style={{ padding: '14px', color: 'var(--muted)' }}>Ninguna propiedad tiene showcase todavía.</div>}
        {propiedades.length > 0 && filtradas.length === 0 && <div className="text-sdm-sm" style={{ padding: '14px', color: 'var(--muted)' }}>Ninguna propiedad coincide con «{q}».</div>}
      </div>
    </div>
  )
}

/** Interruptor de `propiedades.activo`: el MISMO campo que edita el panel de Propiedades. */
function ControlActivo({ activa, cambiando, aviso, onCambiar }: { activa: boolean; cambiando: boolean; aviso: string; onCambiar: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: activa ? 'var(--admin-ok-fondo)' : 'var(--error-fondo)', borderRadius: 4, border: `1px solid ${activa ? 'var(--admin-ok)' : 'var(--error)'}` }}>
        <button type="button" role="switch" aria-checked={activa} aria-label="Propiedad activa en el sitio" disabled={cambiando} onClick={onCambiar}
          style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: cambiando ? 'wait' : 'pointer', background: activa ? 'var(--green)' : '#ccc', position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: cambiando ? 0.6 : 1 }}>
          <span style={{ position: 'absolute', top: 2, left: activa ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
        </button>
        <span className="text-sdm-sm" style={{ fontWeight: 500, color: activa ? 'var(--admin-ok)' : 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {activa ? <><Check size={14} strokeWidth={2} />Activa — visible en el catálogo</> : <><Pause size={14} strokeWidth={2} />Inactiva — oculta del catálogo</>}
        </span>
      </div>
      <div role="status" className="text-sdm-sm" style={{ minHeight: 20, marginTop: 6, color: 'var(--green-dark)', fontWeight: 500 }}>{aviso}</div>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function Showcase() {
  const [propiedades, setPropiedades] = useState<PropOpcion[]>([])
  const [sel, setSel] = useState('')
  const [c, setC] = useState<Contenido>({})
  const [listas, setListas] = useState<Listas>({})
  // Lo que había en la base al cargar: para saber qué filas borrar al guardar.
  const [orig, setOrig] = useState<{ claves: string[]; ids: Record<string, string[]> }>({ claves: [], ids: {} })
  const [cargando, setCargando] = useState(false)
  const [sucio, setSucio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cambiandoActivo, setCambiandoActivo] = useState(false)
  const [avisoActivo, setAvisoActivo] = useState('')

  // Estable (solo usa setters): permite listarlo como dependencia del efecto de
  // montaje sin que se reejecute, y sin silenciar `exhaustive-deps`.
  const cargar = useCallback(async (id: string) => {
    setCargando(true)
    const [cont, its, prop] = await Promise.all([
      supabase.from('showcase_contenido').select('clave, valor').eq('propiedad_id', id),
      supabase.from('showcase_items').select('*').eq('propiedad_id', id).order('seccion').order('orden'),
      // El estado `activo` se lee de la base al elegir la propiedad, no del listado de al abrir
      // el panel: si se cambió desde Propiedades en otra pestaña, aquí aparece el valor real.
      supabase.from('propiedades').select('id, titulo, slug, activo, pais').eq('id', id).maybeSingle(),
    ])
    setCargando(false)
    if (avisarError('No se pudo cargar el showcase', cont.error) || avisarError('No se pudieron cargar los ítems del showcase', its.error)) return
    if (!avisarError('No se pudo leer el estado de la propiedad', prop.error) && prop.data) {
      const fresca = prop.data as PropOpcion
      setPropiedades(prev => prev.map(x => x.id === fresca.id ? { ...x, ...fresca } : x))
    }
    setAvisoActivo('')
    const nuevoC: Contenido = {}
    for (const r of (cont.data ?? []) as { clave: string; valor: string }[]) nuevoC[r.clave] = r.valor
    const nuevasListas: Listas = {}
    const ids: Record<string, string[]> = {}
    for (const r of (its.data ?? []) as unknown as (Record<string, unknown> & { seccion: string })[]) {
      (nuevasListas[r.seccion] ||= []).push(aFila(r));
      (ids[r.seccion] ||= []).push(r.id as string)
    }
    setSel(id); setC(nuevoC); setListas(nuevasListas)
    setOrig({ claves: Object.keys(nuevoC), ids })
    setSucio(false)
  }, [])

  // La lista son SOLO las propiedades que ya tienen filas de showcase (en cualquiera de las dos
  // tablas). Es lectura pura: abrir el panel o elegir una propiedad no escribe nada.
  // (PostgREST corta en 1000 filas por consulta: sobra mientras haya unas decenas de showcases.)
  useEffect(() => {
    Promise.all([
      supabase.from('showcase_contenido').select('propiedad_id'),
      supabase.from('showcase_items').select('propiedad_id'),
    ]).then(async ([c, i]) => {
      if (avisarError('No se pudo leer qué propiedades tienen showcase', c.error) || avisarError('No se pudo leer qué propiedades tienen showcase', i.error)) return
      const ids = [...new Set([...(c.data ?? []), ...(i.data ?? [])].map(r => (r as { propiedad_id: string }).propiedad_id))]
      if (ids.length === 0) { setPropiedades([]); return }
      const p = await supabase.from('propiedades').select('id, titulo, slug, activo, pais').in('id', ids).order('titulo')
      if (avisarError('No se pudo cargar la lista de propiedades', p.error)) return
      const lista = (p.data ?? []) as PropOpcion[]
      setPropiedades(lista)
      if (lista[0]) void cargar(lista[0].id)
    })
  }, [cargar])

  const elegir = (id: string) => {
    if (!id) return
    if (sucio && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de propiedad?')) return
    void cargar(id)
  }

  // Escribe `propiedades.activo` y SOLO eso. Se pinta el valor nuevo cuando la base lo confirma
  // (no antes): el interruptor no puede mostrar «activa» si la escritura falló.
  const cambiarActivo = async () => {
    const p = propiedades.find(x => x.id === sel)
    if (!p || cambiandoActivo) return
    const nuevo = p.activo === false
    setCambiandoActivo(true); setAvisoActivo('')
    const { error } = await supabase.from('propiedades').update({ activo: nuevo }).eq('id', p.id)
    setCambiandoActivo(false)
    if (avisarError('No se pudo cambiar el estado de la propiedad', error)) return
    setPropiedades(prev => prev.map(x => x.id === p.id ? { ...x, activo: nuevo } : x))
    setAvisoActivo(nuevo ? 'Propiedad activada: ya aparece en el catálogo.' : 'Propiedad desactivada: ya no aparece en el catálogo.')
  }

  const set = (k: string, v: string) => { setC(prev => ({ ...prev, [k]: v })); setSucio(true) }
  const setLista = (s: string, f: Fila[]) => { setListas(prev => ({ ...prev, [s]: f })); setSucio(true) }
  const quitarClaves = (claves: string[]) => { setC(prev => { const n = { ...prev }; for (const k of claves) delete n[k]; return n }); setSucio(true) }
  const setBloques = (slugs: string[]) => set('ficha_bloques', slugs.join(','))

  const save = async () => {
    // Solo se guarda sobre una propiedad que YA tiene showcase: el panel edita, no crea.
    if (!sel || !propiedades.some(x => x.id === sel)) return
    setSaving(true)
    const ahora = new Date().toISOString()

    // 1. Contenido suelto: lo vacío se borra, lo demás se guarda.
    const vivas = Object.entries(c).filter(([, v]) => v.trim() !== '')
    const vivasSet = new Set(vivas.map(([k]) => k))
    const aBorrar = orig.claves.filter(k => !vivasSet.has(k))
    if (vivas.length) {
      const { error } = await supabase.from('showcase_contenido').upsert(
        vivas.map(([clave, valor]) => ({ propiedad_id: sel, clave, valor, updated_at: ahora })),
        { onConflict: 'propiedad_id,clave' })
      if (avisarError('No se pudo guardar el contenido del showcase', error)) { setSaving(false); return }
    }
    if (aBorrar.length) {
      const { error } = await supabase.from('showcase_contenido').delete().eq('propiedad_id', sel).in('clave', aBorrar)
      if (avisarError('No se pudieron quitar los campos vaciados del showcase', error)) { setSaving(false); return }
    }

    // 2. Ítems: se guardan los que están (con su orden actual) y se borran los quitados.
    const filas = Object.entries(listas).flatMap(([seccion, fs]) => fs.map((f, i) => ({
      id: f.id, propiedad_id: sel, seccion, orden: i + 1,
      titulo: nulo(f.titulo), titulo_es: nulo(f.titulo_es),
      descripcion: nulo(f.descripcion), descripcion_es: nulo(f.descripcion_es),
      valor: nulo(f.valor), valor_es: nulo(f.valor_es),
      img: nulo(f.img), icono: nulo(f.icono), fotos: f.fotos, updated_at: ahora,
    })))
    if (filas.length) {
      const { error } = await supabase.from('showcase_items').upsert(filas, { onConflict: 'id' })
      if (avisarError('No se pudieron guardar las listas del showcase', error)) { setSaving(false); return }
    }
    const vivosIds = new Set(filas.map(f => f.id))
    const idsBorrar = Object.values(orig.ids).flat().filter(id => !vivosIds.has(id))
    if (idsBorrar.length) {
      const { error } = await supabase.from('showcase_items').delete().in('id', idsBorrar)
      if (avisarError('No se pudieron quitar los ítems borrados del showcase', error)) { setSaving(false); return }
    }

    // Lo que hay ahora en la base pasa a ser el nuevo punto de partida.
    const idsNuevos: Record<string, string[]> = {}
    for (const f of filas) (idsNuevos[f.seccion] ||= []).push(f.id)
    setOrig({ claves: vivas.map(([k]) => k), ids: idsNuevos })
    setSaving(false); setSucio(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const actual = useMemo(() => propiedades.find(p => p.id === sel), [propiedades, sel])
  const tituloPagina = actual?.titulo ?? 'Showcase'

  return (
    <div>
      <div className="flex flex-col items-start gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <h2 className="font-serif font-light flex items-center gap-2 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}><Layers size={18} strokeWidth={1.75} />Showcase — {tituloPagina}</h2>
        <div className="flex items-center gap-4">
          <Guardado visible={saved} />
          {sucio && <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Cambios sin guardar</span>}
          <SaveBtn onClick={save} loading={saving} />
        </div>
      </div>

      <Sec title={<><Layers size={18} strokeWidth={1.75} />Propiedad</>}>
        <Full>
          <SelectorPropiedad propiedades={propiedades} sel={sel} onElegir={elegir} />
        </Full>
        {actual && (
          <>
            <Full>
              <div className="text-sdm-sm" style={{ color: 'var(--muted)' }}>
                <a href={`/propiedades/${actual.slug || actual.id}/showcase`} target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Abrir el showcase <ExternalLink size={13} />
                </a>
                {' · '}<code>/propiedades/{actual.slug || actual.id}/showcase</code>
                {actual.activo === false && ' · La propiedad está inactiva: no aparece en el catálogo, pero el showcase carga por este enlace.'}
              </div>
            </Full>
            <Full>
              <ControlActivo activa={actual.activo !== false} cambiando={cambiandoActivo} aviso={avisoActivo} onCambiar={cambiarActivo} />
            </Full>
          </>
        )}
      </Sec>

      {sel && !cargando && (
        <>
          <Sec title={<><Layers size={18} strokeWidth={1.75} />Publicación y estilo</>}>
            <Full>
              <label className="flex items-center gap-3 text-sdm-base" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={c.publicado === 'true'} onChange={e => set('publicado', e.target.checked ? 'true' : '')} />
                Mostrar el banner del showcase en la ficha de la propiedad
              </label>
              <div className="text-sdm-xs" style={{ color: 'var(--muted)', marginTop: 4 }}>Antes de activarlo con un acento distinto del verde de El Barranco, hay que medir el contraste del banner sobre sus fotos (ver comentario en ShowcaseBanner).</div>
            </Full>
            <CampoAcento valor={c.tema_acento ?? ''} onChange={v => set('tema_acento', v)} />
            <Field label="Color de las descripciones de tarjeta (#rrggbb, opcional)">
              <input className="input-line" value={c.tema_texto_desc ?? ''} placeholder="#B0A89D" onChange={e => set('tema_texto_desc', e.target.value)} />
              <div className="text-sdm-xs" style={{ color: 'var(--muted)', marginTop: 4 }}>Vacío = el gris por defecto (3,9:1 sobre el fondo oscuro, no llega a 4,5:1). Para un párrafo largo conviene 7:1 o más. Con un color aquí se activa el modo de contraste reforzado (velo localizado en el hero, acento aclarado sobre fotos, selector de idioma en barra).</div>
            </Field>
            <Full>
              <label className="flex items-center gap-3 text-sdm-base" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={c.tema_velo_movil === 'fuerte'} onChange={e => set('tema_velo_movil', e.target.checked ? 'fuerte' : '')} />
                Velo del hero más alto en móvil (para fotos de hero claras)
              </label>
              <div className="text-sdm-xs" style={{ color: 'var(--muted)', marginTop: 4 }}>Solo tiene efecto con el color de descripciones puesto arriba (modo reforzado).</div>
            </Full>
            <Field label="Idioma por defecto">
              <select className="input-line" value={c.idioma_default === 'es' ? 'es' : 'en'} onChange={e => set('idioma_default', e.target.value)}>
                <option value="en">Inglés (EN)</option>
                <option value="es">Español (ES)</option>
              </select>
            </Field>
            <div />
            <CampoBi clave="seo_titulo" label="Título SEO" c={c} set={set} />
            <CampoBi clave="seo_descripcion" label="Descripción SEO" c={c} set={set} filas={2} />
            <CampoFoto clave="banner_detalle_foto" label="Foto del banner en la ficha de la propiedad" c={c} set={set} />
            <CampoFoto clave="banner_foto" label="Foto del banner inferior de la ficha" c={c} set={set} />
            <CampoUno clave="footer_texto" label="Texto del pie (sin año)" c={c} set={set} placeholder="SDM Capital Real Estate · Nombre · Ciudad" />
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Hero</>}>
            <CampoUno clave="hero_titulo" label="Título (igual EN/ES)" c={c} set={set} />
            <CampoUno clave="hero_eyebrow" label="Eyebrow sobre el título" c={c} set={set} />
            <CampoBi clave="hero_subtitulo" label="Subtítulo" c={c} set={set} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CampoBi clave="hero_tagline" label="Tagline / descripción" c={c} set={set} filas={3} /></div></Full>
            <ListaEditor def={LISTAS.hero as ListaDef} filas={listas.hero ?? []} onChange={f => setLista('hero', f)} />
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Destino</>}>
            <CampoBi clave="dest_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="dest_titulo" label="Título de sección" c={c} set={set} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoBi clave="destination_p1" label="Párrafo 1" c={c} set={set} filas={3} />
              <CampoBi clave="destination_p2" label="Párrafo 2" c={c} set={set} filas={3} />
            </div></Full>
            <CampoFoto clave="destination_foto" label="Foto de la sección" c={c} set={set} />
            <CampoUno clave="destination_foto_alt" label="Texto alternativo de la foto" c={c} set={set} />
            <CampoUno clave="destino_video_id" label="Video de YouTube (ID o URL; vacío = sin video)" c={c} set={set} placeholder="X5EdCOT-IoY" />
            <CampoUno clave="destino_tripadvisor_url" label="Enlace a TripAdvisor (https://…; vacío = sin enlace)" c={c} set={set} placeholder="https://www.tripadvisor.com/…" />
            <CampoBi clave="destino_tripadvisor_texto" label="Texto del enlace de TripAdvisor" c={c} set={set} />
            <ListaEditor def={LISTAS.destino_stats as ListaDef} filas={listas.destino_stats ?? []} onChange={f => setLista('destino_stats', f)} />
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Actividades</>}>
            <CampoBi clave="exp_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="exp_titulo" label="Título de sección" c={c} set={set} />
            <ListaEditor def={LISTAS.actividades as ListaDef} filas={listas.actividades ?? []} onChange={f => setLista('actividades', f)} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CampoBi clave="act_p" label="Párrafo bajo las actividades" c={c} set={set} filas={3} /></div></Full>
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />La propiedad</>}>
            <CampoBi clave="prop_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="prop_titulo" label="Título de sección" c={c} set={set} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CampoBi clave="propiedad_desc" label="Descripción introductoria" c={c} set={set} filas={4} /></div></Full>
            <ListaEditor def={LISTAS.propiedad_fotos as ListaDef} filas={listas.propiedad_fotos ?? []} onChange={f => setLista('propiedad_fotos', f)} />
            <ListaEditor def={LISTAS.amenidades as ListaDef} filas={listas.amenidades ?? []} onChange={f => setLista('amenidades', f)} />
          </Sec>

          <SeccionTarjetas id="construcciones" nombre="Construcciones" c={c} set={set} listas={listas} setLista={setLista} />
          <SeccionTarjetas id="energia" nombre="Infraestructura energética" c={c} set={set} listas={listas} setLista={setLista} />
          <SeccionTarjetas id="produccion" nombre="Producción agrícola y ganadera" c={c} set={set} listas={listas} setLista={setLista} />

          <Sec title={<><Layers size={18} strokeWidth={1.75} />La oportunidad</>}>
            <CampoBi clave="opp_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="opp_titulo" label="Título de sección" c={c} set={set} />
            <CampoBi clave="opp_tab_story" label="Pestaña «Story»" c={c} set={set} />
            <CampoBi clave="opp_tab_brief" label="Pestaña «Brief»" c={c} set={set} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoBi clave="story_p1" label="Story — párrafo 1 (destacado)" c={c} set={set} filas={3} />
              <CampoBi clave="story_p2" label="Story — párrafo 2" c={c} set={set} filas={4} />
              <CampoBi clave="story_p3" label="Story — párrafo 3" c={c} set={set} filas={4} />
              <CampoBi clave="brief_upside_titulo" label="Recuadro de crecimiento — título" c={c} set={set} />
              <CampoBi clave="brief_upside_texto" label="Recuadro de crecimiento — texto" c={c} set={set} filas={4} />
            </div></Full>
            <ListaEditor def={LISTAS.brief as ListaDef} filas={listas.brief ?? []} onChange={f => setLista('brief', f)} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoBi clave="brief_legal_titulo" label="Situación legal — título" c={c} set={set} />
              <CampoBi clave="brief_legal_texto" label="Situación legal — texto" c={c} set={set} filas={4} />
            </div></Full>
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Ficha técnica</>}>
            <CampoBi clave="details_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="details_titulo" label="Título de sección" c={c} set={set} />
            <EditorFicha c={c} set={set} listas={listas} setLista={setLista} quitarClaves={quitarClaves} setBloques={setBloques} />
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Galería</>}>
            <CampoBi clave="gallery_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="gallery_titulo" label="Título de sección" c={c} set={set} />
            <ListaEditor def={LISTAS.galeria as ListaDef} filas={listas.galeria ?? []} onChange={f => setLista('galeria', f)} />
            <ListaEditor def={LISTAS.galeria_reserva as ListaDef} filas={listas.galeria_reserva ?? []} onChange={f => setLista('galeria_reserva', f)} />
          </Sec>

          <Sec title={<><Layers size={18} strokeWidth={1.75} />Contacto — precio y datos</>}>
            <CampoBi clave="contact_eyebrow" label="Eyebrow / kicker" c={c} set={set} />
            <CampoBi clave="contact_titulo" label="Título de sección" c={c} set={set} />
            <CampoUno clave="precio_display" label="Precio principal (grande, sin traducir)" c={c} set={set} placeholder="USD 3,000,000 · Gs. 4.950.000.000" />
            <div />
            <CampoBi clave="precio_sub" label="Precio — subtexto" c={c} set={set} />
            <Full><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><CampoBi clave="contacto_parrafo" label="Párrafo descriptivo" c={c} set={set} filas={3} /></div></Full>
            <CampoUno clave="contacto_telefono" label="Teléfono" c={c} set={set} />
            <CampoUno clave="contacto_empresa" label="Nombre empresa" c={c} set={set} />
          </Sec>

          <div className="flex justify-end mt-4">
            <SaveBtn onClick={save} loading={saving} />
          </div>
        </>
      )}
      {cargando && <div className="text-sdm-base" style={{ color: 'var(--muted)' }}>Cargando…</div>}
    </div>
  )
}
