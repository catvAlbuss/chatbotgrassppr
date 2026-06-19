import { useEffect, useState } from 'react'
import {
  Building2, Plus, Search, X, Loader2, Check, Bot, Users,
  ChevronLeft, UserPlus, Boxes, Shield, BadgeCheck, Headphones,
  Ban, Power, CreditCard, ChevronRight, Calendar
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth, ROL_LABELS } from '../context/AuthContext.jsx'

// ─── CONSTANTES ──────────────────────────────────────────────
const PLANES = [
  { value: 'demo',     label: 'Demo',     dias: '5 días',    maxBots: 1,   desc: '1 bot de prueba (solo lectura)' },
  { value: 'mensual',  label: 'Mensual',  dias: '30 días',   maxBots: 1,   desc: '1 bot editable, renovación mensual' },
  { value: 'anual',    label: 'Anual',    dias: '365 días',  maxBots: 2,   desc: 'Hasta 2 bots editables, renovación anual' },
  { value: 'lifetime', label: 'Lifetime', dias: 'Sin límite', maxBots: 999, desc: 'Bots ilimitados, sin vencimiento' },
]

const PLAN_COLOR = {
  demo:     'text-gray-400 border-gray-700 bg-gray-800/50',
  mensual:  'text-blue-400 border-blue-500/30 bg-blue-500/10',
  anual:    'text-brand-400 border-brand-500/30 bg-brand-500/10',
  lifetime: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
}

const PLAN_BADGE_COLOR = {
  demo:     'bg-gray-700 text-gray-400',
  mensual:  'bg-blue-500/15 text-blue-400',
  anual:    'bg-brand-500/15 text-brand-400',
  lifetime: 'bg-amber-500/15 text-amber-400',
}

const ROLES_OPCIONES = [
  { value: 'root',              label: 'Root',          desc: 'Acceso total al sistema',              icon: Shield,     nivel: 4 },
  { value: 'administrador',     label: 'Administrador', desc: 'Gestión de ingresos, bots y clientes', icon: BadgeCheck, nivel: 3 },
  { value: 'administrador_bot', label: 'Admin Bots',    desc: 'Soporte, creación y asignación',       icon: Headphones, nivel: 2 },
  { value: 'cliente',           label: 'Cliente',       desc: 'Solo ve y edita sus propios bots',     icon: Bot,        nivel: 1 },
]

const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
]

