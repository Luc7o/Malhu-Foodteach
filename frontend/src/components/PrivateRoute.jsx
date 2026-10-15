import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IS_ADMIN_APP } from '../lib/appMode'

export function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  // En el subdominio admin no existe tienda a la que volver: se manda al login
  if (user?.role !== 'admin') return <Navigate to={IS_ADMIN_APP ? '/login' : '/'} replace />
  return children
}
