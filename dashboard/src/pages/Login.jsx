import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import swal from '../lib/swal.js'

export function Login() {
  const [usuario, setUsuario]   = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const msg = sessionStorage.getItem('gb_suspension_alert')
    if (!msg) return
    sessionStorage.removeItem('gb_suspension_alert')
    swal.fire({
      icon: 'warning',
      title: 'Acceso suspendido',
      html: `<p>${msg}</p><p style="margin-top:.5rem;font-size:.75rem;color:#6b7280">Contacta al administrador para restablecer tu acceso.</p>`,
      timer: 10000,
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: 'Entendido',
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(usuario, password)
      localStorage.setItem('gb_token', data.token)
      login({
        usuario: data.usuario, rol: data.rol, persona: data.persona || null,
        cliente_sistema_id: data.cliente_sistema_id || null,
        plan: data.plan || null,
        plan_expira: data.plan_expira || null,
      })

      // Alerta de plan por vencer al iniciar sesión
      if (data.plan_expira && data.plan !== 'lifetime') {
        const hoy = new Date()
        const expira = new Date(data.plan_expira + 'T12:00:00')
        const dias = Math.ceil((expira - hoy) / (1000 * 60 * 60 * 24))
        if (dias <= 7) {
          const urgente = dias <= 2
          await swal.fire({
            icon: urgente ? 'error' : 'warning',
            title: dias <= 0 ? '⛔ Plan vencido' : '⚠️ Plan por vencer',
            html: `<p>Tu plan <strong>${data.plan}</strong> ${
              dias <= 0 ? 'ha vencido'
              : dias === 1 ? 'vence mañana'
              : `vence en <strong>${dias} días</strong>`
            }.</p><p style="margin-top:.5rem;font-size:.75rem;color:#6b7280">Contacta al administrador para renovar.</p>`,
            timer: 9000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Entendido',
          })
        }
      }

      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25 mb-4">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Gespro Asist</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma de Gestión de Bots</p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/40 border-gray-700/50">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-800">
            <Shield size={15} className="text-brand-400" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Acceso seguro</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <input
                className="input"
                type="text"
                placeholder="Ingresa tu usuario"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Gespro Asist · v3.0 Enterprise
        </p>
      </div>
    </div>
  )
}
