import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, DollarSign, Clock, Users, ArrowRight, RefreshCw } from 'lucide-react'
import { StatCard } from '../components/StatCard.jsx'
import { Badge } from '../components/Badge.jsx'
import { api } from '../lib/api.js'

export function Overview() {
  const [stats, setStats] = useState(null)
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [ts, setTs] = useState(Date.now())

  useEffect(() => {
    setLoading(true)
    Promise.all([api.stats(), api.reservas({ limit: 8 })])
      .then(([s, r]) => { setStats(s); setRecientes(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [ts])

  const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Resumen</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{hoy}</p>
        </div>
        <button onClick={() => setTs(Date.now())} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Reservas hoy"      value={stats?.reservas_hoy ?? '—'}   color="brand" />
        <StatCard icon={DollarSign}    label="Ingresos hoy"      value={`S/. ${stats?.ingresos_hoy ?? '0.00'}`} color="blue" />
        <StatCard icon={Clock}         label="Pagos pendientes"  value={stats?.pagos_pendientes ?? '—'} color="amber" sub="Por aprobar" />
        <StatCard icon={Users}         label="Clientes hoy"      value={stats?.clientes_hoy ?? '—'}    color="brand" />
      </div>

      {/* Canchas del día */}
      {stats?.por_cancha?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Reservas por tipo de cancha (hoy)</h2>
          <div className="flex gap-3 flex-wrap">
            {stats.por_cancha.map(c => (
              <div key={c.tipo_cancha} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-gray-300 text-sm font-medium">{c.tipo_cancha}</span>
                <span className="text-brand-400 font-bold">{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
