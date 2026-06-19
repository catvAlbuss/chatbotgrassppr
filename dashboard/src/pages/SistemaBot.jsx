import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  CalendarCheck, DollarSign, Clock, Users, RefreshCw,
  ChevronLeft, Lock, Wifi, WifiOff, CheckCircle, XCircle,
  AlertCircle, Loader2, MessageSquare
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

// ── Helpers ──────────────────────────────────────────────────
const ESTADOS = {
  CONFIRMADA:          { label: 'Confirmada',   color: 'bg-brand-500/15 text-brand-400',  icon: CheckCircle },
  EN_REVISION:         { label: 'En revisión',  color: 'bg-amber-500/15 text-amber-400',  icon: Clock       },
  COMPROBANTE_ENVIADO: { label: 'Por aprobar',  color: 'bg-blue-500/15  text-blue-400',   icon: AlertCircle },
  RECHAZADA:           { label: 'Rechazada',    color: 'bg-red-500/15   text-red-400',    icon: XCircle     },
  CANCELADA:           { label: 'Cancelada',    color: 'bg-gray-700     text-gray-400',   icon: XCircle     },
}

const TIPOS = {
  grass:      { emoji: '🌿', label: 'Grass Sintético' },
  comercio:   { emoji: '🛍️', label: 'Comercio'        },
  restaurant: { emoji: '🍽️', label: 'Restaurant'      },
}

