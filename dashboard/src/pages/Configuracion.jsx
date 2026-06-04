import { useEffect, useState } from 'react'
import { Save, Loader2, CheckCircle } from 'lucide-react'
import { api } from '../lib/api.js'

export function Configuracion() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.config().then(setConfig).catch(console.error).finally(() => setLoading(false))
  }, [])

  function set(path, value) {
    setConfig(prev => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
    setSaved(false)
  }

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.saveConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Cargando configuración...</div>
  if (!config)  return <div className="py-20 text-center text-red-400">Error al cargar config</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Configuración del Bot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Personaliza el comportamiento del chatbot</p>
        </div>
      </div>

      <form onSubmit={guardar} className="space-y-5">

        {/* General */}
        <Section title="General">
          <Field label="Nombre del Bot">
            <input className="input" value={config.bot_nombre || ''} onChange={e => set('bot_nombre', e.target.value)} />
          </Field>
        </Section>

        {/* Precios */}
        <Section title="Precios">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio por hora (S/.)">
              <input className="input" type="number" min="0" value={config.precio_hora} onChange={e => set('precio_hora', Number(e.target.value))} />
            </Field>
            <Field label="% de adelanto (0.5 = 50%)">
              <input className="input" type="number" min="0" max="1" step="0.05" value={config.descuento_pago} onChange={e => set('descuento_pago', Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Tiempo límite de pago (minutos)">
            <input className="input w-40" type="number" min="5" max="60" value={config.timeout_pago_minutos} onChange={e => set('timeout_pago_minutos', Number(e.target.value))} />
          </Field>
        </Section>

        {/* Horarios */}
        <Section title="Horarios">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Apertura">
              <input className="input" type="time" value={config.horarios?.apertura || '07:00'} onChange={e => set('horarios.apertura', e.target.value)} />
            </Field>
            <Field label="Cierre">
              <input className="input" type="time" value={config.horarios?.cierre || '22:00'} onChange={e => set('horarios.cierre', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Pagos */}
        <Section title="Datos de Pago">
          <Field label="Número Yape">
            <input className="input" type="text" value={config.pagos?.yape || ''} onChange={e => set('pagos.yape', e.target.value)} />
          </Field>
          <Field label="Número Plin">
            <input className="input" type="text" value={config.pagos?.plin || ''} onChange={e => set('pagos.plin', e.target.value)} />
          </Field>
          <Field label="Titular de la cuenta">
            <input className="input" type="text" value={config.pagos?.titular || ''} onChange={e => set('pagos.titular', e.target.value)} />
          </Field>
        </Section>

        {/* Mensajes */}
        <Section title="Mensajes del Bot">
          <Field label="Mensaje de bienvenida">
            <textarea className="input resize-none h-20" value={config.mensajes?.bienvenida || ''} onChange={e => set('mensajes.bienvenida', e.target.value)} />
          </Field>
          <Field label="Mensaje de reserva confirmada">
            <textarea className="input resize-none h-20" value={config.mensajes?.pago_confirmado || ''} onChange={e => set('mensajes.pago_confirmado', e.target.value)} />
          </Field>
          <Field label="Mensaje de pago rechazado">
            <textarea className="input resize-none h-20" value={config.mensajes?.pago_rechazado || ''} onChange={e => set('mensajes.pago_rechazado', e.target.value)} />
          </Field>
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-brand-400 text-sm font-medium">
              <CheckCircle size={16} /> Guardado correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 border-b border-gray-800 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
