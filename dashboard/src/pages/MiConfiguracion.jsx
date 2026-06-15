import { useEffect, useState } from 'react'
import { Save, Loader2, CheckCircle, Settings, DollarSign, Clock, Phone, MessageSquare, AlertCircle } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <Icon size={16} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  )
}

export function MiConfiguracion() {
  const { user } = useAuth()
  const [bots, setBots]     = useState([])
  const [botSel, setBotSel] = useState(null)
  const [config, setConfig] = useState(null)
  const [nombre, setNombre] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    api.bots()
      .then(data => {
        setBots(data)
        if (data.length > 0) seleccionarBot(data[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function seleccionarBot(bot) {
    setBotSel(bot)
    setNombre(bot.nombre || '')
    setAdminPhone(bot.admin_phone || '')
    setConfig(bot.config ? (typeof bot.config === 'string' ? JSON.parse(bot.config) : { ...bot.config }) : {})
    setSaved(false)
    setError(null)
  }

  function setCfg(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function setCfgNested(parent, key, value) {
    setConfig(prev => ({ ...prev, [parent]: { ...(prev?.[parent] || {}), [key]: value } }))
    setSaved(false)
  }

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.actualizarBot(botSel.id, {
        nombre,
        admin_phone: adminPhone,
        config
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" /> Cargando tu configuración...
      </div>
    )
  }

  if (bots.length === 0) {
    return (
      <div className="py-20 text-center">
        <Settings size={40} className="mx-auto text-gray-700 mb-3" />
        <p className="text-gray-400 font-medium">No tienes bots asignados aún</p>
        <p className="text-gray-600 text-sm mt-1">Contacta al administrador para que te asigne un bot</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Configuración de mi bot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Personaliza el nombre, pagos y horarios de tu asistente</p>
        </div>
      </div>

      {/* Selector de bot si tiene varios */}
      {bots.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {bots.map(b => (
            <button
              key={b.id}
              onClick={() => seleccionarBot(b)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                botSel?.id === b.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {b.nombre}
            </button>
          ))}
        </div>
      )}

      {botSel && config && (
        <form onSubmit={guardar} className="space-y-5">

          <Section icon={Settings} title="Información general">
            <Field label="Nombre de tu negocio" hint="Aparece en los mensajes que envía el bot a tus clientes">
              <input className="input" value={nombre} onChange={e => { setNombre(e.target.value); setSaved(false) }} required />
            </Field>
            <Field label="Tu WhatsApp (para recibir alertas de pago)" hint="Formato: 51 + número sin espacios (ej: 51999888777)">
              <input className="input" type="tel" value={adminPhone} onChange={e => { setAdminPhone(e.target.value); setSaved(false) }} placeholder="51999888777" />
            </Field>
          </Section>

          <Section icon={DollarSign} title="Pagos">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Número Yape" hint="Solo los dígitos">
                <input className="input" value={config?.pagos?.yape || ''} onChange={e => setCfgNested('pagos', 'yape', e.target.value)} placeholder="999 888 777" />
              </Field>
              <Field label="Número Plin">
                <input className="input" value={config?.pagos?.plin || ''} onChange={e => setCfgNested('pagos', 'plin', e.target.value)} placeholder="999 888 777" />
              </Field>
            </div>
            <Field label="Titular de la cuenta">
              <input className="input" value={config?.pagos?.titular || ''} onChange={e => setCfgNested('pagos', 'titular', e.target.value)} placeholder="Juan Pérez" />
            </Field>
            {config?.precio_hora !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Precio por hora (S/.)">
                  <input className="input" type="number" min="1" value={config.precio_hora || 50} onChange={e => setCfg('precio_hora', Number(e.target.value))} />
                </Field>
                <Field label="% de adelanto al reservar">
                  <select className="input" value={config.descuento_pago || 0.5} onChange={e => setCfg('descuento_pago', Number(e.target.value))}>
                    <option value={0.5}>50%</option>
                    <option value={1}>100% (pago completo)</option>
                    <option value={0.3}>30%</option>
                  </select>
                </Field>
              </div>
            )}
          </Section>

          <Section icon={Clock} title="Horarios de atención">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Apertura">
                <input className="input" type="time" value={config?.horarios?.apertura || '07:00'} onChange={e => setCfgNested('horarios', 'apertura', e.target.value)} />
              </Field>
              <Field label="Cierre">
                <input className="input" type="time" value={config?.horarios?.cierre || '22:00'} onChange={e => setCfgNested('horarios', 'cierre', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section icon={MessageSquare} title="Mensajes del bot">
            <Field label="Mensaje de bienvenida" hint="Lo que el bot dice cuando alguien le escribe por primera vez">
              <textarea
                className="input resize-none"
                rows={3}
                value={config?.mensajes?.bienvenida || ''}
                onChange={e => setCfgNested('mensajes', 'bienvenida', e.target.value)}
                placeholder="¡Hola! Bienvenido a nuestro servicio de reservas..."
              />
            </Field>
            <Field label="Mensaje de reserva confirmada">
              <textarea
                className="input resize-none"
                rows={2}
                value={config?.mensajes?.confirmacion || config?.mensajes?.pago_confirmado || ''}
                onChange={e => {
                  setCfgNested('mensajes', 'confirmacion', e.target.value)
                  setCfgNested('mensajes', 'pago_confirmado', e.target.value)
                }}
                placeholder="¡Tu reserva está confirmada! Te esperamos..."
              />
            </Field>
          </Section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 text-sm text-red-300">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-600">
              Bot: <span className="font-mono text-gray-500">{botSel.id}</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-6"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                : saved
                ? <><CheckCircle size={16} /> ¡Guardado!</>
                : <><Save size={16} /> Guardar cambios</>
              }
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
