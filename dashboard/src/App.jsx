import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { Login } from './pages/Login.jsx'
import { Overview } from './pages/Overview.jsx'
import { Reservas } from './pages/Reservas.jsx'
import { Pagos } from './pages/Pagos.jsx'
import { Clientes } from './pages/Clientes.jsx'
import { Configuracion } from './pages/Configuracion.jsx'
import { Planes } from './pages/Planes.jsx'
import { MisBots } from './pages/MisBots.jsx'

function RequireAuth({ children }) {
  return localStorage.getItem('gb_token') ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index      element={<Overview />} />
          <Route path="bots"     element={<MisBots />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="pagos"    element={<Pagos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="config"   element={<Configuracion />} />
          <Route path="planes"   element={<Planes />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