function StatCard({ icon: Icon, label, value, sub, color = 'brand', locked }) {
  const colors = {
    brand: 'bg-brand-500/10 text-brand-400',
    blue:  'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    green: 'bg-green-500/10 text-green-400',
  }
  return (
    <div className={`card relative ${locked ? 'opacity-50 select-none' : ''}`}>
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Lock size={18} className="text-amber-400" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-100 leading-tight">{locked ? '—' : value}</p>
          {sub && <p className="text-xs text-gray-600">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] || { label: estado, color: 'bg-gray-700 text-gray-400', icon: AlertCircle }
  const Icon = e.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${e.color}`}>
      <Icon size={10} /> {e.label}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────
export function SistemaBot() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esDemo, esCliente, esAdminBot, plan } = useAuth()

  const [bot, setBot]         = useState(null)
  const [stats, setStats]     = useState(null)
  const [reservas, setReservas] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [ts, setTs]           = useState(Date.now())

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.bot(id),
      api.statsBot(id),
      api.reservasBot(id, { limit: 15 }),
      api.reservasBot(id, { estado: 'COMPROBANTE_ENVIADO', limit: 20 }),
    ])
      .then(([b, s, r, p]) => {
        setBot(b)
        setStats(s)
        setReservas(r)
        setPendientes(p)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, ts])

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" /> Cargando sistema del bot...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ChevronLeft size={15} /> Volver
        </button>
      </div>
    )
  }

  const tipo = TIPOS[bot?.tipo] || TIPOS.grass
  const yaConectado = bot?.estado_conexion === 'activo'

  return (
    <div className="space-y-6">

      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tipo.emoji}</span>
              <h1 className="text-xl font-bold text-gray-100">{bot?.nombre}</h1>
              {esDemo && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">
                  🧪 Demo
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{tipo.label}</span>
              <span className={`flex items-center gap-1 text-xs ${yaConectado ? 'text-brand-400' : 'text-gray-600'}`}>
                {yaConectado ? <Wifi size={11} /> : <WifiOff size={11} />}
                {yaConectado ? (bot?.numero_display || 'Conectado') : 'Sin número WhatsApp'}
              </span>
              {yaConectado && bot?.numero_display && (
                <a
                  href={`https://wa.me/${bot.numero_display.replace(/\D/g, '')}?text=Hola`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  <MessageSquare size={11} /> Probar bot
                </a>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setTs(Date.now())} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Banner demo */}
      {esDemo && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-300 font-medium">Vista de demostración</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Puedes ver el resumen del bot pero no gestionar reservas ni aprobar pagos. Activa un plan para acceso completo.
            </p>
          </div>
          <Link to="/admin/planes" className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors">
            Ver planes
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Reservas hoy"     value={stats?.reservas_hoy ?? 0}                  color="brand" />
        <StatCard icon={DollarSign}    label="Ingresos hoy"     value={`S/. ${stats?.ingresos_hoy ?? '0.00'}`}    color="green" locked={esDemo} />
        <StatCard icon={Clock}         label="Por aprobar"      value={stats?.pagos_pendientes ?? 0}               color="amber" locked={esDemo} />
        <StatCard icon={Users}         label="Clientes hoy"     value={stats?.clientes_hoy ?? 0}                   color="blue"  />
      </div>

      {/* Pagos pendientes */}
      {!esDemo && pendientes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <Clock size={15} className="text-amber-400" />
              Pagos por aprobar
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{pendientes.length}</span>
            </h2>
          </div>
          <div className="space-y-2">
            {pendientes.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-800/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{r.nombres} {r.apellidos}</p>
                  <p className="text-xs text-gray-500">{r.tipo_cancha} · {r.fecha}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-green-400">S/. {Number(r.monto_reserva || 0).toFixed(2)}</p>
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas reservas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <CalendarCheck size={15} className="text-brand-400" />
            {esDemo ? 'Vista previa de reservas' : 'Últimas reservas'}
          </h2>
          {esDemo && (
            <span className="text-xs text-amber-400/70 flex items-center gap-1">
              <Lock size={11} /> Solo lectura
            </span>
          )}
        </div>

        {reservas.length === 0 ? (
          <div className="py-10 text-center">
            <CalendarCheck size={32} className="mx-auto text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">Aún no hay reservas registradas</p>
            {yaConectado && (
              <p className="text-gray-600 text-xs mt-1">Las reservas llegarán cuando tus clientes usen el bot de WhatsApp</p>
            )}
            {!yaConectado && (
              <p className="text-xs text-amber-400/70 mt-1">El bot aún no tiene número de WhatsApp activo</p>
            )}
          </div>
        ) : (
          <div className={`space-y-2 ${esDemo ? 'relative' : ''}`}>
            {/* Blur overlay para demo */}
            {esDemo && reservas.length > 2 && (
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent z-10 flex items-end justify-center pb-4">
                <Link to="/admin/planes" className="text-xs px-4 py-2 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors">
                  Activa un plan para ver todas →
                </Link>
              </div>
            )}
            {(esDemo ? reservas.slice(0, 3) : reservas).map(r => (
              <div key={r.id} className={`flex items-center justify-between gap-4 py-2.5 border-b border-gray-800/60 last:border-0 ${esDemo ? 'select-none' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${esDemo ? 'blur-[2px] text-gray-300' : 'text-gray-200'}`}>
                    {r.nombres} {r.apellidos}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500">{r.tipo_cancha}</span>
                    <span className="text-xs text-gray-600">{r.fecha}</span>
                    {Array.isArray(r.horas) && r.horas.length > 0 && (
                      <span className="text-xs text-gray-600">{r.horas[0]}{r.horas.length > 1 ? ` +${r.horas.length - 1}` : ''}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className={`text-sm font-semibold ${esDemo ? 'blur-[3px] text-gray-300' : 'text-green-400'}`}>
                    S/. {Number(r.monto_reserva || 0).toFixed(2)}
                  </p>
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Semana (gráfico simple — solo para planes pagados) */}
      {!esDemo && stats?.semana?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <DollarSign size={15} className="text-green-400" /> Ingresos últimos 7 días
          </h2>
          <div className="flex items-end gap-1.5 h-20">
            {(() => {
              const vals = stats.semana.map(d => Number(d.ingresos))
              const max = Math.max(...vals, 1)
              return stats.semana.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-brand-500/60 rounded-sm transition-all hover:bg-brand-500"
                    style={{ height: `${Math.max((vals[i] / max) * 60, 4)}px` }}
                    title={`S/. ${Number(d.ingresos).toFixed(2)}`}
                  />
                  <span className="text-xs text-gray-600">{new Date(d.dia + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'narrow' })}</span>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

    </div>
  )
}
