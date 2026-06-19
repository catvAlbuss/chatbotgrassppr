import { useEffect, useState } from 'react'
import { Plus, Bot, Edit2, Trash2, Power, Loader2, X, CheckCircle, Wifi, WifiOff, Clock, PhoneCall, MessageSquare, Link2, Settings, CalendarCheck } from 'lucide-react'
import { api } from '../lib/api.js'
import { ConectarWhatsApp } from './ConectarWhatsApp.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

const TIPOS = {
  grass:      { emoji: '🌿', label: 'Grass Sintético',  color: 'brand',  desc: 'Reservas de canchas por hora, cobro Yape/Plin' },
  comercio:   { emoji: '🛍️', label: 'Comercio / Tienda', color: 'blue',  desc: 'Catálogo, pedidos y pagos por WhatsApp' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',       color: 'amber', desc: 'Reservas de mesa, delivery y pedidos' },
}

const COLOR = {
  brand: { badge: 'bg-brand-500/10 text-brand-400 border-brand-500/20', ring: 'ring-brand-500/20' },
  blue:  { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    ring: 'ring-blue-500/20'  },
  amber: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', ring: 'ring-amber-500/20' },
}

function EstadoConexionBadge({ bot }) {
  if (bot.estado_conexion === 'activo' && bot.numero_display) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 font-medium">
        <Wifi size={11} /> {bot.numero_display}
      </span>
    )
  }
  if (bot.estado_conexion === 'pendiente') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
        <Clock size={11} /> Pendiente de activación
      </span>
    )
  }
  if (bot.estado_conexion === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
        <WifiOff size={11} /> Error de conexión
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-500 font-medium">
      <WifiOff size={11} /> Sin número
    </span>
  )
}

