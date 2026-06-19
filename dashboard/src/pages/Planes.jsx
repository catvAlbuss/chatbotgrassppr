import { Check, Zap, Shield, Crown, MessageCircle, Star, BadgeCheck, CreditCard, Calendar, Boxes } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const CONTACT = import.meta.env.VITE_CONTACT_PHONE || '51959422042'

const PLANES_INFO = [
  {
    id: 'demo',
    icon: BadgeCheck,
    nombre: 'Demo',
    precio: 'S/. 0',
    periodo: '/ 5 días',
    subtitulo: 'Prueba sin compromiso',
    color: 'gray',
    maxBots: 1,
    features: [
      '1 bot asignado (solo lectura)',
      'Vista de configuración básica',
      'Panel de administración',
      'Sin número de WhatsApp propio',
    ],
    cta: 'Plan de prueba',
    href: null,
  },
  {
    id: 'mensual',
    icon: Zap,
    nombre: 'Mensual',
    precio: 'S/. 50',
    periodo: '/ mes',
    subtitulo: 'Ideal para empezar',
    color: 'blue',
    maxBots: 1,
    features: [
      '1 bot de WhatsApp activo',
      'Edición completa de configuración',
      'Hasta 300 reservas/mes',
      'Panel de administración',
      'Aprobación de pagos desde UI',
      'Soporte por WhatsApp',
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
    maxBots: 2,
    popular: true,
    badge: 'Más popular',
    features: [
      'Hasta 2 bots de WhatsApp',
      'Edición completa de configuración',
      'Reservas ilimitadas',
      'Conecta tu propio número WA',
      'Reportes y estadísticas',
      'Integración con RENIEC',
      'Soporte prioritario 24/7',
    ],
    cta: 'Contratar anual',
    href: `https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20contratar%20el%20plan%20anual%20de%20Gespro%20Asist%20(S%2F.%20500%2Fa%C3%B1o)`,
  },
  {
    id: 'lifetime',
    icon: Crown,
    nombre: 'Lifetime',
    precio: 'Empresarial',
    periodo: '',
    subtitulo: 'Solución corporativa a medida',
    color: 'amber',
    maxBots: null,
    features: [
      'Bots ilimitados',
      'Sin fecha de vencimiento',
      'Múltiples sedes y sucursales',
      'Personalización completa',
      'Integración con tu sistema',
      'Capacitación al equipo',
      'Soporte dedicado + SLA',
    ],
    cta: 'Solicitar asesoría',
    href: `https://wa.me/${CONTACT}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20plan%20empresarial%20de%20Gespro%20Asist`,
  },
]

const COLOR_MAP = {
  gray: {
    icon: 'bg-gray-700 text-gray-400',
    ring: 'ring-gray-700',
    btn: 'bg-gray-700 text-gray-400 cursor-default',
    check: 'text-gray-500',
    activeBorder: 'border-gray-600',
  },
  blue: {
    icon: 'bg-blue-500/10 text-blue-400',
    ring: 'ring-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    check: 'text-blue-400',
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
    activeBorder: 'border-amber-500/50',
  },
}

export function Planes() {
  const { esCliente, plan, planExpira } = useAuth()

  // Calcular días restantes
  let diasRestantes = null
  let venceLabel    = null
  if (planExpira && plan !== 'lifetime') {
    const hoy    = new Date()
    const expira = new Date(planExpira + 'T12:00:00')
    diasRestantes = Math.ceil((expira - hoy) / (1000 * 60 * 60 * 24))
    venceLabel = expira.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const infoActual = PLANES_INFO.find(p => p.id === plan) || null

  return (
    <div className="space-y-8 w-full">
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

      {/* Card resumen plan actual — solo para clientes */}
      {esCliente && infoActual && (
        <div className={`card border-2 ${COLOR_MAP[infoActual.color]?.activeBorder || 'border-brand-500/30'}`}>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${COLOR_MAP[infoActual.color].icon}`}>
                <CreditCard size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Tu plan actual</p>
                <p className="font-bold text-gray-100 text-lg">{infoActual.nombre}</p>
                <p className="text-xs text-gray-500">{infoActual.subtitulo}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              {infoActual.maxBots != null && (
                <div className="flex items-center gap-2">
                  <Boxes size={15} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Bots incluidos</p>
                    <p className="text-gray-200 font-medium">{infoActual.maxBots === 999 ? 'Ilimitados' : infoActual.maxBots}</p>
                  </div>
                </div>
              )}
              {venceLabel && (
                <div className="flex items-center gap-2">
                  <Calendar size={15} className={diasRestantes <= 7 ? 'text-amber-400' : 'text-gray-500'} />
                  <div>
                    <p className="text-xs text-gray-500">Vence el</p>
                    <p className={`font-medium ${diasRestantes <= 7 ? 'text-amber-400' : 'text-gray-200'}`}>
                      {venceLabel}
                      {diasRestantes !== null && (
                        <span className="ml-1 text-xs opacity-70">
                          {diasRestantes <= 0 ? '(vencido)' : `(${diasRestantes}d)`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {plan === 'lifetime' && (
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-amber-400" />
                  <div>
                    <p className="text-xs text-gray-500">Vigencia</p>
                    <p className="text-amber-400 font-medium">Sin vencimiento</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid md:grid-cols-4 gap-6 items-start">
        {PLANES_INFO.map(p => {
          const c          = COLOR_MAP[p.color] || COLOR_MAP.blue
          const Icon       = p.icon
          const esPlanActual = plan === p.id

          return (
            <div
              key={p.id}
              className={`relative bg-gray-900 border rounded-2xl p-6 ring-1 transition-all ${
                esPlanActual
                  ? `${c.activeBorder} border-2 ring-0 shadow-lg`
                  : `border-gray-800 ${c.ring} ${p.popular && !esPlanActual ? 'md:scale-105 shadow-2xl shadow-brand-500/10' : ''}`
              }`}
            >
              {/* Badge plan actual */}
              {esPlanActual && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <BadgeCheck size={11} /> Tu plan actual
                </div>
              )}

              {/* Badge popular */}
              {p.popular && !esPlanActual && c.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${c.badge} text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap`}>
                  {p.badge}
                </div>
              )}

              {/* Icon + nombre */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-100">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.subtitulo}</p>
                </div>
              </div>

              {/* Precio + bots */}
              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-gray-100">{p.precio}</span>
                  {p.periodo && <span className="text-gray-500 text-sm mb-1">{p.periodo}</span>}
                </div>
                {p.maxBots != null && (
                  <p className="text-xs text-gray-600 mt-1">
                    {p.maxBots === 999 ? 'Bots ilimitados' : `Hasta ${p.maxBots} bot${p.maxBots > 1 ? 's' : ''}`}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-7">
                {p.features.map(f => (
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
              ) : p.href ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${c.btn}`}
                >
                  {p.id === 'lifetime' && <MessageCircle size={16} />}
                  {esCliente && plan ? `Actualizar a ${p.nombre}` : p.cta}
                </a>
              ) : (
                <div className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm ${c.btn}`}>
                  {p.cta}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="card text-center py-8">
        <MessageCircle size={28} className="mx-auto text-brand-400 mb-3" />
        <p className="text-gray-300 font-medium mb-1">¿Tienes preguntas o quieres renovar?</p>
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
