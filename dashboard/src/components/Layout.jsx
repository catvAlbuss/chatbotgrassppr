import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'

export function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('gb_token')
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