export function MisBots() {
  const { esAdminBot, esAdmin, esCliente, esDemo, plan } = useAuth()
  const [bots, setBots]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [confirm, setConfirm]   = useState(null)
  const [conectar, setConectar] = useState(null)
  const [asignar, setAsignar]   = useState(null)

  function cargar() {
    setLoading(true)
    api.bots().then(setBots).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  async function toggleActivo(bot) {
    // administrador+ usa el endpoint protegido; adminBot usa el clásico
    if (esAdmin) {
      await api.toggleActivo(bot.id)
    } else {
      await api.actualizarBot(bot.id, { activo: bot.activo ? 0 : 1 })
    }
    cargar()
  }

  async function eliminar(id) {
    await api.eliminarBot(id)
    setConfirm(null)
    cargar()
  }

  // Si el wizard de conexión fue exitoso, recargar lista
  function onConectado() {
    setConectar(null)
    cargar()
  }

  return (
    <div className="space-y-6">
      {/* Banner plan demo */}
      {esDemo && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          <span className="text-base leading-none mt-0.5">🧪</span>
          <p>Estás en el <strong>plan Demo</strong>. Puedes ver tu bot de prueba pero no editar su configuración. Contacta al administrador para activar un plan completo.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{esCliente ? 'Mis Bots' : 'Gestión de Bots'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {esCliente ? 'Visualiza y configura tus bots activos' : 'Administra, crea y asigna bots a clientes'}
          </p>
        </div>
        {esAdminBot && (
          <button onClick={() => setModal('crear')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Crear bot
          </button>
        )}
      </div>


      {/* Tipos disponibles — solo para admin que puede crear bots */}
      {esAdminBot && (
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(TIPOS).map(([tipo, info]) => (
            <div key={tipo} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">{info.emoji}</span>
              <div>
                <p className="font-medium text-gray-200 text-sm">{info.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{info.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de bots */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" /> Cargando bots...
        </div>
      ) : bots.length === 0 ? (
        <div className="card py-12 text-center">
          <Bot size={40} className="mx-auto text-gray-700 mb-3" />
          {esCliente ? (
            <>
              <p className="text-gray-400 font-medium">No tienes bots asignados aún</p>
              <p className="text-gray-600 text-sm mt-1">El administrador asignará tu bot cuando active tu cuenta.</p>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium">Aún no hay bots creados</p>
              <p className="text-gray-600 text-sm mt-1 mb-4">Crea el primer bot para comenzar</p>
              <button onClick={() => setModal('crear')} className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Crear primer bot
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {bots.map(bot => {
            const tipo = TIPOS[bot.tipo] || TIPOS.grass
            const c    = COLOR[tipo.color]
            const yaConectado = bot.estado_conexion === 'activo'

            // ── Tarjeta de bot en plan Demo ──────────────────────────────
            if (esDemo) {
              return (
                <div key={bot.id} className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gray-900">
                  {/* Franja demo */}
                  <div className="flex items-center gap-2 bg-amber-500/8 border-b border-amber-500/15 px-5 py-2.5">
                    <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">🧪 Bot de demostración</span>
                    <span className="ml-auto text-xs text-amber-400/60">Solo vista previa</span>
                  </div>

                  <div className="p-5 flex flex-col sm:flex-row gap-5">
                    {/* Avatar bot */}
                    <div className={`w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center text-3xl border ${c.badge} opacity-70`}>
                      {tipo.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-100">{bot.nombre}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${c.badge}`}>{tipo.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {bot.admin_phone ? `Número admin: ${bot.admin_phone}` : 'Sin número configurado aún'}
                        </p>
                      </div>

                      {/* Funciones bloqueadas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          { label: 'Editar configuración del bot',   bloqueado: true  },
                          { label: 'Ver reservas y pagos',           bloqueado: true  },
                          { label: 'Conectar número de WhatsApp',    bloqueado: true  },
                          { label: 'Acceso al panel del bot',        bloqueado: false },
                        ].map(f => (
                          <div key={f.label} className="flex items-center gap-2 text-xs">
                            {f.bloqueado
                              ? <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-gray-500">✕</span>
                              : <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">✓</span>
                            }
                            <span className={f.bloqueado ? 'text-gray-600 line-through' : 'text-gray-400'}>{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA demo */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3 sm:pl-4 sm:border-l sm:border-gray-800 text-center min-w-[130px]">
                      <Link
                        to={`/admin/bots/${bot.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold transition-colors w-full justify-center"
                      >
                        Ver resumen
                      </Link>
                      <Link
                        to="/admin/planes"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors w-full justify-center"
                      >
                        Activar plan
                      </Link>
                    </div>
                  </div>
                </div>
              )
            }

            // ── Tarjeta normal (mensual / anual / lifetime) ───────────────
            const puedeConectarPropio = esCliente && (plan === 'anual' || plan === 'lifetime')
            return (
              <div key={bot.id} className={`card ring-1 ${c.ring} ${!bot.activo ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${c.badge}`}>
                      {tipo.emoji}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-100">{bot.nombre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${c.badge}`}>{tipo.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bot.activo ? 'bg-brand-500/15 text-brand-400' : 'bg-gray-700 text-gray-500'}`}>
                          {bot.activo ? '● Activo' : '● Inactivo'}
                        </span>
                      </div>

                      <EstadoConexionBadge bot={bot} />

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        {esAdminBot && <span>Cliente: <span className={bot.cliente_sistema ? 'text-blue-400' : 'text-amber-400'}>{bot.cliente_nombre_comercial || bot.cliente_sistema || 'Sin asignar'}</span></span>}
                        {bot.admin_phone && <span>Admin: <span className="font-mono text-gray-400">{bot.admin_phone}</span></span>}
                        {bot.tipo_conexion === 'gestionado' && <span className="text-gray-600">Número gestionado por plataforma</span>}
                        {bot.tipo_conexion === 'propio'     && <span className="text-gray-600">Número propio conectado</span>}
                      </div>

                      {/* CTA: conectar número propio si es anual/lifetime */}
                      {puedeConectarPropio && !yaConectado && (
                        <button
                          onClick={() => setConectar(bot)}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors font-medium"
                        >
                          <PhoneCall size={12} /> Conectar mi número de WhatsApp
                        </button>
                      )}

                      {/* CTA adminBot+: asignar número */}
                      {!yaConectado && esAdminBot && (
                        <button
                          onClick={() => setAsignar(bot)}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 text-gray-400 border border-gray-600 hover:bg-gray-700 hover:text-gray-200 transition-colors font-medium"
                        >
                          <Link2 size={12} /> Asignar número gestionado
                        </button>
                      )}

                      {/* Espera activación mensual */}
                      {esCliente && plan === 'mensual' && bot.estado_conexion === 'pendiente' && (
                        <p className="text-xs text-amber-400 mt-1">
                          ⏳ Tu número será asignado en las próximas 24 h. Te avisaremos por WhatsApp.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {/* Sistema del bot (reservas, pagos, stats) */}
                    <Link
                      to={`/admin/bots/${bot.id}`}
                      className="p-2 rounded-lg text-gray-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                      title="Sistema del bot (reservas y pagos)"
                    >
                      <CalendarCheck size={16} />
                    </Link>
                    {/* Configuración completa */}
                    <Link to={`/admin/mi-config?bot=${encodeURIComponent(bot.id)}`} className="p-2 rounded-lg text-gray-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors" title="Configuración completa del bot">
                      <Settings size={16} />
                    </Link>
                    {yaConectado && bot.numero_display && (
                      <a
                        href={`https://wa.me/${bot.numero_display.replace(/\D/g, '')}?text=Hola`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                        title="Probar bot en WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </a>
                    )}
                    <button onClick={() => setModal(bot)} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors" title="Editar configuración">
                      <Edit2 size={16} />
                    </button>
                    {esAdmin && (
                      <button onClick={() => toggleActivo(bot)} className={`p-2 rounded-lg transition-colors ${bot.activo ? 'text-brand-400 hover:bg-brand-500/10' : 'text-gray-500 hover:bg-gray-800'}`} title={bot.activo ? 'Desactivar bot' : 'Activar bot'}>
                        <Power size={16} />
                      </button>
                    )}
                    {esAdminBot && (
                      <button onClick={() => setConfirm(bot.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar bot">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modal && (
        <BotModal
          bot={typeof modal === 'object' ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}

      {/* Wizard conexión WhatsApp (anual/lifetime) */}
      {conectar && (
        <ConectarWhatsApp
          bot={conectar}
          onClose={() => setConectar(null)}
          onConectado={onConectado}
        />
      )}

      {/* Modal asignar número (admin) */}
      {asignar && (
        <AsignarNumeroModal
          bot={asignar}
          onClose={() => setAsignar(null)}
          onAsignado={() => { setAsignar(null); cargar() }}
        />
      )}

      {/* Confirmar eliminar */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-100 mb-2">¿Eliminar bot?</h3>
            <p className="text-gray-400 text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => eliminar(confirm)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MODAL ASIGNAR NÚMERO (ADMIN) ───────────────────────────
function AsignarNumeroModal({ bot, onClose, onAsignado }) {
  const [form, setForm]     = useState({ phone_number_id: bot.phone_number_id || '', waba_token: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  async function verificar(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload = { phone_number_id: form.phone_number_id.trim() }
      if (form.waba_token.trim()) payload.waba_token = form.waba_token.trim()
      const data = await api.verificarConexion(bot.id, payload)
      setResult(data)
      setTimeout(onAsignado, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-100 text-lg">Asignar número — {bot.nombre}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1"><X size={20} /></button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <CheckCircle size={44} className="text-brand-400 mx-auto mb-3" />
            <p className="text-gray-100 font-semibold text-lg">{result.nombre}</p>
            <p className="text-brand-400 font-mono text-xl mt-1">{result.numero}</p>
            <p className="text-gray-500 text-xs mt-2">Conexión activa · Redirigiendo...</p>
          </div>
        ) : (
          <form onSubmit={verificar} className="space-y-4">
            <div>
              <label className="label">Phone Number ID *</label>
              <input
                className="input font-mono"
                required
                placeholder="1221845541002402"
                value={form.phone_number_id}
                onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
              />
              <p className="text-xs text-gray-600 mt-1">Meta for Developers → WhatsApp → API Setup</p>
            </div>
            <div>
              <label className="label">Token WABA <span className="text-gray-600 font-normal">(opcional)</span></label>
              <input
                className="input font-mono text-xs"
                placeholder="Dejar vacío para usar el token configurado en el servidor"
                value={form.waba_token}
                onChange={e => setForm(f => ({ ...f, waba_token: e.target.value }))}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                {loading ? 'Verificando...' : 'Verificar y asignar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── MODAL CREAR / EDITAR BOT ────────────────────────────────
function BotModal({ bot, onClose, onSaved }) {
  const { esAdminBot, esCliente, plan: planCliente } = useAuth()
  const isNew = !bot
  const [paso, setPaso]   = useState(1)   // 1=tipo, 2=negocio
  const [form, setForm]   = useState({
    cliente_sistema_id: bot?.cliente_sistema_id || '',
    nombre:      bot?.nombre      || '',
    tipo:        bot?.tipo        || 'grass',
    admin_phone: bot?.admin_phone || '',
    plan:        bot?.plan        || 'demo',
    renovar_plan: false,
    config: bot?.config || {}
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [clientesSistema, setClientesSistema] = useState([])

  useEffect(() => {
    if (esAdminBot) api.clientesSistema().then(setClientesSistema).catch(console.error)
  }, [esAdminBot])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setCfg(k, v) { setForm(f => ({ ...f, config: { ...f.config, [k]: v } })) }

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await api.crearBot(form)
      } else {
        await api.actualizarBot(bot.id, form)
      }
      setSaved(true)
      setTimeout(onSaved, 700)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalPasos = isNew ? 2 : 1

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-100 text-lg">
            {isNew ? 'Crear nuevo bot' : `Editar: ${bot.nombre}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1"><X size={20} /></button>
        </div>

        {/* Progress (solo al crear) */}
        {isNew && (
          <div className="flex items-center gap-2 mb-6 mt-3">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  paso > n ? 'bg-brand-500 text-white' : paso === n ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500' : 'bg-gray-800 text-gray-600'
                }`}>
                  {paso > n ? <CheckCircle size={14} /> : n}
                </div>
                {n < 2 && <div className={`h-0.5 flex-1 rounded transition-colors ${paso > n ? 'bg-brand-500' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={guardar} className="space-y-4">

          {/* ── Paso 1: Tipo de negocio (solo al crear) ── */}
          {(isNew && paso === 1) && (
            <>
              <p className="text-gray-400 text-sm">¿Qué tipo de negocio tienes?</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TIPOS).map(([tipo, info]) => (
                  <button
                    key={tipo} type="button"
                    onClick={() => set('tipo', tipo)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border text-sm transition-all ${
                      form.tipo === tipo
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{info.emoji}</span>
                    <span className="text-xs font-medium leading-tight text-center">{info.label}</span>
                    <span className="text-xs text-gray-500 leading-tight text-center hidden sm:block">{info.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => setPaso(2)} className="btn-primary">Siguiente →</button>
              </div>
            </>
          )}

          {/* ── Paso 2 / Editar: Datos del negocio ── */}
          {(!isNew || paso === 2) && (
            <>
              {esAdminBot && (
                <div>
                  <label className="label">Cliente del sistema</label>
                  <select className="input" value={form.cliente_sistema_id} onChange={e => set('cliente_sistema_id', e.target.value)}>
                    <option value="">Sin asignar</option>
                    {clientesSistema.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nombre_comercial || cliente.razon_social}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Define a qué entorno pertenece este bot.</p>
                </div>
              )}
              <div>
                <label className="label">Nombre de tu negocio *</label>
                <input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Grass Los Pinos" />
              </div>

              <div>
                <label className="label">Tu WhatsApp (para recibir alertas de pagos){isNew && ' *'}</label>
                <input className="input" required={isNew} value={form.admin_phone} onChange={e => set('admin_phone', e.target.value)} placeholder="51999888777" />
                <p className="text-xs text-gray-600 mt-1">Formato: código de país + número sin espacios (ej: 51999888777)</p>
              </div>

              {/* Config básica según tipo */}
              {(form.tipo === 'grass' || !isNew) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Precio por hora (S/.)</label>
                      <input className="input" type="number" min="1" value={form.config?.precio_hora || 50} onChange={e => setCfg('precio_hora', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="label">% de adelanto</label>
                      <select className="input" value={form.config?.descuento_pago || 0.5} onChange={e => setCfg('descuento_pago', Number(e.target.value))}>
                        <option value={0.5}>50% (recomendado)</option>
                        <option value={1}>100% (pago completo)</option>
                        <option value={0.3}>30%</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Número Yape para cobros</label>
                    <input className="input" value={form.config?.pagos?.yape || ''} onChange={e => setCfg('pagos', { ...form.config?.pagos, yape: e.target.value })} placeholder="999 888 777" />
                  </div>
                  <div>
                    <label className="label">Titular de la cuenta Yape</label>
                    <input className="input" value={form.config?.pagos?.titular || ''} onChange={e => setCfg('pagos', { ...form.config?.pagos, titular: e.target.value })} placeholder="Juan Pérez" />
                  </div>
                </>
              )}

              {/* Plan y vigencia automática: solo para adminBot+ */}
              {!isNew && esAdminBot && (
                <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                  <div>
                    <label className="label">Plan</label>
                    <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                      <option value="demo">Demo · 5 días</option>
                      <option value="mensual">Mensual · 30 días</option>
                      <option value="anual">Anual · 365 días</option>
                      <option value="lifetime">De por vida</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-gray-500">Inicio actual</p><p className="mt-0.5 text-gray-300">{bot?.plan_inicio || 'Sin asignar'}</p></div>
                    <div><p className="text-gray-500">Vencimiento actual</p><p className="mt-0.5 text-gray-300">{bot?.plan_expira || (bot?.plan === 'lifetime' ? 'Sin vencimiento' : 'Sin asignar')}</p></div>
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-400">
                    <input type="checkbox" className="mt-0.5 accent-brand-500" checked={form.renovar_plan}
                      onChange={e => set('renovar_plan', e.target.checked)} />
                    <span>Renovar desde hoy aunque el plan no cambie. Las fechas se calcularán automáticamente.</span>
                  </label>
                </div>
              )}
              {/* Para clientes: mostrar plan del cliente (solo lectura) */}
              {!isNew && esCliente && planCliente && (
                <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Tu plan actual</span>
                  <span className="text-sm font-semibold capitalize text-brand-300">{planCliente}</span>
                </div>
              )}

              {isNew ? (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPaso(1)} className="btn-secondary flex-1">← Atrás</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
                    {saving ? 'Creando...' : saved ? '¡Creado!' : 'Crear bot'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
                    {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </>
          )}


        </form>
      </div>
    </div>
  )
}
