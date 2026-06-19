import { useEffect, useState } from 'react'
import {
  Phone, Loader2, RefreshCw, X, Check, Wifi, WifiOff, Clock,
  AlertCircle, CheckCircle2, Link2, Info, ChevronRight
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

// ── Helpers ──────────────────────────────────────────────────
const PLAN_BADGE = {
  demo:     'bg-gray-700 text-gray-400',
  mensual:  'bg-blue-500/15 text-blue-400',
  anual:    'bg-brand-500/15 text-brand-400',
  lifetime: 'bg-amber-500/15 text-amber-400',
}

const CALIDAD_COLOR = {
  GREEN:  'text-green-400',
  YELLOW: 'text-amber-400',
  RED:    'text-red-400',
}

function BadgeEstado({ estado }) {
  if (estado === 'activo') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
      <Wifi size={10} /> Activo
    </span>
  )
  if (estado === 'pendiente') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={10} /> Pendiente
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-500 border border-gray-700">
      <WifiOff size={10} /> Sin número
    </span>
  )
}

// ── Modal: Asignar número gestionado a un bot ─────────────────
function ModalAsignar({ bot, numerosLibres, onClose, onAsignado }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  async function asignar() {
    if (!selected) return
    setSaving(true); setError(null)
    try {
      await api.asignarNumero(bot.id, {
        phone_number_id: selected.id,
        numero_display:  selected.display_phone_number,
      })
      onAsignado()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-100">Asignar número gestionado</h3>
            <p className="mt-0.5 text-xs text-gray-500">{bot.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {numerosLibres.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-sm text-amber-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>No hay números disponibles en tu WABA. Agrega nuevos números desde Meta Business Manager.</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">Selecciona un número de tu WABA para asignar a este bot:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {numerosLibres.map(n => {
                  const sel = selected?.id === n.id
                  return (
                    <button key={n.id} onClick={() => setSelected(n)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        sel
                          ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}>
                      <Phone size={16} className={sel ? 'text-brand-400' : 'text-gray-500'} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono font-semibold text-sm ${sel ? 'text-brand-300' : 'text-gray-200'}`}>
                          {n.display_phone_number}
                        </p>
                        {n.verified_name && (
                          <p className="text-xs text-gray-500 truncate">{n.verified_name}</p>
                        )}
                      </div>
                      {n.quality_rating && (
                        <span className={`text-xs font-medium ${CALIDAD_COLOR[n.quality_rating] || 'text-gray-500'}`}>
                          {n.quality_rating}
                        </span>
                      )}
                      {sel && <Check size={15} className="text-brand-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 flex gap-2 text-sm text-red-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={asignar}
              disabled={!selected || saving || numerosLibres.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={15} className="animate-spin" /> Asignando...</> : <><Link2 size={15} /> Asignar número</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Guía de migración ──────────────────────────────────
function ModalMigracion({ bot, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-100">Guía de migración de número</h3>
            <p className="mt-0.5 text-xs text-gray-500">{bot.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2 text-xs text-blue-300">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              El cliente debe usar <strong>su propio número</strong>. Estos pasos se deben hacer una sola vez.
              El número se mantiene igual; solo cambia cómo está registrado en Meta.
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                num: 1,
                color: 'border-red-500/20 bg-red-500/5',
                numColor: 'bg-red-500/20 text-red-400',
                title: 'El cliente elimina WhatsApp de ese número',
                desc: 'WhatsApp (app) → Ajustes → Cuenta → Eliminar mi cuenta. Puede hacer backup antes.',
              },
              {
                num: 2,
                color: 'border-amber-500/20 bg-amber-500/5',
                numColor: 'bg-amber-500/20 text-amber-400',
                title: 'Agregar el número en Meta Business Manager',
                desc: 'business.facebook.com → WhatsApp Manager → Números → Agregar número. Verificar por SMS.',
              },
              {
                num: 3,
                color: 'border-brand-500/20 bg-brand-500/5',
                numColor: 'bg-brand-500/20 text-brand-400',
                title: 'Verificar desde "Mis Bots"',
                desc: 'El cliente entra a su panel → Mis Bots → Conectar número → "Ya registré mi número en Meta". El sistema lo detecta automáticamente.',
              },
            ].map(step => (
              <div key={step.num} className={`flex gap-3 p-4 rounded-xl border ${step.color}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step.numColor}`}>
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-xs text-gray-500">
            <strong className="text-gray-400">Tiempo estimado:</strong> 5–10 minutos por cliente.
            El número puede tardar hasta 3 minutos en liberarse de WhatsApp antes de poder agregarlo en Meta.
          </div>

          <button onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
            <CheckCircle2 size={15} /> Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function GestionNumeros() {
  const { esAdmin, nivel } = useAuth()

  const [bots, setBots]               = useState([])
  const [numerosWaba, setNumerosWaba] = useState([])
  const [loadingBots, setLoadingBots] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [errorMeta, setErrorMeta]     = useState(null)
  const [modalAsignar, setModalAsignar]   = useState(null)
  const [modalMigracion, setModalMigracion] = useState(null)

  async function cargarBots() {
    setLoadingBots(true)
    try { setBots(await api.bots()) }
    catch (err) { console.error(err) }
    finally { setLoadingBots(false) }
  }

  async function cargarMeta() {
    if (!esAdmin) return
    setLoadingMeta(true); setErrorMeta(null)
    try { const r = await api.metaNumeros(); setNumerosWaba(r.numeros || []) }
    catch (err) { setErrorMeta(err.message) }
    finally { setLoadingMeta(false) }
  }

  useEffect(() => {
    cargarBots()
    if (esAdmin) cargarMeta()
  }, [esAdmin])

  // Bots sin número activo
  const botsSinNumero = bots.filter(b => b.estado_conexion !== 'activo')

  // Números libres = en WABA pero no asignados a ningún bot
  const phoneIdsEnUso = new Set(bots.map(b => b.phone_number_id).filter(Boolean))
  const numerosLibres  = numerosWaba.filter(n => !phoneIdsEnUso.has(n.id))
  const numerosEnUso   = numerosWaba.filter(n => phoneIdsEnUso.has(n.id))

  function botDeNumero(phoneId) {
    return bots.find(b => b.phone_number_id === phoneId)
  }

  function onAsignado() {
    cargarBots()
    if (esAdmin) cargarMeta()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Números WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Gestiona el pool de números de la plataforma y activa bots pendientes
        </p>
      </div>

      {/* ── Sección A: Pool de números WABA (admin+) ── */}
      {esAdmin && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-100">Pool de números (tu WABA)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Números registrados en tu WhatsApp Business Account
              </p>
            </div>
            <button
              onClick={cargarMeta}
              disabled={loadingMeta}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-1.5 transition-colors"
            >
              <RefreshCw size={13} className={loadingMeta ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {loadingMeta ? (
            <div className="card py-10 flex items-center justify-center gap-2 text-gray-500">
              <Loader2 size={18} className="animate-spin" /> Consultando Meta API...
            </div>
          ) : errorMeta ? (
            <div className="card border-red-500/20 bg-red-500/5">
              <div className="flex gap-3 text-sm text-red-300">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{errorMeta}</p>
                  <p className="text-xs text-red-400/70 mt-1">
                    Verifica que WABA_ID y WHATSAPP_TOKEN estén configurados en .env
                  </p>
                </div>
              </div>
            </div>
          ) : numerosWaba.length === 0 ? (
            <div className="card py-10 text-center">
              <Phone size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-400 font-medium text-sm">No se encontraron números en el WABA</p>
              <p className="text-gray-600 text-xs mt-1">
                Agrega números desde Meta Business Manager → WhatsApp Manager
              </p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                    <th className="px-5 py-3 font-medium">Número</th>
                    <th className="px-3 py-3 font-medium">Calidad</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Asignado a</th>
                    <th className="px-3 py-3 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {numerosWaba.map(n => {
                    const botAsignado = botDeNumero(n.id)
                    const libre = !botAsignado
                    return (
                      <tr key={n.id} className="table-row border-b border-gray-800/50 last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-mono font-semibold text-gray-100">{n.display_phone_number}</p>
                          {n.verified_name && <p className="text-xs text-gray-500">{n.verified_name}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-semibold ${CALIDAD_COLOR[n.quality_rating] || 'text-gray-500'}`}>
                            {n.quality_rating || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {libre ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                              Libre
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">
                              Asignado
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {botAsignado ? (
                            <div>
                              <p className="text-xs text-gray-300 font-medium">{botAsignado.nombre}</p>
                              <p className="text-xs text-gray-600">
                                {botAsignado.cliente_nombre_comercial || botAsignado.cliente_sistema || 'Sin cliente'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {libre && botsSinNumero.length > 0 && (
                            <button
                              onClick={() => setModalAsignar({ numero: n, bots: botsSinNumero.filter(b => b.tipo_conexion !== 'propio') })}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-400 border border-gray-700 hover:border-brand-500/30 hover:bg-brand-500/5 rounded-lg px-2.5 py-1 transition-colors"
                            >
                              <Link2 size={11} /> Asignar a bot
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumen rápido */}
          {numerosWaba.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total WABA',  value: numerosWaba.length,    color: 'text-gray-200' },
                { label: 'Asignados',   value: numerosEnUso.length,   color: 'text-gray-400' },
                { label: 'Disponibles', value: numerosLibres.length,  color: 'text-brand-400' },
              ].map(s => (
                <div key={s.label} className="card text-center py-3">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Sección B: Bots sin número activo ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Bots pendientes de activación</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bots que aún no tienen un número de WhatsApp activo
            </p>
          </div>
          <button
            onClick={cargarBots}
            disabled={loadingBots}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={13} className={loadingBots ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {loadingBots ? (
          <div className="card py-10 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 size={18} className="animate-spin" /> Cargando bots...
          </div>
        ) : botsSinNumero.length === 0 ? (
          <div className="card py-10 text-center">
            <CheckCircle2 size={32} className="mx-auto text-brand-500/40 mb-3" />
            <p className="text-gray-400 font-medium text-sm">Todos los bots tienen número activo</p>
            <p className="text-gray-600 text-xs mt-1">No hay bots pendientes de activación</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-3 font-medium">Bot</th>
                  <th className="px-3 py-3 font-medium">Cliente / Plan</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {botsSinNumero.map(bot => (
                  <tr key={bot.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-200">{bot.nombre}</p>
                      <p className="text-xs text-gray-600 capitalize">{bot.tipo}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-gray-400">{bot.cliente_nombre_comercial || bot.cliente_sistema || <span className="text-amber-400">Sin cliente</span>}</p>
                      {bot.cliente_plan && (
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${PLAN_BADGE[bot.cliente_plan] || PLAN_BADGE.demo}`}>
                          {bot.cliente_plan}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeEstado estado={bot.estado_conexion} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs ${bot.tipo_conexion === 'gestionado' ? 'text-brand-400' : 'text-blue-400'}`}>
                        {bot.tipo_conexion === 'gestionado' ? 'Gestionado' : bot.tipo_conexion === 'propio' ? 'Propio' : 'Sin definir'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {/* Número gestionado: asignar del pool */}
                        {(bot.tipo_conexion === 'gestionado' || !bot.tipo_conexion) && esAdmin && (
                          <button
                            onClick={() => setModalAsignar({ numero: null, bot, bots: [bot] })}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-400 border border-gray-700 hover:border-brand-500/30 hover:bg-brand-500/5 rounded-lg px-2.5 py-1 transition-colors"
                          >
                            <Link2 size={11} /> Asignar
                          </button>
                        )}
                        {/* Número propio: guía de migración */}
                        {bot.tipo_conexion === 'propio' && (
                          <button
                            onClick={() => setModalMigracion(bot)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 border border-gray-700 hover:border-blue-500/30 hover:bg-blue-500/5 rounded-lg px-2.5 py-1 transition-colors"
                          >
                            <ChevronRight size={11} /> Ver guía
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modales */}
      {modalAsignar && (
        <ModalAsignar
          bot={modalAsignar.bot || modalAsignar.bots?.[0]}
          numerosLibres={modalAsignar.numero ? [modalAsignar.numero] : numerosLibres}
          onClose={() => setModalAsignar(null)}
          onAsignado={onAsignado}
        />
      )}
      {modalMigracion && (
        <ModalMigracion bot={modalMigracion} onClose={() => setModalMigracion(null)} />
      )}
    </div>
  )
}
