import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Formulario de ingreso al admin.
//
// Vivía dentro de `AdminPage.tsx` y salió a su propio archivo para que
// `/admin/simulador` lo pueda mostrar sin importar `AdminPage`: ese módulo
// arrastra TipTap, el generador de PDF y todos los paneles, y el simulador se
// abre desde un celular. Sin cambios respecto de la versión original.
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-dark)' }}>
      <div className="bg-white p-12 w-full max-w-sm" style={{ borderRadius: 2 }}>
        <div className="logo-stripes mb-6"><div className="logo-stripe logo-stripe--sky" /><div className="logo-stripe logo-stripe--green" /><div className="logo-stripe logo-stripe--navy" /></div>
        <h1 className="font-serif font-light mb-1 text-sdm-display-sm" style={{ color: 'var(--navy-dark)' }}>Admin</h1>
        <p className="text-sdm-base" style={{ color: 'var(--muted)', marginBottom: 28 }}>SDM Capital · Panel de gestión</p>
        <form onSubmit={login} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-line" placeholder="admin@sdmcapital.cl" autoComplete="username" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sdm-xs tracking-sdm-wide" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>Contraseña</span>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-line" placeholder="••••••••" autoComplete="current-password" />
          </label>
          {error && <p className="text-sdm-sm" style={{ color: 'var(--error)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary justify-center mt-2">{loading ? 'Ingresando…' : 'Ingresar →'}</button>
        </form>
      </div>
    </div>
  )
}
