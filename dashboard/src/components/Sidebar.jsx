import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Clock, Settings,
  Users, CreditCard, LogOut, Bot, ChevronRight, Boxes,
  UserCog, Shield, BadgeCheck, Headphones, SlidersHorizontal
} from 'lucide-react'
import { useAuth, ROL_LABELS } from '../context/AuthContext.jsx'

// Nav por rol — cada item tiene minNivel requerido
const NAV_ITEMS = [
  // Clientes y superiores (nivel 1+)
  { to: '/admin/bots',      icon: Boxes,              label: 'Mis Bots',         minNivel: 1 },
  { to: '/admin/mi-config', icon: SlidersHorizontal,  label: 'Mi Configuración', minNivel: 1 },
  { to: '/admin/planes',    icon: CreditCard,          label: 'Mi Plan',          minNivel: 1 },
  // Admin Bot y superiores (nivel 2+)
  { to: '/admin/resumen',  icon: LayoutDashboard, label: 'Resumen',          minNivel: 2 },
  { to: '/admin/reservas', icon: CalendarCheck,   label: 'Reservas',         minNivel: 2 },
  { to: '/admin/pagos',    icon: Clock,           label: 'Pagos Pendientes', minNivel: 2 },
  { to: '/admin/usuarios', icon: UserCog,         label: 'Usuarios',         minNivel: 2 },
  // Administrador y superiores (nivel 3+)
  { to: '/admin/clientes', icon: Users,           label: 'Clientes',         minNivel: 3 },
  { to: '/admin/config',   icon: Settings,        label: 'Config Global',    minNivel: 3 },
]

const ROL_ICON = {
  root:              Shield,
  administrador:     BadgeCheck,
  administrador_bot: Headphones,
  cliente:           Bot,
  admin:             Shield,
  operador:          Headphones,
  consulta:          Bot,
}

export function Sidebar({ onLogout }) {
  const { user, nivel } = useAuth()
  const items = NAV_ITEMS.filter(n => nivel >= n.minNivel)
  const rolInfo = ROL_LABELS[user?.rol] || ROL_LABELS.cliente
  const RolIcon = ROL_ICON[user?.rol] || Bot

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md shadow-brand-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-100 leading-tight">Gespro Asist</p>
            <p className="text-xs text-gray-500">Plataforma de Bots</p>
          </div>
        </div>
      </div>

      {/* Perfil del usuario */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
            <RolIcon size={14} className="text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.usuario || '—'}</p>
            <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium ${rolInfo.color}`}>
              {rolInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(({ to, icon: Icon, label, minNivel }) => {
          // Separador visual entre grupos
          const esPrimerDeGrupo = NAV_ITEMS.find(n => n.minNivel === minNivel) === NAV_ITEMS.find(n => n.to === to && n.minNivel === minNivel)
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <div className="px-3 py-2 text-xs text-gray-600">
          v3.0 Enterprise
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
