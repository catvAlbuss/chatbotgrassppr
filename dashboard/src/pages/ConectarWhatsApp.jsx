import { useEffect, useRef, useState } from 'react'
import { X, Check, Loader2, AlertCircle, Wifi, Smartphone, ArrowRight, RefreshCw, Info, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api.js'

const FACEBOOK_APP_ID = '2327956031002082'

// ─── SELECTOR DE MÉTODO ──────────────────────────────────────
function SelectorMetodo({ onSelect }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl mx-auto mb-3">
          📱
        </div>
        <h3 className="font-bold text-gray-100 text-lg">Conectar número de WhatsApp</h3>
        <p className="text-gray-400 text-sm mt-1">Elige cómo quieres conectar tu número</p>
      </div>

      <div className="space-y-3">
        {/* Método A: Embedded Signup (recomendado) */}
        <button
          onClick={() => onSelect('signup')}
          className="w-full flex items-start gap-4 p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 hover:bg-brand-500/10 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-xl">
            🔗
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-gray-100 text-sm">Conectar con Facebook</p>
              <span className="text-xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded font-medium">Recomendado</span>
            </div>
            <p className="text-xs text-gray-500 leading-snug">
              Inicia sesión con tu cuenta de Facebook y selecciona tu número. El proceso es automático.
            </p>
            <p className="text-xs text-amber-400/80 mt-1.5">
              ⚠️ Requiere que el número NO esté activo en WhatsApp regular
            </p>
          </div>
          <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-400 mt-1 flex-shrink-0 transition-colors" />
        </button>

        {/* Método B: Registro manual / Reclamo */}
        <button
          onClick={() => onSelect('reclamo')}
          className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-700 hover:border-gray-600 bg-gray-800/50 hover:bg-gray-800 text-left transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 text-xl">
            📋
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-100 text-sm mb-0.5">Ya registré mi número en Meta</p>
            <p className="text-xs text-gray-500 leading-snug">
              Si ya agregaste tu número en Meta Business Manager y lo verificaste por SMS, conéctalo aquí.
            </p>
            <p className="text-xs text-blue-400/80 mt-1.5">
              ✓ Funciona aunque el número ya estaba en WhatsApp (después de migrarlo)
            </p>
          </div>
          <ArrowRight size={16} className="text-gray-600 group-hover:text-gray-300 mt-1 flex-shrink-0 transition-colors" />
        </button>
      </div>
    </div>
  )
}

