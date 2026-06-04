import { useEffect, useState } from 'react'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { Badge } from '../components/Badge.jsx'
import { api } from '../lib/api.js'

const ESTADOS = ['', 'PENDIENTE_PAGO', 'COMPROBANTE_ENVIADO', 'EN_REVISION', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA_TIMEOUT']

export function Reservas() {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')
  const [fecha, setFecha] = useState('')

  function cargar() {
    setLoading(true)
    api.reservas({ buscar, estado, fecha, limit: 100 })
      .then(setReservas)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Reservas</h1>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Buscar</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input pl-9"
                placeholder="Nombre, DNI, ID..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargar()}
              />
            </div>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input w-52" value={estado} onChange={e => setEstado(e.target.value)}>
              {ESTADOS.map(e => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input w-44" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <button onClick={cargar} className="btn-primary flex items-center gap-2">
            <Filter size={15} /> Filtrar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">
            {loading ? 'Cargando...' : `${reservas.length} reservas`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">DNI</th>
                <th className="px-4 py-3 font-medium">Cancha</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Horas</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 && !loading ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-600">No se encontraron reservas</td></tr>
              ) : reservas.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="px-6 py-3 font-mono text-xs text-gray-400">{r.id}</td>
                  <td className="px-4 py-3 text-gray-200">{r.nombres} {r.apellidos}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.dni}</td>
                  <td className="px-4 py-3 text-gray-300">{r.tipo_cancha}</td>
                  <td className="px-4 py-3 text-gray-400">{r.fecha_display}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {(Array.isArray(r.horas) ? r.horas : []).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-brand-400 font-medium">S/. {r.monto_reserva}</td>
                  <td className="px-4 py-3"><Badge estado={r.estado} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(r.creado_en).toLocaleDateString('es-PE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
