import { useEffect, useState } from 'react'
import { Plus, Bot, Edit2, Trash2, Power, Loader2, X, CheckCircle, Wifi, WifiOff, Clock, PhoneCall } from 'lucide-react'
import { api } from '../lib/api.js'
import { ConectarWhatsApp } from './ConectarWhatsApp.jsx'

const TIPOS = {
  grass:      { emoji: '🌿', label: 'Grass Sintético',  color: 'brand',  desc: 'Reservas de canchas por hora, cobro Yape/Plin' },
  comercio:   { emoji: '🛍️', label: 'Comercio / Tienda', color: 'blue',  desc: 'Catálogo, pedidos y pagos por WhatsApp' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',       color: 'amber', desc: 'Reservas de mesa, delivery y pedidos' },
}

const PLANES = {
  demo:     { label: 'Demo',        color: 'text-gray-400 bg-gray-700' },
  mensual:  { label: 'Mensual',     color: 'text-blue-400 bg-blue-500/15' },
  anual:    { label: 'Anual',       color: 'text-brand-400 bg-brand-500/15' },
  lifetime: { label: 'De por vida', color: 'text-amber-400 bg-amber-500/15' },
}

const COLOR = {
  brand: { badge: 'bg-brand-500/10 text-brand-400 border-brand-500/20', ring: 'ring-brand-500/20' },
  blue:  { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    ring: 'ring-blue-500/20'  },
  amber: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', ring: 'ring-amber-500/20' },
}

// Los planes anual y lifetime permiten conectar número propio
const PLAN_PUEDE_PROPIO = ['anual', 'lifetime']

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
  const [bots, setBots]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)      // null | 'crear' | bot-object
  const [confirm, setConfirm] = useState(null)      // id a eliminar
  const [conectar, setConectar] = useState(null)    // bot a conectar

  function cargar() {
    setLoading(true)
    api.bots().then(setBots).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  async function toggleActivo(bot) {
    await api.actualizarBot(bot.id, { activo: bot.activo ? 0 : 1 })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Mis Bots</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona todos tus chatbots desde un solo lugar</p>
        </div>
        <button onClick={() => setModal('crear')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Crear bot
        </button>
      </div>

      {/* Tipos disponibles */}
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

      {/* Lista de bots */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" /> Cargando bots...
        </div>
      ) : bots.length === 0 ? (
        <div className="card py-12 text-center">
          <Bot size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">Aún no tienes bots creados</p>
          <p className="text-gray-600 text-sm mt-1 mb-4">Crea tu primer bot para comenzar</p>
          <button onClick={() => setModal('crear')} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Crear primer bot
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bots.map(bot => {
            const tipo = TIPOS[bot.tipo] || TIPOS.grass
            const plan = PLANES[bot.plan] || PLANES.demo
            const c    = COLOR[tipo.color]
            const puedeConectarPropio = PLAN_PUEDE_PROPIO.includes(bot.plan)
            const yaConectado = bot.estado_conexion === 'activo'
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.color}`}>{plan.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bot.activo ? 'bg-brand-500/15 text-brand-400' : 'bg-gray-700 text-gray-500'}`}>
                          {bot.activo ? '● Activo' : '● Inactivo'}
                        </span>
                      </div>

                      {/* Estado de conexión WhatsApp */}
                      <EstadoConexionBadge bot={bot} />

                      {/* Info secundaria */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        {bot.admin_phone && <span>Admin: <span className="font-mono text-gray-400">{bot.admin_phone}</span></span>}
                        {bot.plan_expira && <span>Vence: <span className="text-amber-400">{bot.plan_expira}</span></span>}
                        {bot.tipo_conexion === 'gestionado' && <span className="text-gray-600">Número gestionado por plataforma</span>}
                        {bot.tipo_conexion === 'propio'     && <span className="text-gray-600">Número propio conectado</span>}
                      </div>

                      {/* CTA: conectar número propio si es anual/lifetime y no tiene conexión */}
                      {puedeConectarPropio && !yaConectado && (
                        <button
                          onClick={() => setConectar(bot)}
                          className="mt-1 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors font-medium"
                        >
                          <PhoneCall size={12} /> Conectar mi número de WhatsApp
                        </button>
                      )}

                      {/* CTA: plan mensual esperando activación */}
                      {bot.plan === 'mensual' && bot.estado_conexion === 'pendiente' && (
                        <p className="text-xs text-amber-400 mt-1">
                          ⏳ Tu número será asignado en las próximas 24 h. Te avisaremos por WhatsApp.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModal(bot)} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => toggleActivo(bot)} className={`p-2 rounded-lg transition-colors ${bot.activo ? 'text-brand-400 hover:bg-brand-500/10' : 'text-gray-500 hover:bg-gray-800'}`} title={bot.activo ? 'Desactivar' : 'Activar'}>
                      <Power size={16} />
                    </button>
                    <button onClick={() => setConfirm(bot.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
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

// ─── MODAL CREAR / EDITAR BOT ────────────────────────────────
function BotModal({ bot, onClose, onSaved }) {
  const isNew = !bot
  const [paso, setPaso]   = useState(1)   // 1=tipo, 2=negocio, 3=plan
  const [form, setForm]   = useState({
    nombre:      bot?.nombre      || '',
    tipo:        bot?.tipo        || 'grass',
    admin_phone: bot?.admin_phone || '',
    plan:        bot?.plan        || 'demo',
    plan_inicio: bot?.plan_inicio || '',
    plan_expira: bot?.plan_expira || '',
    config: bot?.config || {}
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

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

  const totalPasos = isNew ? 3 : 1

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
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  paso > n ? 'bg-brand-500 text-white' : paso === n ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500' : 'bg-gray-800 text-gray-600'
                }`}>
                  {paso > n ? <CheckCircle size={14} /> : n}
                </div>
                {n < 3 && <div className={`h-0.5 flex-1 rounded transition-colors ${paso > n ? 'bg-brand-500' : 'bg-gray-800'}`} />}
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
              <div>
                <label className="label">Nombre de tu negocio *</label>
                <input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Grass Los Pinos" />
              </div>

              <div>
                <label className="label">Tu WhatsApp (para recibir alertas de pagos) *</label>
                <input className="input" required value={form.admin_phone} onChange={e => set('admin_phone', e.target.value)} placeholder="51999888777" />
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

              {isNew ? (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPaso(1)} className="btn-secondary flex-1">← Atrás</button>
                  <button type="button" onClick={() => setPaso(3)} className="btn-primary flex-1">Siguiente →</button>
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

          {/* ── Paso 3: Plan (solo al crear) ── */}
          {(isNew && paso === 3) && (
            <>
              <p className="text-gray-400 text-sm mb-1">Elige tu plan</p>
              <div className="space-y-2">
                {[
                  { value: 'demo',     label: 'Demo gratuito',   desc: 'Prueba el bot, número gestionado, límite 50 conversaciones/mes', color: 'gray' },
                  { value: 'mensual',  label: 'Mensual — S/. 50/mes', desc: 'Número gestionado por la plataforma, soporte básico', color: 'blue' },
                  { value: 'anual',    label: 'Anual — S/. 500/año',  desc: 'Conecta tu propio número de WhatsApp Business, sin límites', color: 'brand' },
                  { value: 'lifetime', label: 'De por vida',           desc: 'Tu propio número + soporte prioritario + actualizaciones', color: 'amber' },
                ].map(p => (
                  <button
                    key={p.value} type="button"
                    onClick={() => set('plan', p.value)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      form.plan === p.value
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${form.plan === p.value ? 'text-brand-300' : 'text-gray-200'}`}>{p.label}</span>
                      {PLAN_PUEDE_PROPIO.includes(p.value) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">Número propio</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>

              {/* Info según plan elegido */}
              {(form.plan === 'mensual' || form.plan === 'demo') && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                  <p className="font-semibold mb-1">📞 ¿Cómo funciona el número?</p>
                  <p>Con el plan {form.plan === 'demo' ? 'demo' : 'mensual'}, nosotros asignamos un número de WhatsApp a tu bot. Nuestro equipo lo activará en las próximas 24 horas y te avisará por WhatsApp.</p>
                </div>
              )}
              {PLAN_PUEDE_PROPIO.includes(form.plan) && (
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 text-xs text-brand-300">
                  <p className="font-semibold mb-1">📱 Tu propio número</p>
                  <p>Después de crear el bot, podrás conectar tu número de WhatsApp Business en solo 4 pasos guiados. No necesitas saber de programación.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPaso(2)} className="btn-secondary flex-1">← Atrás</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
                  {saving ? 'Creando...' : saved ? '¡Creado!' : 'Crear bot'}
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  )
}
