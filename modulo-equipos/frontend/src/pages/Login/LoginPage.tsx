import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login } from '../../api/auth.api'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [form, setForm] = useState({ login: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated) navigate('/', { replace: true })
  }, [auth.isAuthenticated, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.login.trim() || !form.password.trim()) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const res = await login({ login: form.login, password: form.password })
      const token = res.access_token
      auth.login(token, res.user)
      toast.success(`Bienvenido, ${res.user.nombre}`)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] }; status?: number }; message?: string }
      const raw = axiosErr?.response?.data?.message
      const msg = Array.isArray(raw) ? raw.join(', ') : raw ?? axiosErr?.message ?? 'Error al conectar con el servidor'
      const status = axiosErr?.response?.status
      console.error('[Login error]', status, axiosErr?.response?.data)
      toast.error(`${status ? `[${status}] ` : ''}${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Sidebar */}
      <div className="login-sidebar">
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div
            style={{
              width: 90, height: 90, borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44, margin: '0 auto 24px',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <path d="M12 12v4" />
              <path d="M10 14h4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>Gestión de Equipos</h2>
          <p style={{ fontSize: 15, opacity: 0.7, margin: '0 0 40px' }}>
            Servicio Nacional de Aprendizaje
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
            {([
              { path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text: 'Control de acceso seguro' },
              { path: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', text: 'Registro de equipos y activos' },
              { path: 'M18 20V10M12 20V4M6 20v-6', text: 'Trazabilidad en tiempo real' },
              { path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', text: 'Gestión de visitantes' },
            ] as { path: string; text: string }[]).map((f) => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.85 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.path} />
                </svg>
                <span style={{ fontSize: 14 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="login-form-side">
        <div className="login-form-card">
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
              Iniciar sesión
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Usa las mismas credenciales de Chronogest
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="form-input"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.login}
                onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4,
                  }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-navy w-full"
              disabled={loading}
              style={{ marginTop: 8, padding: '11px 16px', fontSize: 15, justifyContent: 'center' }}
            >
              {loading ? <LoadingSpinner size={18} /> : null}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Módulo de Gestión de Equipos · SENA Chronogest v2.1
          </p>
        </div>
      </div>
    </div>
  )
}
