import { useEffect, useRef, useState } from 'react'
import { X, Check, Loader2, AlertCircle, Wifi } from 'lucide-react'
import { api } from '../lib/api.js'

const FACEBOOK_APP_ID = '2327956031002082'

// ─── PASO 1: Requisitos ──────────────────────────────────────
function Paso1({ onNext }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mx-auto mb-3">📱</div>
        <h3 className="font-bold text-gray-100 text-lg">Antes de empezar</h3>
        <p className="text-gray-400 text-sm mt-1">Solo necesitas tener tu cuenta Meta Business lista</p>
      </div>

      <div className="space-y-3">
        {[
          { icon: '✅', title: 'Cuenta de Facebook',        desc: 'La que usas para acceder a Meta Business' },
          { icon: '✅', title: 'WhatsApp Business Account', desc: 'Con al menos un número de teléfono verificado' },
          { icon: '✅', title: 'Número activo',             desc: 'El número debe estar verificado en WhatsApp Manager' },
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
        ¿No tienes cuenta Meta Business? Es gratis — créala en{' '}
        <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="underline font-medium">business.facebook.com</a>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        Ya tengo todo listo → Continuar
      </button>
    </div>
  )
}

// ─── PASO 2: Conectar con Facebook (Embedded Signup) ────────
function PasoFacebook({ bot, onConectado, onBack }) {
  const [estado, setEstado]     = useState('idle') // idle | esperando | verificando
  const [error, setError]       = useState(null)
  const [resultado, setResultado] = useState(null)
  const pendingData             = useRef({})

  // Cargar FB SDK
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

  // Escuchar el mensaje de Embedded Signup con phone_number_id y waba_id
  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== 'https://www.facebook.com') return
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'WA_EMBEDDED_SIGNUP' && msg.event === 'FINISH') {
          pendingData.current = msg.data // { phone_number_id, waba_id }
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

  // ── Pantalla de éxito ──────────────────────────────────────
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
            <p className="text-xs text-gray-500">
              Calidad de la línea: <span className="text-brand-400 font-medium">{resultado.calidad}</span>
            </p>
          )}
        </div>
        <button onClick={onConectado} className="btn-primary w-full">
          ✅ Ir a mis bots
        </button>
      </div>
    )
  }

  // ── Pantalla del botón ─────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-3">🔗</div>
        <h3 className="font-bold text-gray-100 text-lg">Conectar WhatsApp Business</h3>
        <p className="text-gray-400 text-sm mt-1">
          Haz clic en el botón y sigue los pasos de Meta.<br />
          No necesitas copiar ningún código.
        </p>
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
        <button onClick={onBack} disabled={estado !== 'idle'} className="btn-secondary flex-1">
          ← Atrás
        </button>
        <button
          onClick={conectar}
          disabled={estado !== 'idle'}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {estado === 'esperando' ? (
            <><Loader2 size={16} className="animate-spin" /> Esperando...</>
          ) : estado === 'verificando' ? (
            <><Loader2 size={16} className="animate-spin" /> Verificando...</>
          ) : (
            <><span className="text-xl font-bold leading-none">f</span> Conectar con Facebook</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export function ConectarWhatsApp({ bot, onClose, onConectado }) {
  const [paso, setPaso] = useState(1)

  const PASOS_LABEL = ['Requisitos', 'Conectar']

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 pt-5 pb-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-100">Conectar WhatsApp</h2>
              <p className="text-xs text-gray-500 mt-0.5">{bot.nombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
              <X size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1">
            {PASOS_LABEL.map((label, i) => {
              const n = i + 1
              return (
                <div key={n} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      paso > n  ? 'bg-brand-500 text-white'
                      : paso === n ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500'
                      : 'bg-gray-800 text-gray-600'
                    }`}>
                      {paso > n ? <Check size={12} /> : n}
                    </div>
                    <span className={`text-xs hidden sm:block ${paso === n ? 'text-brand-400' : 'text-gray-600'}`}>
                      {label}
                    </span>
                  </div>
                  {n < PASOS_LABEL.length && (
                    <div className={`h-0.5 flex-1 rounded mb-4 transition-colors ${paso > n ? 'bg-brand-500' : 'bg-gray-800'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {paso === 1 && <Paso1 onNext={() => setPaso(2)} />}
          {paso === 2 && (
            <PasoFacebook
              bot={bot}
              onBack={() => setPaso(1)}
              onConectado={onConectado}
            />
          )}
        </div>
      </div>
    </div>
  )
}
