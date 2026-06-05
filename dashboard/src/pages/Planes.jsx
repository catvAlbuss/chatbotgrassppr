import { Check, Zap, Shield, Crown, MessageCircle, Star } from 'lucide-react'

const PLANES = [
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
    href: 'https://wa.me/51999999999?text=Hola%2C%20quiero%20contratar%20el%20plan%20mensual%20de%20Gespro%20Asist%20(S%2F.%2050%2Fmes)',
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
      'Configuración avanzada',
      'Integración con RENIEC',
      'Soporte prioritario 24/7',
      'Backup automático de datos',
    ],
    cta: 'Contratar anual',
    href: 'https://wa.me/51999999999?text=Hola%2C%20quiero%20contratar%20el%20plan%20anual%20de%20Gespro%20Asist%20(S%2F.%20500%2Fa%C3%B1o)',
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
    href: 'https://wa.me/51999999999?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20plan%20empresarial%20de%20Gespro%20Asist',
  },
]

const COLOR_MAP = {
  blue: {
    icon: 'bg-blue-500/10 text-blue-400',
    ring: 'ring-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    check: 'text-blue-400',
    badge: '',
  },
  brand: {
    icon: 'bg-brand-500/10 text-brand-400',
    ring: 'ring-brand-500/40',
    btn: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25',
    check: 'text-brand-400',
    badge: 'bg-brand-500 text-white',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-400',
    ring: 'ring-amber-500/20',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    check: 'text-amber-400',
    badge: '',
  },
}

export function Planes() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-500/20">
          <Star size={13} /> Gespro Asist · Planes y Precios
        </div>
        <h1 className="text-3xl font-bold text-gray-100">
          Elige el plan que mejor se adapta
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Automatiza tus reservas y pagos con WhatsApp. Sin complicaciones, sin hardware adicional.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {PLANES.map(plan => {
          const c = COLOR_MAP[plan.color]
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              className={`relative bg-gray-900 border border-gray-800 rounded-2xl p-6 ring-1 ${c.ring} ${plan.popular ? 'scale-105 shadow-2xl shadow-brand-500/10' : ''} transition-transform`}
            >
              {/* Badge popular */}
              {plan.popular && (
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
              <a
                href={plan.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${c.btn}`}
              >
                {plan.id === 'lifetime' && <MessageCircle size={16} />}
                {plan.cta}
              </a>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div className="card text-center py-8">
        <MessageCircle size={28} className="mx-auto text-brand-400 mb-3" />
        <p className="text-gray-300 font-medium mb-1">¿Tienes preguntas?</p>
        <p className="text-gray-500 text-sm mb-4">
          Conversamos por WhatsApp y encontramos la solución ideal para tu negocio.
        </p>
        <a
          href="https://wa.me/51999999999?text=Hola%2C%20quiero%20saber%20más%20sobre%20Gespro%20Asist"
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
