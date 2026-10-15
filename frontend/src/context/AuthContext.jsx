import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, AUTH_EXPIRED_EVENT } from '../api'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  )
  const toast = useToast()
  const navigate = useNavigate()

  function persist(data) {
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  async function login(email, password) {
    const data = await api.login(email, password)
    persist(data)
    return data.user
  }

  async function register(name, email, password) {
    const data = await api.register(name, email, password)
    persist(data)
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // Si cualquier llamada a la API responde 401 (token vencido o inválido),
  // cerramos sesión automáticamente y mandamos al usuario a login en vez
  // de dejarlo viendo una pantalla rota con "Error 401".
  useEffect(() => {
    function handleExpired() {
      const hadSession = !!localStorage.getItem('token')
      logout()
      if (hadSession) {
        toast?.error('Tu sesión expiró. Inicia sesión de nuevo.')
        navigate('/login')
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
