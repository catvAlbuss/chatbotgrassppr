import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck, DollarSign, Clock, Users, ArrowRight,
  TrendingUp, Bot, Boxes, Activity, Wifi
} from 'lucide-react'
import { StatCard } from '../components/StatCard.jsx'
import { Badge } from '../components/Badge.jsx'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function MiniBar({ value, max, color = 'bg-brand-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function SparkLine({ data, color = '#22c55e' }) {
  if (!data?.length) return null
  const vals = data.map(d => Number(d.ingresos))
  const max = Math.max(...vals, 1)
  const w = 120, h = 32, pad = 2
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1 || 1)) * (w - pad * 2)
    const y = h - pad - ((v / max) * (h - pad * 2))
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Overview() {
  const { esAdmin, esRoot, user } = useAuth()
  const [stats, setStats]         = useState(null)
  const [adminStats, setAdminStats] = useState(null)
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let activo = true
    function cargar() {
      setLoading(true)
      const reqs = [api.stats(), api.reservas({ limit: 8 })]
      if (esAdmin) reqs.push(api.statsAdmin())
      Promise.all(reqs)
        .then(([s, r, a]) => {
          if (!activo) return
          setStats(s)
          setRecientes(r)
          if (a) setAdminStats(a)
        })
        .catch(console.error)
        .finally(() => { if (activo) setLoading(false) })
    }
    cargar()
    const id = setInterval(cargar, 30_000)
    return () => { activo = false; clearInterval(id) }
  }, [esAdmin])

  const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  const maxSemana = Math.max(...(stats?.semana?.map(d => Number(d.ingresos)) || [1]), 1)

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Resumen operativo</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{hoy}</p>
        </div>
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Reservas hoy"     value={stats?.reservas_hoy ?? '—'}              color="brand" />
        <StatCard icon={DollarSign}    label="Ingresos hoy"     value={`S/. ${stats?.ingresos_hoy ?? '0.00'}`}  color="blue"  />
        <StatCard icon={Clock}         label="Pagos pendientes" value={stats?.pagos_pendientes ?? '—'}           color="amber" sub="Por aprobar" />
        <StatCard icon={Users}         label="Clientes hoy"     value={stats?.clientes_hoy ?? '—'}              color="brand" />
      </div>

      {/* KPIs de administrador (solo administrador+) */}
      {esAdmin && adminStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Boxes size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Bots activos</p>
              <p className="text-2xl font-bold text-gray-100">{adminStats.bots_activos}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Clientes activos</p>
              <p className="text-2xl font-bold text-gray-100">{adminStats.clientes_total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ingresos últimos 30d</p>
              <p className="text-2xl font-bold text-gray-100">S/. {Number(adminStats.ingresos_30d).toLocaleString('es-PE')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semana — gráfico de barras */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Activity size={15} className="text-brand-400" /> Actividad semanal
            </h2>
            {stats?.semana && <SparkLine data={stats.semana} />}
          </div>
          {stats?.semana?.length > 0 ? (
            <div className="space-y-3">
              {stats.semana.map(d => (
                <div key={d.dia} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">
                    {new Date(d.dia + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1">
                    <MiniBar value={Number(d.ingresos)} max={maxSemana} />
                  </div>
                  <span className="text-xs font-medium text-brand-400 w-20 text-right">
                    S/. {Number(d.ingresos).toLocaleString('es-PE')}
                  </span>
                  <span className="text-xs text-gray-600 w-10 text-right">{d.reservas} res.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 py-4">Sin datos de la semana</p>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Canchas activas */}
          {stats?.por_cancha?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Por tipo de cancha (hoy)</h2>
              <div className="space-y-2">
                {stats.por_cancha.map(c => (
                  <div key={c.tipo_cancha} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{c.tipo_cancha}</span>
                    <span className="text-sm font-semibold text-brand-400">{c.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribución planes (administrador+) */}
          {esAdmin && adminStats?.distribucion_planes?.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Bots por plan</h2>
              <div className="space-y-2">
                {adminStats.distribucion_planes.map(p => (
                  <div key={p.plan} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">{p.plan}</span>
                    <span className="text-sm font-semibold text-gray-300">{p.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reservas recientes */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-300">Reservas recientes</h2>
          <Link to="/admin/reservas" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600 text-sm">Cargando...</div>
        ) : recientes.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">No hay reservas aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Cancha</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Monto</th>
                  <th className="pb-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">{r.id}</td>
                    <td className="py-3 pr-4 text-gray-300">{r.nombres} {r.apellidos}</td>
                    <td className="py-3 pr-4 text-gray-400">{r.tipo_cancha}</td>
                    <td className="py-3 pr-4 text-gray-400">{r.fecha_display}</td>
                    <td className="py-3 pr-4 text-brand-400 font-medium">S/. {r.monto_reserva}</td>
                    <td className="py-3"><Badge estado={r.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
