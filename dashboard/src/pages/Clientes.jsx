import { useEffect, useState } from 'react'
import { Users, Search, RefreshCw } from 'lucide-react'
import { api } from '../lib/api.js'

export function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.clientes()
      .then(setClientes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const lista = clientes.filter(c =>
    !filtro ||
    `${c.nombres} ${c.apellidos} ${c.dni}`.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => { setLoading(true); api.clientes().then(setClientes).finally(() => setLoading(false)) }}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="card">
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9" placeholder="Buscar por nombre o DNI..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600 text-sm">Cargando clientes...</div>
        ) : lista.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">No se encontraron clientes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-3 pr-4 font-medium">DNI</th>
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Reservas</th>
                  <th className="pb-3 pr-4 font-medium">Total gastado</th>
                  <th className="pb-3 pr-4 font-medium">Fuente</th>
                  <th className="pb-3 font-medium">Última reserva</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(c => (
                  <tr key={c.dni} className="table-row">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">{c.dni}</td>
                    <td className="py-3 pr-4 text-gray-200 font-medium">{c.nombres} {c.apellidos}</td>
                    <td className="py-3 pr-4">
                      <span className="bg-brand-500/15 text-brand-400 text-xs px-2 py-0.5 rounded-full font-medium">
                        {c.total_reservas}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">S/. {Number(c.total_gastado || 0).toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.fuente === 'api' ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                        {c.fuente === 'api' ? 'RENIEC' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {c.ultima_reserva ? new Date(c.ultima_reserva).toLocaleDateString('es-PE') : '—'}
                    </td>
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
