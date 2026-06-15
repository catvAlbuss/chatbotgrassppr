import { useEffect, useState } from 'react'
import { Check, Zap, Shield, Crown, MessageCircle, Star, BadgeCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const CONTACT = import.meta.env.VITE_CONTACT_PHONE || '51959422042'

const PLANES_INFO = [
  {
    id: 'mensual',
    icon: Zap,
    nombre: 'Mensual',
    precio: 'S/. 50',
    periodo: '/ mes',
    subtitulo: 'Ideal para empezar',
    color: 'blue',
    popular: false,
    features: [
      '1 bot de WhatsApp activo',
      'Hasta 300 reservas/mes',
      'Panel de administración',
      'Aprobación de pagos desde UI',
      'Soporte por WhatsApp',
      'Actualizaciones incluidas',
    ],
    cta: 'Contratar mensual',
    href: `https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20contratar%20el%20plan%20mensual%20de%20Gespro%20Asist%20(S%2F.%2050%2Fmes)`,
  },
  {
    id: 'anual',
    icon: Shield,
    nombre: 'Anual',
    precio: 'S/. 500',
    periodo: '/ año',
    subtitulo: 'Ahorra S/. 100 al año',
    color: 'brand',
    popular: true,
    badge: 'Más popular',
    features: [
      'Todo lo del plan Mensual',
      'Reservas ilimitadas',
      'Reportes y estadísticas',
      'Configura tu propio número WA',
      'Integración con RENIEC',
      'Soporte prioritario 24/7',
      'Backup automático de datos',
    ],
    cta: 'Contratar anual',
    href: `https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20contratar%20el%20plan%20anual%20de%20Gespro%20Asist%20(S%2F.%20500%2Fa%C3%B1o)`,
  },
  {
    id: 'lifetime',
    icon: Crown,
    nombre: 'De por Vida',
    precio: 'Empresarial',
    periodo: '',
    subtitulo: 'Solución corporativa a medida',
    color: 'amber',
    popular: false,
    features: [
      'Bots ilimitados',
      'Múltiples sedes y canchas',
      'Personalización completa',
      'Integración con tu sistema',
      'Capacitación al equipo',
      'Soporte dedicado',
      'SLA garantizado',
    ],
    cta: 'Solicitar asesoría',
    href: `https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20plan%20empresarial%20de%20Gespro%20Asist`,
  },
]

const COLOR_MAP = {
  blue: {
    icon: 'bg-blue-500/10 text-blue-400',
    ring: 'ring-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    check: 'text-blue-400',
    badge: '',
    activeBorder: 'border-blue-500/50',
  },
  brand: {
    icon: 'bg-brand-500/10 text-brand-400',
    ring: 'ring-brand-500/40',
    btn: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25',
    check: 'text-brand-400',
    badge: 'bg-brand-500 text-white',
    activeBorder: 'border-brand-500/50',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-400',
    ring: 'ring-amber-500/20',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    check: 'text-amber-400',
    badge: '',
    activeBorder: 'border-amber-500/50',
  },
}

export function Planes() {
  const { esCliente, user } = useAuth()
  const [bots, setBots]     = useState([])
  const [loading, setLoading] = useState(esCliente)

  // Para clientes: cargar sus bots y saber qué plan tienen
  useEffect(() => {
    if (!esCliente) return
    api.bots()
      .then(setBots)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [esCliente])

  const planActual = bots[0]?.plan || null
  const venceEn   = bots[0]?.plan_expira || null

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-500/20">
          <Star size={13} /> Gespro Asist · Planes y Precios
        </div>
        <h1 className="text-3xl font-bold text-gray-100">
          {esCliente ? 'Tu plan y opciones de upgrade' : 'Elige el plan que mejor se adapta'}
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Automatiza tus reservas y pagos con WhatsApp. Sin complicaciones, sin hardware adicional.
        </p>
      </div>

      {/* Card del plan actual — solo para clientes con bots */}
      {esCliente && !loading && planActual && (
        <div className={`card border-2 ${COLOR_MAP[PLANES_INFO.find(p => p.id === planActual)?.color || 'blue']?.activeBorder || 'border-brand-500/30'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BadgeCheck size={22} className="text-brand-400" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Tu plan actual</p>
                <p className="font-bold text-gray-100 text-lg capitalize">{planActual}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {bots[0]?.nombre && (
                <div>
                  <p className="text-xs text-gray-500">Bot</p>
                  <p className="text-gray-200 font-medium">{bots[0].nombre}</p>
                </div>
              )}
              {bots[0]?.numero_display && (
                <div>
                  <p className="text-xs text-gray-500">Número WhatsApp</p>
                  <p className="text-gray-200 font-mono">{bots[0].numero_display}</p>
                </div>
              )}
              {venceEn && (
                <div>
                  <p className="text-xs text-gray-500">Vence el</p>
                  <p className="text-amber-400 font-medium">{new Date(venceEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-4 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Loader2 size={15} className="animate-spin" /> Cargando tu plan...
        </div>
      )}

      {/* Cards de planes */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {PLANES_INFO.map(plan => {
          const c = COLOR_MAP[plan.color]
          const Icon = plan.icon
          const esPlanActual = planActual === plan.id
          return (
            <div
              key={plan.id}
              className={`relative bg-gray-900 border rounded-2xl p-6 ring-1 transition-all ${
                esPlanActual
                  ? `${c.activeBorder} border-2 ring-0 shadow-lg`
                  : `border-gray-800 ${c.ring} ${plan.popular ? 'scale-105 shadow-2xl shadow-brand-500/10' : ''}`
              }`}
            >
              {/* Badge plan actual */}
              {esPlanActual && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                  <BadgeCheck size={11} /> Tu plan actual
                </div>
              )}

              {/* Badge popular */}
              {plan.popular && !esPlanActual && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${c.badge} text-xs font-semibold px-4 py-1 rounded-full`}>
                  {plan.badge}
                </div>
              )}

              {/* Icon + nombre */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-100">{plan.nombre}</p>
                  <p className="text-xs text-gray-500">{plan.subtitulo}</p>
                </div>
              </div>

              {/* Precio */}
              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-gray-100">{plan.precio}</span>
                  {plan.periodo && <span className="text-gray-500 text-sm mb-1">{plan.periodo}</span>}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <Check size={15} className={`mt-0.5 flex-shrink-0 ${c.check}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {esPlanActual ? (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm bg-gray-800 text-gray-400 cursor-default">
                  <BadgeCheck size={15} /> Plan activo
                </div>
              ) : (
                <a
                  href={plan.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${c.btn}`}
                >
                  {plan.id === 'lifetime' && <MessageCircle size={16} />}
                  {esCliente && planActual ? 'Actualizar a ' + plan.nombre : plan.cta}
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="card text-center py-8">
        <MessageCircle size={28} className="mx-auto text-brand-400 mb-3" />
        <p className="text-gray-300 font-medium mb-1">¿Tienes preguntas?</p>
        <p className="text-gray-500 text-sm mb-4">
          Conversamos por WhatsApp y encontramos la solución ideal para tu negocio.
        </p>
        <a
          href={`https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20saber%20más%20sobre%20Gespro%20Asist`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <MessageCircle size={15} /> Consultar por WhatsApp
        </a>
      </div>
    </div>
  )
}
