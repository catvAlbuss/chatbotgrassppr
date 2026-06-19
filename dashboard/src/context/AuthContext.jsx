import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

// Jerarquía: root(4) > administrador(3) > administrador_bot(2) > cliente(1)
const ROL_NIVEL = {
  root: 4, administrador: 3, administrador_bot: 2, cliente: 1,
  admin: 4, operador: 2, consulta: 1
}

export const ROL_LABELS = {
  root:             { label: 'Root',               color: 'text-red-400    bg-red-500/10    border-red-500/20'    },
  administrador:    { label: 'Administrador',       color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  administrador_bot:{ label: 'Admin Bots',          color: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
  cliente:          { label: 'Cliente',             color: 'text-brand-400  bg-brand-500/10  border-brand-500/20'  },
  admin:            { label: 'Admin (legacy)',      color: 'text-red-400    bg-red-500/10    border-red-500/20'    },
  operador:         { label: 'Operador (legacy)',   color: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
  consulta:         { label: 'Consulta (legacy)',   color: 'text-gray-400   bg-gray-700      border-gray-600'      },
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_user')
      if (saved) return JSON.parse(saved)
      // Fallback: extraer info básica del JWT sin verificar
      const token = localStorage.getItem('gb_token')
      if (token) {
        const claims = decodeJwt(token)
        if (claims?.usuario) return { usuario: claims.usuario, rol: claims.rol || 'admin' }
      }
      return null
    } catch { return null }
  })

  function login(userData) {
    setUser(userData)
    localStorage.setItem('gb_user', JSON.stringify(userData))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('gb_token')
    localStorage.removeItem('gb_user')
  }

  // Helpers de permisos
  const nivel        = ROL_NIVEL[user?.rol] || 0
  const esRoot       = nivel >= 4
  const esAdmin      = nivel >= 3   // administrador+
  const esAdminBot   = nivel >= 2   // administrador_bot+
  const esCliente    = nivel === 1  // solo cliente

  // Plan del cliente (solo relevante cuando esCliente)
  const plan         = user?.plan || null
  const planExpira   = user?.plan_expira || null
  const esDemo       = esCliente && plan === 'demo'

  return (
    <AuthContext.Provider value={{ user, login, logout, nivel, esRoot, esAdmin, esAdminBot, esCliente, plan, planExpira, esDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
