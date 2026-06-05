import { useState } from 'react'
import { X, CheckCircle, Loader2, ExternalLink, Copy, Check, AlertCircle, Wifi } from 'lucide-react'
import { api } from '../lib/api.js'

// URL del webhook que el cliente debe copiar en Meta
const WEBHOOK_URL  = `${window.location.origin}/webhook`
const VERIFY_TOKEN = 'gespro_asist_2026'

// ─── PASO 1: Requisito previo ─────────────────────────────
function Paso1({ onNext }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mx-auto mb-3">📱</div>
        <h3 className="font-bold text-gray-100 text-lg">Antes de empezar</h3>
        <p className="text-gray-400 text-sm mt-1">Necesitas una cuenta Meta Business con WhatsApp Business API activada</p>
      </div>

      <div className="space-y-3">
        {[
          { icon: '✅', title: 'Cuenta Meta Business',      desc: 'Si no tienes una, créala en business.facebook.com (es gratis)' },
          { icon: '✅', title: 'WhatsApp Business Account', desc: 'Una WABA con al menos un número de teléfono verificado' },
          { icon: '✅', title: 'Número verificado',         desc: 'El número debe estar activo y verificado en WhatsApp Manager' },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
            <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-200">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
        ¿No tienes cuenta Meta Business? <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="underline font-medium inline-flex items-center gap-1">Créala aquí <ExternalLink size={10} /></a> — solo necesitas un correo y es gratuito.
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Ya tengo todo listo → Continuar
      </button>
    </div>
  )
}

// ─── PASO 2: Obtener Phone Number ID ─────────────────────
function Paso2({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-gray-100 text-lg">Obtén tu Phone Number ID</h3>
        <p className="text-gray-400 text-sm mt-1">Es un número que identifica tu línea de WhatsApp en Meta</p>
      </div>

      <ol className="space-y-3 text-sm text-gray-300">
        {[
          <>Ve a <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noreferrer" className="text-brand-400 underline inline-flex items-center gap-1">WhatsApp Manager <ExternalLink size={11} /></a></>,
          <>Selecciona tu cuenta <strong className="text-gray-100">WhatsApp Business Account</strong></>,
          <>En el menú izquierdo entra a <strong className="text-gray-100">Números de teléfono</strong></>,
          <>Haz clic en tu número → verás el <strong className="text-gray-100">Phone Number ID</strong> (un número de ~15 dígitos)</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 text-xs text-gray-400">
        <p className="font-medium text-gray-300 mb-1">📸 ¿Cómo se ve?</p>
        <div className="font-mono bg-gray-900 rounded p-2 text-brand-300">
          Phone Number ID: <strong>109876543210987</strong>
        </div>
      </div>

      <div>
        <label className="label">Pega aquí tu Phone Number ID</label>
        <input
          className="input font-mono"
          value={form.phone_number_id}
          onChange={e => set('phone_number_id', e.target.value.trim())}
          placeholder="109876543210987"
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Atrás</button>
        <button onClick={onNext} disabled={!form.phone_number_id} className="btn-primary flex-1">Siguiente →</button>
      </div>
    </div>
  )
}

// ─── PASO 3: Obtener Token permanente ────────────────────
function Paso3({ form, set, onNext, onBack }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-gray-100 text-lg">Obtén tu Token permanente</h3>
        <p className="text-gray-400 text-sm mt-1">Un token que no expira para que el bot funcione siempre</p>
      </div>

      <ol className="space-y-3 text-sm text-gray-300">
        {[
          <>En <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="text-brand-400 underline inline-flex items-center gap-1">Configuración de negocio <ExternalLink size={11} /></a> ve a <strong className="text-gray-100">Usuarios del sistema</strong></>,
          <>Crea un usuario de sistema (o usa uno existente) con rol <strong className="text-gray-100">Administrador</strong></>,
          <>Haz clic en <strong className="text-gray-100">Generar nuevo token</strong></>,
          <>Selecciona tu App y activa el permiso <strong className="text-gray-100">whatsapp_business_messaging</strong></>,
          <>Copia el token — <strong className="text-gray-100">guárdalo</strong>, solo se muestra una vez</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
        <p className="font-semibold mb-1">⚠️ Importante</p>
        <p>Usa siempre un <strong>Token de Usuario del Sistema</strong> (no el token de usuario personal). El token personal expira cada 60 días y el bot dejaría de funcionar.</p>
      </div>

      <div>
        <label className="label">Pega aquí tu Token de acceso permanente</label>
        <input
          className="input font-mono text-xs"
          value={form.waba_token}
          onChange={e => set('waba_token', e.target.value.trim())}
          placeholder="EAABsbCS...token largo..."
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Atrás</button>
        <button onClick={onNext} disabled={!form.waba_token} className="btn-primary flex-1">Siguiente →</button>
      </div>
    </div>
  )
}

// ─── PASO 4: Configurar webhook + verificar ───────────────
function Paso4({ bot, form, onBack, onConectado }) {
  const [copiedUrl,   setCopiedUrl]   = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [error, setError]             = useState(null)
  const [resultado, setResultado]     = useState(null)

  function copiar(text, setter) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  async function verificar() {
    setVerificando(true)
    setError(null)
    try {
      const data = await api.verificarConexion(bot.id, {
        phone_number_id: form.phone_number_id,
        waba_token:      form.waba_token
      })
      setResultado(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerificando(false)
    }
  }

  if (resultado) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-4xl mx-auto">
          🎉
        </div>
        <div>
          <h3 className="font-bold text-gray-100 text-xl">¡Conexión exitosa!</h3>
          <p className="text-gray-400 text-sm mt-1">Tu WhatsApp está conectado y el bot está activo</p>
        </div>
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-brand-300">
            <Wifi size={16} />
            <span className="font-semibold text-sm">Número conectado:</span>
          </div>
          <p className="text-gray-100 font-mono text-lg font-bold">{resultado.numero}</p>
          <p className="text-gray-400 text-sm">{resultado.nombre}</p>
          {resultado.calidad && (
            <p className="text-xs text-gray-500">Calidad de la línea: <span className="text-brand-400 font-medium">{resultado.calidad}</span></p>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Ahora configura el webhook en tu Meta App (último paso abajo) para que los mensajes lleguen a tu bot.
        </p>
        <button onClick={onConectado} className="btn-primary w-full">
          ✅ Ir a mis bots
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-gray-100 text-lg">Configura el webhook y verifica</h3>
        <p className="text-gray-400 text-sm mt-1">Un último paso: dile a Meta dónde enviar los mensajes</p>
      </div>

      {/* Datos a copiar */}
      <div className="space-y-3">
        <div>
          <label className="label">URL del Webhook (copia esto en Meta)</label>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs text-brand-300 bg-gray-900" readOnly value={WEBHOOK_URL} />
            <button onClick={() => copiar(WEBHOOK_URL, setCopiedUrl)} className="btn-secondary px-3 flex-shrink-0">
              {copiedUrl ? <Check size={15} className="text-brand-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Token de verificación (copia esto en Meta)</label>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs text-brand-300 bg-gray-900" readOnly value={VERIFY_TOKEN} />
            <button onClick={() => copiar(VERIFY_TOKEN, setCopiedToken)} className="btn-secondary px-3 flex-shrink-0">
              {copiedToken ? <Check size={15} className="text-brand-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <ol className="space-y-2 text-sm text-gray-300">
        {[
          <>En tu Meta App ve a <strong className="text-gray-100">WhatsApp → Configuración → Webhooks</strong></>,
          <>Pega la <strong className="text-gray-100">URL del Webhook</strong> y el <strong className="text-gray-100">Token de verificación</strong> de arriba</>,
          <>Haz clic en <strong className="text-gray-100">Verificar y guardar</strong></>,
          <>Activa la suscripción a <strong className="text-gray-100">messages</strong></>,
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={verificando} className="btn-secondary flex-1">← Atrás</button>
        <button onClick={verificar} disabled={verificando} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {verificando ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : <><Wifi size={16} /> Verificar conexión</>}
        </button>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────
export function ConectarWhatsApp({ bot, onClose, onConectado }) {
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState({ phone_number_id: '', waba_token: '' })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const PASOS_LABEL = ['Requisitos', 'Phone Number ID', 'Token', 'Webhook']

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">

        {/* Header fijo */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 pt-5 pb-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-100">Conectar WhatsApp</h2>
              <p className="text-xs text-gray-500 mt-0.5">{bot.nombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1"><X size={20} /></button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1">
            {PASOS_LABEL.map((label, i) => {
              const n = i + 1
              return (
                <div key={n} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      paso > n ? 'bg-brand-500 text-white' : paso === n ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500' : 'bg-gray-800 text-gray-600'
                    }`}>
                      {paso > n ? <Check size={12} /> : n}
                    </div>
                    <span className={`text-xs hidden sm:block ${paso === n ? 'text-brand-400' : 'text-gray-600'}`}>{label}</span>
                  </div>
                  {n < 4 && <div className={`h-0.5 flex-1 rounded mb-4 transition-colors ${paso > n ? 'bg-brand-500' : 'bg-gray-800'}`} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="p-6">
          {paso === 1 && <Paso1 onNext={() => setPaso(2)} />}
          {paso === 2 && <Paso2 form={form} set={set} onNext={() => setPaso(3)} onBack={() => setPaso(1)} />}
          {paso === 3 && <Paso3 form={form} set={set} onNext={() => setPaso(4)} onBack={() => setPaso(2)} />}
          {paso === 4 && <Paso4 bot={bot} form={form} onBack={() => setPaso(3)} onConectado={onConectado} />}
        </div>
      </div>
    </div>
  )
}
