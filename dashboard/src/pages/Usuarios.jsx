import { useEffect, useState } from 'react'
import {
  UserPlus, Users, Search, Shield, BadgeCheck,
  Headphones, Bot, Loader2, X, Check, Edit2, Eye,
  ChevronDown, Boxes
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth, ROL_LABELS } from '../context/AuthContext.jsx'

const ROLES_OPCIONES = [
  { value: 'root',              label: 'Root',          desc: 'Acceso total al sistema',                  icon: Shield,      nivel: 4 },
  { value: 'administrador',     label: 'Administrador', desc: 'Gestión de ingresos, bots y clientes',     icon: BadgeCheck,  nivel: 3 },
  { value: 'administrador_bot', label: 'Admin Bots',    desc: 'Soporte, creación y asignación de bots',   icon: Headphones,  nivel: 2 },
  { value: 'cliente',           label: 'Cliente',       desc: 'Solo ve y edita sus propios bots',         icon: Bot,         nivel: 1 },
]

function RolBadge({ rol }) {
  const r = ROL_LABELS[rol] || ROL_LABELS.cliente
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${r.color}`}>
      {r.label}
    </span>
  )
}

function ModalCrear({ bots, onClose, onCreado }) {
  const { esRoot, nivel } = useAuth()
  const [form, setForm]     = useState({ usuario: '', password: '', rol: 'cliente', dni: '', bot_ids: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Solo puede crear roles hasta su propio nivel
  const rolesDisponibles = ROLES_OPCIONES.filter(r => r.nivel < nivel || esRoot)

  function toggleBot(id) {
    setForm(f => ({
      ...f,
      bot_ids: f.bot_ids.includes(id) ? f.bot_ids.filter(b => b !== id) : [...f.bot_ids, id]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.crearUsuario(form)
      onCreado()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-gray-100 flex items-center gap-2">
            <UserPlus size={18} className="text-brand-400" /> Nuevo usuario
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usuario</label>
              <input className="input" placeholder="nombre_usuario" value={form.usuario}
                onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" placeholder="mín. 8 caracteres" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
          </div>

          <div>
            <label className="label">DNI (opcional)</label>
            <input className="input" placeholder="12345678" maxLength={8} value={form.dni}
              onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))} />
          </div>

          <div>
            <label className="label">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {rolesDisponibles.map(r => {
                const Icon = r.icon
                const sel = form.rol === r.value
                return (
                  <button key={r.value} type="button"
                    onClick={() => setForm(f => ({ ...f, rol: r.value }))}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                      sel ? 'border-brand-500/50 bg-brand-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                    }`}
                  >
                    <Icon size={15} className={sel ? 'text-brand-400 mt-0.5' : 'text-gray-500 mt-0.5'} />
                    <div>
                      <p className={`text-xs font-semibold ${sel ? 'text-brand-300' : 'text-gray-300'}`}>{r.label}</p>
                      <p className="text-xs text-gray-500 leading-tight">{r.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Asignar bots — visible si el rol es cliente */}
          {form.rol === 'cliente' && bots.length > 0 && (
            <div>
              <label className="label">Asignar bots</label>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {bots.map(b => (
                  <label key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-750 cursor-pointer">
                    <input type="checkbox" checked={form.bot_ids.includes(b.id)}
                      onChange={() => toggleBot(b.id)} className="accent-brand-500" />
                    <Boxes size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-300">{b.nombre}</span>
                    <span className="ml-auto text-xs text-gray-600">{b.plan}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Usuarios() {
  const { esAdmin, esRoot } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [bots, setBots]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [buscar, setBuscar]     = useState('')
  const [modal, setModal]       = useState(false)

  function cargar() {
    setLoading(true)
    Promise.all([api.usuarios(), api.bots()])
      .then(([u, b]) => { setUsuarios(u); setBots(b) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const filtrados = usuarios.filter(u =>
    !buscar ||
    u.usuario.toLowerCase().includes(buscar.toLowerCase()) ||
    u.nombres?.toLowerCase().includes(buscar.toLowerCase()) ||
    u.dni?.includes(buscar)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de accesos y roles del sistema</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Resumen por rol */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES_OPCIONES.map(r => {
          const Icon = r.icon
          const count = usuarios.filter(u => u.rol === r.value || (r.value === 'root' && (u.rol === 'admin'))).length
          return (
            <div key={r.value} className="card py-4 px-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{r.label}</p>
                <p className="text-xl font-bold text-gray-100">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {/* Buscador */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <Search size={15} className="text-gray-500 flex-shrink-0" />
          <input
            className="bg-transparent text-sm text-gray-300 placeholder-gray-600 flex-1 outline-none"
            placeholder="Buscar por usuario, nombre o DNI…"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-600 text-sm flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-gray-600 text-sm">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-3 py-3 font-medium">Nombre</th>
                  <th className="px-3 py-3 font-medium">Rol</th>
                  <th className="px-3 py-3 font-medium">Bots</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Último acceso</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-200">{u.usuario}</p>
                      {u.dni && <p className="text-xs text-gray-500 font-mono">{u.dni}</p>}
                    </td>
                    <td className="px-3 py-3 text-gray-400">
                      {u.nombres ? `${u.nombres} ${u.apellidos || ''}` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <RolBadge rol={u.rol} />
                    </td>
                    <td className="px-3 py-3">
                      {u.bots?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-brand-400">
                          <Boxes size={12} /> {u.bots.length}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${
                        u.activo ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {u.ultimo_login
                        ? new Date(u.ultimo_login).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ModalCrear
          bots={bots}
          onClose={() => setModal(false)}
          onCreado={cargar}
        />
      )}
    </div>
  )
}
