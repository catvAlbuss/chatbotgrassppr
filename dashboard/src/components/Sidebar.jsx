import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Clock, Users, CreditCard, LogOut, Bot,
  ChevronRight, Boxes, Building2, Shield, BadgeCheck, Headphones,
  SlidersHorizontal, PanelLeftClose, PanelLeftOpen, X, Phone
} from 'lucide-react'
import { useAuth, ROL_LABELS } from '../context/AuthContext.jsx'

const NAV_SECTIONS = [
  { label: 'Sistema del bot', items: [
    { to: '/admin/resumen', icon: LayoutDashboard, label: 'Resumen', minNivel: 2 },
    { to: '/admin/reservas', icon: CalendarCheck, label: 'Reservas', minNivel: 2 },
    { to: '/admin/pagos', icon: Clock, label: 'Pagos pendientes', minNivel: 2 },
    { to: '/admin/contactos', icon: Users, label: 'Contactos del bot', minNivel: 2 },
  ]},
  { label: 'Administración', items: [
    { to: '/admin/clientes-sistema', icon: Building2, label: 'Clientes y Accesos', minNivel: 2 },
    { to: '/admin/bots',    icon: Boxes,    label: 'Bots',               minNivel: 1 },
    { to: '/admin/numeros', icon: Phone,    label: 'Números WhatsApp',   minNivel: 2 },
    { to: '/admin/planes',  icon: CreditCard, label: 'Planes',           minNivel: 1 },
  ]}
]

const ROL_ICON = {
  root: Shield, administrador: BadgeCheck, administrador_bot: Headphones,
  cliente: Bot, admin: Shield, operador: Headphones, consulta: Bot,
}

export function Sidebar({ onLogout, collapsed, mobileOpen, onToggle, onClose }) {
  const { user, nivel } = useAuth()
  const sections = NAV_SECTIONS
    .map(section => ({ ...section, items: section.items.filter(item => nivel >= item.minNivel) }))
    .filter(section => section.items.length)
  const rolInfo = ROL_LABELS[user?.rol] || ROL_LABELS.cliente
  const RolIcon = ROL_ICON[user?.rol] || Bot

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex min-h-screen w-72 flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200 md:relative md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`flex items-center border-b border-gray-800 py-5 ${collapsed ? 'md:justify-center md:px-3' : 'justify-between px-5'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/20"><Bot size={20} className="text-white" /></div>
          <div className={collapsed ? 'md:hidden' : ''}><p className="font-semibold leading-tight text-gray-100">Gespro Asist</p><p className="text-xs text-gray-500">Plataforma de Bots</p></div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-200 md:hidden" aria-label="Cerrar menú"><X size={19} /></button>
      </div>

      <div className={`border-b border-gray-800 py-4 ${collapsed ? 'md:px-3' : 'px-5'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800"><RolIcon size={14} className="text-gray-400" /></div>
          <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}><p className="truncate text-sm font-medium text-gray-200">{user?.usuario || '—'}</p><span className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${rolInfo.color}`}>{rolInfo.label}</span></div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, index) => (
          <div key={section.label} className={index ? 'mt-5' : ''}>
            <p className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600 ${collapsed ? 'md:hidden' : ''}`}>{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={onClose} title={collapsed ? label : undefined}
                  className={({ isActive }) => `group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'md:justify-center' : 'gap-3'} ${isActive ? 'border border-brand-500/20 bg-brand-500/15 text-brand-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                  <Icon size={17} className="flex-shrink-0" /><span className={`flex-1 ${collapsed ? 'md:hidden' : ''}`}>{label}</span><ChevronRight size={13} className={`opacity-0 transition-opacity group-hover:opacity-40 ${collapsed ? 'md:hidden' : ''}`} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-gray-800 px-3 py-4">
        <button onClick={onToggle} className="hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 md:flex" title={collapsed ? 'Expandir sidebar' : 'Comprimir sidebar'}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}{!collapsed && <span>Comprimir sidebar</span>}
        </button>
        <button onClick={onLogout} className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${collapsed ? 'md:justify-center' : 'gap-3'}`} title="Cerrar sesión">
          <LogOut size={17} /><span className={collapsed ? 'md:hidden' : ''}>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
