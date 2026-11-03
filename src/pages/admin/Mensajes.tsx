// Pestaña "Mensajes" del admin — bandeja de contacto_mensajes.
//
// Extraída de AdminPage.tsx sin cambios: mismo markup, mismos estilos, mismas
// queries. Era el panel más autocontenido del archivo (una tabla, sin props,
// sin helpers compartidos y sin estado de AdminPage).
//
// La clave de pestaña sigue siendo 'mensajes' en AdminPage: el orden de las
// pestañas se persiste en localStorage y renombrarla borraría esa preferencia.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { avisarError } from '@/lib/errores'
import type { MensajeContacto } from '@/types'

export default function Mensajes() {
  const [msgs, setMsgs] = useState<MensajeContacto[]>([])
  useEffect(() => {
    supabase.from('contacto_mensajes').select('*').order('created_at', { ascending: false }).then(({ data }) => setMsgs(data || []))
  }, [])
  const marcar = async (id: string) => {
    const { error } = await supabase.from('contacto_mensajes').update({ leido: true }).eq('id', id)
    if (avisarError('No se pudo marcar el mensaje como leído', error)) return
    setMsgs(m => m.map(msg => msg.id === id ? { ...msg, leido: true } : msg))
  }
  const noLeidos = msgs.filter(m => !m.leido).length
  return (
    <div>
      <h2 className="font-serif font-light mb-8 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>
        Mensajes de contacto
        {noLeidos > 0 && <span className="ml-3 font-sans text-[14px] px-3 py-1 rounded-full" style={{ background: 'var(--green-dark)', color: '#fff' }}>{noLeidos} nuevos</span>}
      </h2>
      <div className="flex flex-col gap-4">
        {msgs.map(m => (
          <div key={m.id} className="bg-white border p-6 rounded-sm" style={{ borderColor: m.leido ? 'var(--border)' : 'var(--green)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {!m.leido && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />}
                  <span className="text-sdm-lg" style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{m.nombre}</span>
                  <a className="text-sdm-base" href={`mailto:${m.email}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>{m.email}</a>
                  {m.telefono && <a className="text-sdm-base" href={`tel:${m.telefono}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{m.telefono}</a>}
                </div>
                {m.propiedad_interes && <p className="text-sdm-sm" style={{ color: 'var(--navy)', fontWeight: 600, marginBottom: 6 }}>Propiedad: {m.propiedad_interes}</p>}
                <p className="text-sdm-base" style={{ color: 'var(--ink)', lineHeight: 1.7 }}>{m.mensaje}</p>
                {m.created_at && <p className="text-sdm-sm" style={{ color: 'var(--muted)', marginTop: 8 }}>{new Date(m.created_at).toLocaleString('es-CL')}</p>}
              </div>
              <div className="flex gap-2">
                <a href={`mailto:${m.email}?subject=Re: Consulta SDM Capital`} className="btn-primary text-sdm-xs" style={{ padding: '8px 16px' }}>Responder</a>
                {!m.leido && <button className="text-sdm-xs tracking-sdm-wide" onClick={() => m.id && marcar(m.id)} style={{ textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: '1px solid var(--border-input)', color: 'var(--muted)', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Marcar leído</button>}
              </div>
            </div>
          </div>
        ))}
        {msgs.length === 0 && <div className="text-center py-16 text-sdm-base" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Todavía no hay mensajes. Los que lleguen por el formulario de contacto aparecen acá.</div>}
      </div>
    </div>
  )
}
