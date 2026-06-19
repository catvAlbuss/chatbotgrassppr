import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, Bot, AlertTriangle, X } from 'lucide-react'
import { Sidebar } from './Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function PlanExpiryBanner() {
  const { esCliente, plan, planExpira } = useAuth()
  const [visible, setVisible] = useState(true)

  if (!esCliente || !visible || !planExpira || plan === 'lifetime') return null

  const hoy   = new Date()
  const expira = new Date(planExpira + 'T12:00:00')
  const dias   = Math.ceil((expira - hoy) / (1000 * 60 * 60 * 24))

  if (dias > 7) return null

  const urgente = dias <= 2
  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 text-sm border-b ${
      urgente
        ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    }`}>
      <AlertTriangle size={15} className="flex-shrink-0" />
      <p className="flex-1">
        {dias <= 0
          ? 'Tu plan ha vencido. Contacta al administrador para renovar.'
          : dias === 1
            ? 'Tu plan vence mañana. Contacta al administrador para renovar.'
            : `Tu plan vence en ${dias} días. Contacta al administrador para renovar.`}
      </p>
      <button onClick={() => setVisible(false)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

export function Layout() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(() => localStorage.getItem('gb_sidebar_collapsed') === '1')

  function toggleSidebar() {
    setCollapsed(current => {
      const next = !current
      localStorage.setItem('gb_sidebar_collapsed', next ? '1' : '0')
      return next
    })
  }

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {mobileOpen && (
        <button className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />
      )}
      <Sidebar onLogout={handleLogout} collapsed={collapsed} mobileOpen={mobileOpen}
        onToggle={toggleSidebar} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100" aria-label="Abrir menú">
            <Menu size={21} />
          </button>
          <Bot size={19} className="text-brand-400" />
          <span className="font-semibold text-gray-100">Gespro Asist</span>
        </header>
        <PlanExpiryBanner />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-8xl p-4 sm:p-6 md:p-8"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
