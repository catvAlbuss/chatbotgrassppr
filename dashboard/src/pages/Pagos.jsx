import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '../components/Badge.jsx'
import { api } from '../lib/api.js'

export function Pagos() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [acciones, setAcciones] = useState({}) // id → 'aprobar'|'rechazar'|'done'

  function cargar() {
    setLoading(true)
    api.reservas({ estado: 'EN_REVISION', limit: 50 })
      .then(r => {
        return api.reservas({ estado: 'COMPROBANTE_ENVIADO', limit: 50 }).then(r2 => {
          const map = new Map()
          ;[...r, ...r2].forEach(x => map.set(x.id, x))
          setPagos([...map.values()].sort((a,b) => new Date(b.creado_en)-new Date(a.creado_en)))
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 20_000)
    return () => clearInterval(id)
  }, [])

  async function accion(id, tipo) {
    setAcciones(a => ({ ...a, [id]: tipo }))
    try {
      if (tipo === 'aprobar') await api.aprobar(id)
      else await api.rechazar(id)
      setAcciones(a => ({ ...a, [id]: 'done' }))
      setTimeout(() => cargar(), 1000)
    } catch (err) {
      alert('Error: ' + err.message)
      setAcciones(a => { const n = {...a}; delete n[id]; return n })
    }
  }

  const pendientes = pagos.filter(p => !acciones[p.id] || acciones[p.id] === 'none')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Pagos Pendientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Aprobar o rechazar comprobantes</p>
        </div>
      </div>

      {loading ? (
        <div className="card py-12 flex items-center justify-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" /> Cargando pagos...
        </div>
      ) : pagos.length === 0 ? (
        <div className="card py-12 text-center">
          <CheckCircle size={40} className="mx-auto text-brand-500 mb-3" />
          <p className="text-gray-300 font-medium">Todo al día</p>
          <p className="text-gray-600 text-sm mt-1">No hay pagos pendientes de revisión</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pagos.map(p => {
            const estado = acciones[p.id]
            const horas = Array.isArray(p.horas) ? p.horas : []
            return (
              <div key={p.id} className={`card transition-all ${estado === 'done' ? 'opacity-50' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{p.id}</span>
                      <Badge estado={p.estado} />
                      {estado === 'done' && (
                        <span className="text-xs text-brand-400 font-medium">✓ Procesado</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Cliente:</span>
                        <span className="text-gray-200 ml-2 font-medium">{p.nombres} {p.apellidos}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">DNI:</span>
                        <span className="text-gray-300 ml-2 font-mono">{p.dni}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tel:</span>
                        <span className="text-gray-300 ml-2 font-mono">{p.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cancha:</span>
                        <span className="text-gray-300 ml-2">{p.tipo_cancha}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha:</span>
                        <span className="text-gray-300 ml-2">{p.fecha_display}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Horas:</span>
                        <span className="text-gray-300 ml-2">{horas.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">N° Op:</span>
                        <span className="text-brand-300 ml-2 font-mono font-medium">{p.numero_op || 'Sin registrar'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Adelanto:</span>
                        <span className="text-brand-400 ml-2 font-bold">S/. {p.monto_reserva}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  {!estado && (
                    <div className="flex flex-col gap-2 min-w-36">
                      <button
                        onClick={() => accion(p.id, 'aprobar')}
                        className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
                      >
                        <CheckCircle size={16} /> Aprobar
                      </button>
                      <button
                        onClick={() => accion(p.id, 'rechazar')}
                        className="btn-danger flex items-center justify-center gap-2 text-sm py-2.5"
                      >
                        <XCircle size={16} /> Rechazar
                      </button>
                    </div>
                  )}
                  {estado && estado !== 'done' && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      {estado === 'aprobar' ? 'Aprobando...' : 'Rechazando...'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
