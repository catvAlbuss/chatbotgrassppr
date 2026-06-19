import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { Layout } from './components/Layout.jsx'
import { Login } from './pages/Login.jsx'
import { Overview } from './pages/Overview.jsx'
import { Reservas } from './pages/Reservas.jsx'
import { Pagos } from './pages/Pagos.jsx'
import { Clientes } from './pages/Clientes.jsx'
import { Planes } from './pages/Planes.jsx'
import { MisBots } from './pages/MisBots.jsx'
import { MiConfiguracion } from './pages/MiConfiguracion.jsx'
import { ClientesSistema } from './pages/ClientesSistema.jsx'
import { SistemaBot } from './pages/SistemaBot.jsx'

// Protege rutas — redirige a login si no hay token
function RequireAuth({ children }) {
  const token = localStorage.getItem('gb_token')
  return token ? children : <Navigate to="/admin/login" replace />
}

// Redirige según rol al entrar al dashboard
function RootRedirect() {
  const { esCliente } = useAuth()
  return <Navigate to={esCliente ? '/admin/bots' : '/admin/resumen'} replace />
}

// Bloquea rutas que el rol no tiene acceso
function RequireNivel({ minNivel, children }) {
  const { nivel } = useAuth()
  if (nivel < minNivel) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<RootRedirect />} />
            {/* Todos los roles con sesión */}
            <Route path="bots"           element={<MisBots />} />
            <Route path="bots/:id"       element={<SistemaBot />} />
            <Route path="planes"         element={<Planes />} />
            <Route path="mi-config"      element={<MiConfiguracion />} />
            {/* administrador_bot+ */}
            <Route path="resumen"  element={<RequireNivel minNivel={2}><Overview /></RequireNivel>} />
            <Route path="reservas" element={<RequireNivel minNivel={2}><Reservas /></RequireNivel>} />
            <Route path="pagos"    element={<RequireNivel minNivel={2}><Pagos /></RequireNivel>} />
            <Route path="usuarios" element={<Navigate to="/admin/clientes-sistema" replace />} />
            <Route path="contactos" element={<RequireNivel minNivel={2}><Clientes /></RequireNivel>} />
            <Route path="clientes" element={<Navigate to="/admin/contactos" replace />} />
            <Route path="clientes-sistema" element={<RequireNivel minNivel={2}><ClientesSistema /></RequireNivel>} />
            <Route path="config" element={<Navigate to="/admin/mi-config" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
