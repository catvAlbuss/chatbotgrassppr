import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { Layout } from './components/Layout.jsx'
import { Login } from './pages/Login.jsx'
import { Overview } from './pages/Overview.jsx'
import { Reservas } from './pages/Reservas.jsx'
import { Pagos } from './pages/Pagos.jsx'
import { Clientes } from './pages/Clientes.jsx'
import { Configuracion } from './pages/Configuracion.jsx'
import { Planes } from './pages/Planes.jsx'
import { MisBots } from './pages/MisBots.jsx'
import { Usuarios } from './pages/Usuarios.jsx'
import { MiConfiguracion } from './pages/MiConfiguracion.jsx'

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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<RootRedirect />} />
            {/* Todos los roles con sesión */}
            <Route path="bots"        element={<MisBots />} />
            <Route path="planes"      element={<Planes />} />
            <Route path="mi-config"   element={<MiConfiguracion />} />
            {/* administrador_bot+ */}
            <Route path="resumen"  element={<RequireNivel minNivel={2}><Overview /></RequireNivel>} />
            <Route path="reservas" element={<RequireNivel minNivel={2}><Reservas /></RequireNivel>} />
            <Route path="pagos"    element={<RequireNivel minNivel={2}><Pagos /></RequireNivel>} />
            <Route path="usuarios" element={<RequireNivel minNivel={2}><Usuarios /></RequireNivel>} />
            {/* administrador+ */}
            <Route path="clientes" element={<RequireNivel minNivel={3}><Clientes /></RequireNivel>} />
            <Route path="config"   element={<RequireNivel minNivel={3}><Configuracion /></RequireNivel>} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
