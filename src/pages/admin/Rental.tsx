// Pestaña "Rental" del admin — textos de SDM Rental en `contenido_sitio`.
//
// Extraída de AdminPage.tsx sin cambios de comportamiento: mismos estilos,
// mismas queries. Los emojis pasaron a iconos de lucide-react más tarde. La clave de pestaña sigue siendo 'rental' — el orden de las pestañas
// se persiste en localStorage y renombrarla borraría esa preferencia.

import { useState, useEffect } from 'react'
import { Home, Image, KeyRound, Scale, Users, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { avisarError } from '@/lib/errores'
import { invalidateContenidoCache } from '@/hooks/useContenido'
import { Sec, Full } from '@/components/admin/layout'
import { Field, FieldGroup, Inp, Txa } from '@/components/admin/campos'
import { SaveBtn, Guardado } from '@/components/admin/acciones'
import { ImageUploader } from '@/components/admin/ImageUploader'

export default function Rental() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const [d, setD] = useState({
    rental_hero_img: '',
    rental_hero_titulo: 'Tu propiedad, sin preocupaciones',
    rental_hero_subtitulo: 'SDM Rental se encarga de todo: buscamos arrendatarios, cobramos las rentas y administramos tu propiedad mes a mes. Tú solo recibes los resultados.',
    rental_quienes_titulo: '20 años de experiencia a tu servicio',
    rental_quienes_somos: 'Contamos con más de 20 años de experiencia en el sector comercial bancario e inmobiliario. Somos especialistas en soluciones adaptadas a cada cliente, con respaldo legal en todas nuestras operaciones y una red de marketing digital que posiciona tu propiedad donde los arrendatarios te buscan.',
    rental_prop_titulo: 'Arrienda sin complicaciones',
    rental_prop_subtitulo: 'Nos encargamos de cada etapa del proceso de arriendo para que tú no tengas que preocuparte de nada.',
    rental_check_1: 'Buscamos y seleccionamos arrendatarios con evaluación completa.',
    rental_check_2: 'Redactamos y formalizamos el contrato de arriendo.',
    rental_check_3: 'Cobramos las rentas y te transferimos mensualmente.',
    rental_check_4: 'Gestionamos mantenciones e incidencias por ti.',
    rental_check_5: 'Informes mensuales de tu propiedad.',
    rental_comision_std_pct: '50% + 7%',
    rental_comision_std_desc: 'pago único + 7% mensual sobre el arriendo',
    rental_comision_plus_pct: '50% + 10%',
    rental_comision_plus_desc: 'pago único + 10% mensual sobre el arriendo',
    rental_arr_titulo: 'Encuentra tu próximo hogar',
    rental_arr_subtitulo: 'Tenemos propiedades disponibles en arriendo en Santiago y sus alrededores. Proceso simple, transparente y sin costos ocultos.',
    rental_comp_titulo: 'Compara tus opciones',
    rental_std_tipo: 'Plan Standard',
    rental_std_precio: '50% + 7%',
    rental_std_precio_desc: 'pago único al firmar + 7% mensual sobre el arriendo',
    rental_std_frase: 'Nos encargamos del arriendo completo, mes a mes.',
    rental_std_item_1: 'Buscamos y seleccionamos al arrendatario',
    rental_std_item_2: 'Verificamos antecedentes y acreditamos renta',
    rental_std_item_3: 'Redactamos y formalizamos el contrato',
    rental_std_item_4: 'Cobramos las rentas y te transferimos',
    rental_std_item_5: 'Gestionamos mantenciones e incidencias',
    rental_std_cta: 'Quiero el Plan Standard',
    rental_std_wa: 'https://wa.me/56931038954?text=Hola%20Roberto%2C%20quiero%20arrendar%20mi%20propiedad%20con%20el%20Plan%20Standard%20de%20SDM%20Rental.',
    rental_plus_rotulo: 'Recomendado',
    rental_plus_tipo: 'Plan Plus',
    rental_plus_precio: '50% + 10%',
    rental_plus_precio_desc: 'pago único al firmar + 10% mensual sobre el arriendo',
    rental_plus_frase: 'Todo lo del Plan Standard, con un seguro que respalda tus rentas.',
    rental_plus_item_6: 'Seguro de rentas impagas y restitución',
    rental_plus_nota: 'Cubre hasta 6 meses de arriendo, más gastos comunes, servicios básicos y honorarios legales. La aprobación del siniestro la resuelve la aseguradora.',
    rental_plus_cta: 'Quiero el Plan Plus',
    rental_plus_wa: 'https://wa.me/56931038954?text=Hola%20Roberto%2C%20quiero%20arrendar%20mi%20propiedad%20con%20el%20Plan%20Plus%20de%20SDM%20Rental%2C%20con%20seguro%20incluido.',
  })

  const set = (k: string) => (v: string) => setD(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    supabase.from('contenido_sitio').select('clave, valor').then(({ data }) => {
      if (data && data.length > 0) {
        const loaded: Record<string, string> = {}
        data.forEach(({ clave, valor }) => { loaded[clave] = valor })
        setD(prev => ({ ...prev, ...loaded }))
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('contenido_sitio').upsert(
      Object.entries(d).map(([clave, valor]) => ({ clave, valor })),
      { onConflict: 'clave' }
    )
    setSaving(false)
    if (avisarError('No se pudo guardar el contenido del sitio', error)) return
    invalidateContenidoCache()
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }


  return (
    <div>
      <div className="flex flex-col items-start gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <h2 className="font-serif font-light text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>SDM Rental</h2>
        <div className="flex items-center gap-4">
          <Guardado visible={saved} />
          <SaveBtn onClick={save} loading={saving} />
        </div>
      </div>

      <Sec title={<><Image size={18} strokeWidth={1.75} />Hero</>}>
        <Full><FieldGroup label="Imagen de fondo"><ImageUploader currentUrl={d.rental_hero_img} folder="rental" onUploaded={url => setD(p => ({ ...p, rental_hero_img: url }))} /></FieldGroup></Full>
        <Full><Field label="Título"><Inp value={d.rental_hero_titulo} onChange={set('rental_hero_titulo')} /></Field></Full>
        <Full><Field label="Subtítulo"><Txa value={d.rental_hero_subtitulo} onChange={set('rental_hero_subtitulo')} rows={3} /></Field></Full>
      </Sec>

      <Sec title={<><Users size={18} strokeWidth={1.75} />Quiénes Somos Rental</>}>
        <Field label="Título"><Inp value={d.rental_quienes_titulo} onChange={set('rental_quienes_titulo')} /></Field>
        <Full><Field label="Texto"><Txa value={d.rental_quienes_somos} onChange={set('rental_quienes_somos')} rows={5} /></Field></Full>
      </Sec>

      <Sec title={<><Home size={18} strokeWidth={1.75} />Para Propietarios</>}>
        <Field label="Título"><Inp value={d.rental_prop_titulo} onChange={set('rental_prop_titulo')} /></Field>
        <Full><Field label="Subtítulo"><Txa value={d.rental_prop_subtitulo} onChange={set('rental_prop_subtitulo')} rows={2} /></Field></Full>
        <Full><Field label="Ítem 1"><Inp value={d.rental_check_1} onChange={set('rental_check_1')} /></Field></Full>
        <Full><Field label="Ítem 2"><Inp value={d.rental_check_2} onChange={set('rental_check_2')} /></Field></Full>
        <Full><Field label="Ítem 3"><Inp value={d.rental_check_3} onChange={set('rental_check_3')} /></Field></Full>
        <Full><Field label="Ítem 4"><Inp value={d.rental_check_4} onChange={set('rental_check_4')} /></Field></Full>
        <Full><Field label="Ítem 5"><Inp value={d.rental_check_5} onChange={set('rental_check_5')} /></Field></Full>
      </Sec>

      <Sec title={<><Wallet size={18} strokeWidth={1.75} />Comisiones</>}>
        <Field label="Plan Standard — %"><Inp value={d.rental_comision_std_pct} onChange={set('rental_comision_std_pct')} /></Field>
        <Field label="Plan Standard — descripción"><Inp value={d.rental_comision_std_desc} onChange={set('rental_comision_std_desc')} /></Field>
        <Field label="Plan Plus — %"><Inp value={d.rental_comision_plus_pct} onChange={set('rental_comision_plus_pct')} /></Field>
        <Field label="Plan Plus — descripción"><Inp value={d.rental_comision_plus_desc} onChange={set('rental_comision_plus_desc')} /></Field>
      </Sec>

      <Sec title={<><KeyRound size={18} strokeWidth={1.75} />Para Arrendatarios</>}>
        <Field label="Título"><Inp value={d.rental_arr_titulo} onChange={set('rental_arr_titulo')} /></Field>
        <Full><Field label="Subtítulo"><Txa value={d.rental_arr_subtitulo} onChange={set('rental_arr_subtitulo')} rows={2} /></Field></Full>
      </Sec>

      <Sec title={<><Scale size={18} strokeWidth={1.75} />Comparativo</>}>
        <Full><Field label="Título de la sección"><Inp value={d.rental_comp_titulo} onChange={set('rental_comp_titulo')} /></Field></Full>

        <Full>
          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 4 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 12 }}>Tarjeta izquierda</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Título"><Inp value={d.rental_std_tipo} onChange={set('rental_std_tipo')} /></Field>
              <Field label="Precio"><Inp value={d.rental_std_precio} onChange={set('rental_std_precio')} /></Field>
              <Full><Field label="Bajada del precio"><Inp value={d.rental_std_precio_desc} onChange={set('rental_std_precio_desc')} /></Field></Full>
              <Full><Field label="Frase"><Inp value={d.rental_std_frase} onChange={set('rental_std_frase')} /></Field></Full>
              <Full><Field label="Ítem 1 (también en el Plan Plus)"><Inp value={d.rental_std_item_1} onChange={set('rental_std_item_1')} /></Field></Full>
              <Full><Field label="Ítem 2 (también en el Plan Plus)"><Inp value={d.rental_std_item_2} onChange={set('rental_std_item_2')} /></Field></Full>
              <Full><Field label="Ítem 3 (también en el Plan Plus)"><Inp value={d.rental_std_item_3} onChange={set('rental_std_item_3')} /></Field></Full>
              <Full><Field label="Ítem 4 (también en el Plan Plus)"><Inp value={d.rental_std_item_4} onChange={set('rental_std_item_4')} /></Field></Full>
              <Full><Field label="Ítem 5 (también en el Plan Plus)"><Inp value={d.rental_std_item_5} onChange={set('rental_std_item_5')} /></Field></Full>
              <Field label="Texto del botón"><Inp value={d.rental_std_cta} onChange={set('rental_std_cta')} /></Field>
              <Full><Field label="Enlace de WhatsApp (debe empezar con https://wa.me/)"><Inp value={d.rental_std_wa} onChange={set('rental_std_wa')} /></Field></Full>
            </div>
          </div>
        </Full>

        <Full>
          <div className="bg-[var(--off)]" style={{ borderRadius: 4, padding: '16px 20px', marginBottom: 4 }}>
            <div className="text-sdm-xs tracking-sdm-wide" style={{ fontWeight: 600, textTransform: 'uppercase', color: 'var(--navy-dark)', marginBottom: 12 }}>Tarjeta derecha (oscura, recomendada)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Rótulo superior"><Inp value={d.rental_plus_rotulo} onChange={set('rental_plus_rotulo')} /></Field>
              <Field label="Título"><Inp value={d.rental_plus_tipo} onChange={set('rental_plus_tipo')} /></Field>
              <Field label="Precio"><Inp value={d.rental_plus_precio} onChange={set('rental_plus_precio')} /></Field>
              <Full><Field label="Bajada del precio"><Inp value={d.rental_plus_precio_desc} onChange={set('rental_plus_precio_desc')} /></Field></Full>
              <Full><Field label="Frase"><Inp value={d.rental_plus_frase} onChange={set('rental_plus_frase')} /></Field></Full>
              <Full><Field label="Ítem 6 — el destacado en verde (los otros cinco son los de la tarjeta izquierda)"><Inp value={d.rental_plus_item_6} onChange={set('rental_plus_item_6')} /></Field></Full>
              <Full><Field label="Letra chica bajo la lista"><Txa value={d.rental_plus_nota} onChange={set('rental_plus_nota')} rows={3} /></Field></Full>
              <Field label="Texto del botón"><Inp value={d.rental_plus_cta} onChange={set('rental_plus_cta')} /></Field>
              <Full><Field label="Enlace de WhatsApp (debe empezar con https://wa.me/)"><Inp value={d.rental_plus_wa} onChange={set('rental_plus_wa')} /></Field></Full>
            </div>
          </div>
        </Full>
      </Sec>

      <div className="flex justify-end mt-4">
        <SaveBtn onClick={save} loading={saving} />
      </div>
    </div>
  )
}
