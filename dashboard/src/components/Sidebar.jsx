import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Clock, Settings,
  Users, CreditCard, LogOut, Bot, ChevronRight, Boxes
} from 'lucide-react'

const NAV = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Resumen',         exact: true },
  { to: '/admin/bots',     icon: Boxes,           label: 'Mis Bots' },
  { to: '/admin/reservas', icon: CalendarCheck,   label: 'Reservas' },
  { to: '/admin/pagos',    icon: Clock,           label: 'Pagos Pendientes' },
  { to: '/admin/clientes', icon: Users,           label: 'Clientes' },
  { to: '/admin/config',   icon: Settings,        label: 'Configuración' },
  { to: '/admin/planes',   icon: CreditCard,      label: 'Planes' },
];

export function Sidebar({ onLogout }) {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-100 leading-tight">Gespro Asist</p>
            <p className="text-xs text-gray-500">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
