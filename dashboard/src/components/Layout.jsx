import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export function Layout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