// ─── HELPERS ─────────────────────────────────────────────────
function getInitials(nombre) {
  return (nombre || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
}
function getGradient(id) {
  return AVATAR_GRADIENTS[(id || 0) % AVATAR_GRADIENTS.length]
}

function RolBadge({ rol }) {
  const r = ROL_LABELS[rol] || ROL_LABELS.cliente
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${r.color}`}>
      {r.label}
    </span>
  )
}

// ─── MODAL CAMBIAR PLAN ───────────────────────────────────────
function ModalCambiarPlan({ bot, onClose, onGuardado }) {
  const [plan, setPlan]     = useState(bot.plan || 'demo')
  const [renovar, setRenovar] = useState(false)
  const [saving, setSaving]   = useState(false)

  async function guardar() {
    setSaving(true)
    try {
      await api.actualizarBot(bot.id, { plan, renovar_plan: renovar })
      onGuardado()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-100">Cambiar plan</h3>
            <p className="mt-0.5 text-xs text-gray-500">{bot.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PLANES.map(p => {
              const sel = plan === p.value
              return (
                <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    sel ? 'border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}>
                  <p className={`text-sm font-semibold ${sel ? 'text-brand-300' : 'text-gray-300'}`}>{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.dias}</p>
                </button>
              )
            })}
          </div>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-gray-800/50 border border-gray-800">
            <input type="checkbox" className="mt-0.5 accent-brand-500" checked={renovar}
              onChange={e => setRenovar(e.target.checked)} />
            <div>
              <p className="text-sm text-gray-200 font-medium">Renovar vigencia</p>
              <p className="text-xs text-gray-500 mt-0.5">Reinicia el contador desde hoy</p>
            </div>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Guardando...' : 'Aplicar plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL CREAR CLIENTE ──────────────────────────────────────
function ModalCrearCliente({ onClose, onCreado }) {
  const [form, setForm] = useState({
    razon_social: '', nombre_comercial: '', tipo_documento: 'RUC', numero_documento: '',
    contacto_nombre: '', contacto_email: '', contacto_telefono: '', notas: '', plan: 'demo'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try { await api.crearClienteSistema(form); onCreado(); onClose() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-100">Nuevo cliente</h2>
            <p className="mt-0.5 text-xs text-gray-500">Empresa o persona que contrata bots y planes</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Razón social *</label>
              <input className="input" required value={form.razon_social} onChange={e => set('razon_social', e.target.value)} />
            </div>
            <div>
              <label className="label">Nombre comercial</label>
              <input className="input" value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)} />
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <div>
                <label className="label">Documento</label>
                <select className="input" value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)}>
                  <option>RUC</option><option>DNI</option><option>CE</option><option>OTRO</option>
                </select>
              </div>
              <div>
                <label className="label">Número *</label>
                <input className="input" required value={form.numero_documento}
                  onChange={e => set('numero_documento', e.target.value.trim())} />
              </div>
            </div>
            <div>
              <label className="label">Persona de contacto</label>
              <input className="input" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" value={form.contacto_email} onChange={e => set('contacto_email', e.target.value)} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.contacto_telefono}
                onChange={e => set('contacto_telefono', e.target.value)} placeholder="51999888777" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input min-h-16 resize-y" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>

          {/* Plan */}
          <div>
            <label className="label">Plan de contratación</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLANES.map(p => {
                const sel = form.plan === p.value
                return (
                  <button key={p.value} type="button" onClick={() => set('plan', p.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sel ? 'border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}>
                    <p className={`text-xs font-bold ${sel ? 'text-brand-300' : 'text-gray-300'}`}>{p.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.dias}</p>
                    <p className="text-xs text-gray-600 mt-1 leading-tight">{p.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL CREAR USUARIO ──────────────────────────────────────
function ModalCrearUsuario({ clienteId, bots, onClose, onCreado }) {
  const { esRoot, nivel } = useAuth()
  const [form, setForm] = useState({
    usuario: '', password: '', rol: 'cliente', dni: '', bot_ids: [],
    cliente_sistema_id: String(clienteId)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const rolesDisponibles = ROLES_OPCIONES.filter(r => r.nivel < nivel || esRoot)
  const botsDelCliente   = bots.filter(b => String(b.cliente_sistema_id || '') === String(clienteId))

  function toggleBot(id) {
    setForm(f => ({
      ...f,
      bot_ids: f.bot_ids.includes(id) ? f.bot_ids.filter(b => b !== id) : [...f.bot_ids, id]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await api.crearUsuario(form); onCreado(); onClose() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
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
              <input className="input" placeholder="nombre_usuario" required value={form.usuario}
                onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" placeholder="mín. 8 caracteres" required minLength={8}
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">DNI <span className="text-gray-600 font-normal">(opcional)</span></label>
            <input className="input" placeholder="12345678" maxLength={8} value={form.dni}
              onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div>
            <label className="label">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {rolesDisponibles.map(r => {
                const Icon = r.icon; const sel = form.rol === r.value
                return (
                  <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, rol: r.value }))}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                      sel ? 'border-brand-500/50 bg-brand-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                    }`}>
                    <Icon size={15} className={`mt-0.5 ${sel ? 'text-brand-400' : 'text-gray-500'}`} />
                    <div>
                      <p className={`text-xs font-semibold ${sel ? 'text-brand-300' : 'text-gray-300'}`}>{r.label}</p>
                      <p className="text-xs text-gray-500 leading-tight">{r.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {botsDelCliente.length > 0 && (
            <div>
              <label className="label">Asignar bots</label>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {botsDelCliente.map(b => (
                  <label key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800 cursor-pointer">
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
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
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

// ─── FASE 2: DETALLE DEL CLIENTE ──────────────────────────────
function DetalleCliente({ cliente, usuarios, bots, onBack, onActualizar }) {
  const [tab, setTab]             = useState('usuarios')
  const [toggling, setToggling]   = useState(false)
  const [modalUsuario, setModalUsuario]   = useState(false)
  const [modalPlan, setModalPlan]         = useState(null)   // bot object
  const [formDatos, setFormDatos] = useState({ ...cliente })
  const [savingDatos, setSavingDatos] = useState(false)
  const [errorDatos, setErrorDatos]   = useState('')

  useEffect(() => { setFormDatos({ ...cliente }) }, [cliente])

  const usuariosCliente = usuarios.filter(u => String(u.cliente_sistema_id) === String(cliente.id))
  const botsCliente     = bots.filter(b => String(b.cliente_sistema_id) === String(cliente.id))
  const esSuspendido    = cliente.estado === 'suspendido'
  const gradient        = getGradient(cliente.id)
  const nombreDisplay   = cliente.nombre_comercial || cliente.razon_social

  async function toggleEstado() {
    setToggling(true)
    try {
      await api.actualizarClienteSistema(cliente.id, { estado: esSuspendido ? 'activo' : 'suspendido' })
      onActualizar()
    } catch (err) { alert(err.message) }
    finally { setToggling(false) }
  }

  async function toggleUsuario(u) {
    try {
      await api.actualizarUsuario(u.id, { activo: u.activo ? 0 : 1 })
      onActualizar()
    } catch (err) { alert(err.message) }
  }

  async function guardarDatos(e) {
    e.preventDefault()
    setSavingDatos(true); setErrorDatos('')
    try { await api.actualizarClienteSistema(cliente.id, formDatos); onActualizar() }
    catch (err) { setErrorDatos(err.message) }
    finally { setSavingDatos(false) }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors">
        <ChevronLeft size={15} /> Clientes y Accesos
      </button>

      {/* ── Header card ── */}
      <div className={`rounded-2xl border p-6 ${esSuspendido ? 'border-red-500/20 bg-red-500/5' : 'border-gray-800 bg-gray-900/60'}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          {/* Avatar + info */}
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-lg font-bold shadow-lg ${gradient}`}>
              {getInitials(nombreDisplay)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-100 leading-tight">{nombreDisplay}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  esSuspendido ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                }`}>
                  {esSuspendido ? '⛔ Suspendido' : '✓ Activo'}
                </span>
              </div>
              {cliente.nombre_comercial && (
                <p className="mt-0.5 text-sm text-gray-500">{cliente.razon_social}</p>
              )}
              <p className="mt-1 text-xs font-mono text-gray-600">{cliente.tipo_documento} {cliente.numero_documento}</p>
              {(cliente.contacto_nombre || cliente.contacto_email || cliente.contacto_telefono) && (
                <p className="mt-1 text-xs text-gray-500">
                  {[cliente.contacto_nombre, cliente.contacto_email, cliente.contacto_telefono].filter(Boolean).join(' · ')}
                </p>
              )}
              {cliente.notas && (
                <p className="mt-2 text-xs text-gray-600 italic max-w-sm">{cliente.notas}</p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 sm:flex-shrink-0">
            <button onClick={() => setTab('datos')}
              className="btn-secondary flex items-center gap-2 text-sm px-4">
              Editar datos
            </button>
            <button onClick={toggleEstado} disabled={toggling}
              className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2 font-medium border transition-colors ${
                esSuspendido
                  ? 'border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20'
                  : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}>
              {toggling
                ? <Loader2 size={14} className="animate-spin" />
                : esSuspendido ? <Power size={14} /> : <Ban size={14} />}
              {esSuspendido ? 'Activar cuenta' : 'Suspender'}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-5 flex flex-wrap gap-5 border-t border-gray-800/60 pt-4 items-center">
          {/* Plan badge */}
          {cliente.plan && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${PLAN_BADGE_COLOR[cliente.plan] || PLAN_BADGE_COLOR.demo}`}>
              <CreditCard size={11} />
              {PLANES.find(p => p.value === cliente.plan)?.label || cliente.plan}
              {cliente.plan_expira && cliente.plan !== 'lifetime' && (
                <span className="opacity-60">· vence {cliente.plan_expira}</span>
              )}
            </span>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Boxes size={15} className="text-brand-400" />
            <span className="font-semibold text-gray-200">{botsCliente.length}</span>
            <span className="text-gray-500">/ {PLANES.find(p => p.value === cliente.plan)?.maxBots ?? '?'} bots</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={15} className="text-blue-400" />
            <span className="font-semibold text-gray-200">{usuariosCliente.length}</span>
            <span className="text-gray-500">usuarios</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={15} className="text-green-400" />
            <span className="font-semibold text-gray-200">{usuariosCliente.filter(u => u.activo).length}</span>
            <span className="text-gray-500">activos</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-gray-800">
        {[
          ['usuarios', `Usuarios (${usuariosCliente.length})`],
          ['bots',     `Bots (${botsCliente.length})`],
          ['datos',    'Datos'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Usuarios ── */}
      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {usuariosCliente.length === 0
                ? 'Sin usuarios vinculados'
                : `${usuariosCliente.filter(u => u.activo).length} de ${usuariosCliente.length} activos`}
            </p>
            <button onClick={() => setModalUsuario(true)} className="btn-primary flex items-center gap-2 text-sm">
              <UserPlus size={15} /> Nuevo usuario
            </button>
          </div>

          {usuariosCliente.length === 0 ? (
            <div className="card py-16 text-center text-sm text-gray-600">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Sin usuarios</p>
              <p className="mt-1 text-xs">Agrega el primer usuario para este cliente</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                    <th className="px-5 py-3 font-medium">Usuario</th>
                    <th className="px-3 py-3 font-medium">Rol</th>
                    <th className="px-3 py-3 font-medium">Bots</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Último acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosCliente.map(u => (
                    <tr key={u.id} className="table-row">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-200">{u.usuario}</p>
                        {u.nombres && <p className="text-xs text-gray-500">{u.nombres} {u.apellidos || ''}</p>}
                        {u.dni && <p className="text-xs font-mono text-gray-600">{u.dni}</p>}
                      </td>
                      <td className="px-3 py-3"><RolBadge rol={u.rol} /></td>
                      <td className="px-3 py-3">
                        {u.bots?.length > 0
                          ? <span className="inline-flex items-center gap-1 text-xs text-brand-400"><Boxes size={12} /> {u.bots.length}</span>
                          : <span className="text-xs text-gray-600">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleUsuario(u)}
                          title={u.activo ? 'Clic para desactivar' : 'Clic para activar'}
                          className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all hover:opacity-75 border ${
                            u.activo
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-gray-800 text-gray-500 border-gray-700'
                          }`}>
                          {u.activo ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {u.ultimo_login
                          ? new Date(u.ultimo_login).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : <span className="text-gray-700">Nunca</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Bots ── */}
      {tab === 'bots' && (
        <div>
          {botsCliente.length === 0 ? (
            <div className="card py-16 text-center text-sm text-gray-600">
              <Boxes size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Sin bots</p>
              <p className="mt-1 text-xs">Asigna bots a este cliente desde la sección Bots</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                    <th className="px-5 py-3 font-medium">Bot</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Vencimiento</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {botsCliente.map(b => (
                    <tr key={b.id} className="table-row">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-200">{b.nombre}</p>
                        <p className="text-xs font-mono text-gray-600 capitalize">{b.tipo}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${PLAN_COLOR[b.plan] || PLAN_COLOR.demo}`}>
                          <CreditCard size={11} /> {b.plan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          {b.plan === 'lifetime'
                            ? <span className="text-amber-400">Sin vencimiento</span>
                            : b.plan_expira
                              ? <><Calendar size={11} className="text-gray-600" />{b.plan_expira}</>
                              : <span className="text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${
                          b.activo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}>
                          {b.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setModalPlan(b)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-400 transition-colors px-2.5 py-1 rounded-lg border border-gray-800 hover:border-brand-500/30 hover:bg-brand-500/5">
                          <CreditCard size={11} /> Cambiar plan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Datos ── */}
      {tab === 'datos' && (
        <div className="card max-w-2xl">
          <form onSubmit={guardarDatos} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Razón social *</label>
                <input className="input" required value={formDatos.razon_social || ''}
                  onChange={e => setFormDatos(f => ({ ...f, razon_social: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nombre comercial</label>
                <input className="input" value={formDatos.nombre_comercial || ''}
                  onChange={e => setFormDatos(f => ({ ...f, nombre_comercial: e.target.value }))} />
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div>
                  <label className="label">Documento</label>
                  <select className="input" value={formDatos.tipo_documento || 'RUC'}
                    onChange={e => setFormDatos(f => ({ ...f, tipo_documento: e.target.value }))}>
                    <option>RUC</option><option>DNI</option><option>CE</option><option>OTRO</option>
                  </select>
                </div>
                <div>
                  <label className="label">Número *</label>
                  <input className="input" required value={formDatos.numero_documento || ''}
                    onChange={e => setFormDatos(f => ({ ...f, numero_documento: e.target.value.trim() }))} />
                </div>
              </div>
              <div>
                <label className="label">Persona de contacto</label>
                <input className="input" value={formDatos.contacto_nombre || ''}
                  onChange={e => setFormDatos(f => ({ ...f, contacto_nombre: e.target.value }))} />
              </div>
              <div>
                <label className="label">Correo</label>
                <input className="input" type="email" value={formDatos.contacto_email || ''}
                  onChange={e => setFormDatos(f => ({ ...f, contacto_email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={formDatos.contacto_telefono || ''}
                  onChange={e => setFormDatos(f => ({ ...f, contacto_telefono: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea className="input min-h-16 resize-y" value={formDatos.notas || ''}
                onChange={e => setFormDatos(f => ({ ...f, notas: e.target.value }))} />
            </div>

            {/* Cambiar plan */}
            <div>
              <label className="label">Plan de contratación</label>
              <div className="grid grid-cols-2 gap-2">
                {PLANES.map(p => {
                  const sel = (formDatos.plan || 'demo') === p.value
                  return (
                    <button key={p.value} type="button"
                      onClick={() => setFormDatos(f => ({ ...f, plan: p.value }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sel ? 'border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}>
                      <p className={`text-sm font-bold ${sel ? 'text-brand-300' : 'text-gray-300'}`}>{p.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.dias} · máx {p.maxBots === 999 ? '∞' : p.maxBots} bot{p.maxBots !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-600 mt-1 leading-tight">{p.desc}</p>
                    </button>
                  )
                })}
              </div>
              {formDatos.plan && formDatos.plan !== cliente.plan && (
                <p className="mt-2 text-xs text-amber-400/80">
                  ⚠️ Al guardar se recalcularán las fechas de vigencia desde hoy.
                </p>
              )}
            </div>
            {errorDatos && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{errorDatos}</p>
            )}
            <div className="flex justify-end">
              <button disabled={savingDatos} className="btn-primary flex items-center gap-2">
                {savingDatos ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {savingDatos ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalUsuario && (
        <ModalCrearUsuario clienteId={cliente.id} bots={bots}
          onClose={() => setModalUsuario(false)} onCreado={onActualizar} />
      )}
      {modalPlan && (
        <ModalCambiarPlan bot={modalPlan}
          onClose={() => setModalPlan(null)} onGuardado={onActualizar} />
      )}
    </div>
  )
}

// ─── FASE 1: LISTA DE CLIENTES ────────────────────────────────
export function ClientesSistema() {
  const [clientes, setClientes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [bots, setBots]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modalCrear, setModalCrear]     = useState(false)
  const [clienteActivo, setClienteActivo] = useState(null)

  function cargar() {
    setLoading(true)
    Promise.all([api.clientesSistema(), api.usuarios(), api.bots()])
      .then(([c, u, b]) => { setClientes(c); setUsuarios(u); setBots(b) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  const clienteDetalle = clienteActivo ? clientes.find(c => c.id === clienteActivo) : null

  if (clienteDetalle) {
    return (
      <DetalleCliente
        cliente={clienteDetalle} usuarios={usuarios} bots={bots}
        onBack={() => setClienteActivo(null)} onActualizar={cargar}
      />
    )
  }

  const list = clientes.filter(c =>
    `${c.razon_social} ${c.nombre_comercial || ''} ${c.numero_documento}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const totalActivos = clientes.filter(c => c.estado === 'activo').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Clientes y Accesos</h1>
          <p className="mt-0.5 text-sm text-gray-500">Empresas contratantes, usuarios y bots asignados</p>
        </div>
        <button onClick={() => setModalCrear(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Clientes',          value: clientes.length,                                   icon: Building2, color: 'text-gray-400'  },
          { label: 'Activos',           value: totalActivos,                                       icon: Building2, color: 'text-brand-400' },
          { label: 'Bots asignados',    value: bots.filter(b => b.cliente_sistema_id).length,      icon: Boxes,     color: 'text-brand-400' },
          { label: 'Usuarios clientes', value: usuarios.filter(u => u.cliente_sistema_id).length,  icon: Users,     color: 'text-blue-400'  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card py-4 px-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
          <Search size={15} className="text-gray-500 flex-shrink-0" />
          <input className="flex-1 bg-transparent text-sm text-gray-300 outline-none placeholder:text-gray-600"
            placeholder="Buscar por empresa o documento..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-600">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Sin clientes</p>
            <p className="mt-1 text-xs">Crea el primer cliente con el botón superior</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {list.map(c => {
              const esSuspendido = c.estado === 'suspendido'
              return (
                <div key={c.id}
                  onClick={() => setClienteActivo(c.id)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-gray-800/50 ${esSuspendido ? 'opacity-60' : ''}`}>

                  {/* Avatar */}
                  <div className={`hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold bg-gradient-to-br ${getGradient(c.id)}`}>
                    {getInitials(c.nombre_comercial || c.razon_social)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-200 truncate">{c.nombre_comercial || c.razon_social}</p>
                      {esSuspendido && (
                        <span className="flex-shrink-0 text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-full px-2 py-0.5">Suspendido</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.tipo_documento} {c.numero_documento}</p>
                  </div>

                  {/* Contacto */}
                  <div className="hidden md:block text-xs text-gray-500 flex-shrink-0 text-right">
                    <p>{c.contacto_nombre || '—'}</p>
                    <p className="text-gray-600">{c.contacto_email || ''}</p>
                  </div>

                  {/* Entorno */}
                  <div className="flex gap-3 text-xs flex-shrink-0">
                    <span className="flex items-center gap-1 text-brand-400"><Boxes size={12} /> {c.total_bots}</span>
                    <span className="flex items-center gap-1 text-blue-400"><Users size={12} /> {c.total_usuarios}</span>
                  </div>

                  <ChevronRight size={15} className="text-gray-700 flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalCrear && <ModalCrearCliente onClose={() => setModalCrear(false)} onCreado={cargar} />}
    </div>
  )
}