// ─── FLUJO A: Embedded Signup ────────────────────────────────
function FlujoPasos({ bot, onConectado, onBack }) {
  const [paso, setPaso]         = useState(1)
  const [estado, setEstado]     = useState('idle')
  const [error, setError]       = useState(null)
  const [resultado, setResultado] = useState(null)
  const pendingData             = useRef({})

  useEffect(() => {
    function initFB() {
      window.FB.init({ appId: FACEBOOK_APP_ID, version: 'v19.0', xfbml: false })
    }
    if (window.FB) { initFB(); return }
    window.fbAsyncInit = initFB
    if (!document.getElementById('fb-sdk')) {
      const s = document.createElement('script')
      s.id  = 'fb-sdk'
      s.src = 'https://connect.facebook.net/es_LA/sdk.js'
      s.async = true
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== 'https://www.facebook.com') return
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'WA_EMBEDDED_SIGNUP' && msg.event === 'FINISH') {
          pendingData.current = msg.data
        }
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function conectar() {
    if (!window.FB) {
      setError('El SDK de Facebook no está cargado. Recarga la página e intenta de nuevo.')
      return
    }
    setEstado('esperando')
    setError(null)
    pendingData.current = {}

    window.FB.login(async function (response) {
      if (!response.authResponse) {
        setEstado('idle')
        return
      }
      setEstado('verificando')
      try {
        const data = await api.embeddedSignup(bot.id, {
          access_token:    response.authResponse.accessToken,
          phone_number_id: pendingData.current.phone_number_id,
          waba_id:         pendingData.current.waba_id,
        })
        setResultado(data)
      } catch (err) {
        setError(err.message)
        setEstado('idle')
      }
    }, {
      scope:  'business_management,whatsapp_business_management,whatsapp_business_messaging',
      extras: { feature: 'whatsapp_embedded_signup', sessionInfoVersion: 2 },
    })
  }

  if (resultado) {
    return <PantallaExito resultado={resultado} onConectado={onConectado} />
  }

  if (paso === 1) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
          <h3 className="font-bold text-gray-100 text-lg">Antes de empezar</h3>
          <p className="text-gray-400 text-sm mt-1">Verifica que tienes todo listo</p>
        </div>
        <div className="space-y-3">
          {[
            { icon: '✅', title: 'Cuenta de Facebook',        desc: 'Con acceso a Meta Business Manager' },
            { icon: '✅', title: 'WhatsApp Business Account', desc: 'Al menos un número verificado en tu WABA' },
            { icon: '⚠️', title: 'Número libre de WhatsApp',  desc: 'El número NO debe estar activo en WhatsApp regular. Si lo está, usa la otra opción.' },
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
        <div className="flex gap-3">
          <button onClick={onBack} className="btn-secondary flex-1">← Atrás</button>
          <button onClick={() => setPaso(2)} className="btn-primary flex-1">Continuar →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl mx-auto mb-3">🔗</div>
        <h3 className="font-bold text-gray-100 text-lg">Conectar con Facebook</h3>
        <p className="text-gray-400 text-sm mt-1">Haz clic en el botón y sigue los pasos de Meta</p>
      </div>
      <div className="space-y-2">
        {[
          'Se abre una ventana de Meta/Facebook',
          'Seleccionas tu cuenta de WhatsApp Business',
          'Eliges tu número de teléfono',
          '¡Listo! La conexión se hace automáticamente',
        ].map((step, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700 text-sm text-gray-300">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 text-sm text-red-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => setPaso(1)} disabled={estado !== 'idle'} className="btn-secondary flex-1">← Atrás</button>
        <button
          onClick={conectar}
          disabled={estado !== 'idle'}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 transition-colors"
        >
          {estado === 'esperando' ? <><Loader2 size={16} className="animate-spin" /> Esperando...</>
           : estado === 'verificando' ? <><Loader2 size={16} className="animate-spin" /> Verificando...</>
           : <><span className="text-xl font-bold leading-none">f</span> Conectar con Facebook</>}
        </button>
      </div>
    </div>
  )
}

// ─── FLUJO B: Registro manual (Reclamo) ──────────────────────
function FlujoReclamo({ bot, onConectado, onBack }) {
  const [paso, setPaso]       = useState(1) // 1: instrucciones | 2: verificar
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [resultado, setResultado] = useState(null)

  async function verificar() {
    if (!phone.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.verificarRegistro(bot.id, { phone: phone.trim() })
      setResultado(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (resultado) {
    return <PantallaExito resultado={resultado} onConectado={onConectado} />
  }

  // ── Paso 1: Instrucciones ──────────────────────────────────
  if (paso === 1) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="font-bold text-gray-100 text-lg text-center mb-1">
            {'{'}¿Tu número ya está en WhatsApp?{'}'}
          </h3>
          <h3 className="font-bold text-gray-100 text-lg text-center">Sigue estos pasos primero</h3>
          <p className="text-gray-400 text-sm text-center mt-1">
            Meta exige que el número no esté activo en WhatsApp regular para usarlo en la API.
          </p>
        </div>

        {/* Pasos secuenciales */}
        <div className="space-y-3">
          <div className="flex gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
            <div>
              <p className="text-sm font-semibold text-gray-200">Elimina WhatsApp de ese número</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                En tu teléfono: <span className="text-gray-300 font-medium">WhatsApp → Ajustes → Cuenta → Eliminar mi cuenta</span>
                <br />Esto desvincula el número de WhatsApp. <span className="text-amber-400">Puedes hacer backup antes.</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
            <div>
              <p className="text-sm font-semibold text-gray-200">Agrega el número en Meta Business Manager</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Ve a <span className="text-blue-400">business.facebook.com</span> → WhatsApp Manager →
                Números de teléfono → <span className="text-gray-300 font-medium">Agregar número</span>
                <br />Ingresa el número y verifica el código SMS que recibes.
              </p>
              <a
                href="https://business.facebook.com/wa/manage/phone-numbers/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Abrir Meta WhatsApp Manager →
              </a>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
            <div>
              <p className="text-sm font-semibold text-gray-200">Vuelve aquí y verifica</p>
              <p className="text-xs text-gray-500 mt-1">
                Una vez verificado en Meta, haz clic en "Ya lo verifiqué" y el sistema lo detecta automáticamente.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2 text-xs text-blue-300">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            El número puede tardar hasta 3 minutos en liberarse de WhatsApp. Si aún no funciona, espera y vuelve a intentarlo.
          </span>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="btn-secondary flex-1">← Atrás</button>
          <button onClick={() => setPaso(2)} className="btn-primary flex-1">Ya lo hice →</button>
        </div>
      </div>
    )
  }

  // ── Paso 2: Verificar número ───────────────────────────────
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-2xl mx-auto mb-3">
          🔍
        </div>
        <h3 className="font-bold text-gray-100 text-lg">Verificar número</h3>
        <p className="text-gray-400 text-sm mt-1">
          Ingresa el número que acabas de registrar en Meta. Tu sistema lo detectará automáticamente.
        </p>
      </div>

      <div>
        <label className="label">Número de teléfono (con código de país)</label>
        <input
          className="input text-lg tracking-wider font-mono"
          type="tel"
          placeholder="+51 902 744 946"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verificar()}
        />
        <p className="text-xs text-gray-600 mt-1.5">
          Incluye el código de país. Ejemplo: +51 para Perú, +1 para EEUU
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-2">
          <div className="flex gap-2 text-sm text-red-300">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <p className="text-xs text-gray-500 pl-6">
            Si acabas de verificar, espera 1-2 minutos y vuelve a intentar. Si el error persiste, contacta al administrador.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => { setPaso(1); setError(null) }} className="btn-secondary flex-1">
          ← Instrucciones
        </button>
        <button
          onClick={verificar}
          disabled={loading || !phone.trim()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Detectando...</>
            : <><RefreshCw size={16} /> Verificar ahora</>
          }
        </button>
      </div>

      <p className="text-center text-xs text-gray-600">
        El sistema consulta tu cuenta de Meta en tiempo real
      </p>
    </div>
  )
}

// ─── PANTALLA DE ÉXITO ───────────────────────────────────────
function PantallaExito({ resultado, onConectado }) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center text-4xl mx-auto">
        🎉
      </div>
      <div>
        <h3 className="font-bold text-gray-100 text-xl">¡Conexión exitosa!</h3>
        <p className="text-gray-400 text-sm mt-1">Tu WhatsApp está conectado y el bot ya está activo</p>
      </div>
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-left space-y-2">
        <div className="flex items-center gap-2 text-brand-300">
          <Wifi size={16} />
          <span className="font-semibold text-sm">Número conectado</span>
        </div>
        <p className="text-gray-100 font-mono text-lg font-bold">{resultado.numero}</p>
        {resultado.nombre && <p className="text-gray-400 text-sm">{resultado.nombre}</p>}
        {resultado.calidad && (
          <p className="text-xs text-gray-500">
            Calidad de línea: <span className="text-brand-400 font-medium">{resultado.calidad}</span>
          </p>
        )}
      </div>
      <button onClick={onConectado} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <CheckCircle2 size={18} /> Ir a mis bots
      </button>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export function ConectarWhatsApp({ bot, onClose, onConectado }) {
  const [metodo, setMetodo] = useState(null) // null | 'signup' | 'reclamo'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 pt-5 pb-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-100">Conectar WhatsApp</h2>
              <p className="text-xs text-gray-500 mt-0.5">{bot.nombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {!metodo && (
            <SelectorMetodo onSelect={setMetodo} />
          )}
          {metodo === 'signup' && (
            <FlujoPasos
              bot={bot}
              onBack={() => setMetodo(null)}
              onConectado={onConectado}
            />
          )}
          {metodo === 'reclamo' && (
            <FlujoReclamo
              bot={bot}
              onBack={() => setMetodo(null)}
              onConectado={onConectado}
            />
          )}
        </div>
      </div>
    </div>
  )
}
