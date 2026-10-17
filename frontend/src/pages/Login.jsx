import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/ui'
import AuthShell from '../components/AuthShell'
import { IS_ADMIN_APP } from '../lib/appMode'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsOtp, setNeedsOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const { login, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password, needsOtp ? otp : undefined)
      if (user?.requiresOtp) {
        // Las cuentas con verificación en dos pasos solo entran por el panel de administración
        if (!IS_ADMIN_APP) throw new Error('Esta cuenta solo puede iniciar sesión desde el panel de administración.')
        setNeedsOtp(true)
        return
      }
      if (IS_ADMIN_APP && user?.role !== 'admin') {
        logout()
        throw new Error('Esta cuenta no tiene acceso al panel de administración.')
      }
      toast.success('Sesión iniciada')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={IS_ADMIN_APP ? 'Panel de administración' : 'Inicia sesión'}
      subtitle={IS_ADMIN_APP ? 'Acceso solo para administradores.' : 'Entra para ver y pagar tus pedidos.'}
      footer={
        IS_ADMIN_APP ? null : (
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Crea una
          </Link>
        </>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Correo</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Contraseña</label>
          <div className="relative">
            <input
              id="password"
              className="input pr-11"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-3 text-ink-400 hover:text-ink-700"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {IS_ADMIN_APP && needsOtp && (
          <div>
            <label htmlFor="otp" className="label">Código de verificación</label>
            <input
              id="otp"
              className="input tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="mt-1.5 text-xs text-ink-400">Abre tu app autenticadora y escribe el código de 6 dígitos.</p>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <button type="submit" disabled={loading || (needsOtp && otp.length !== 6)} className="btn-primary w-full !py-3">
          {loading ? <Spinner className="h-4 w-4" /> : needsOtp ? 'Verificar y entrar' : 'Entrar'}
        </button>
      </form>

      {IS_ADMIN_APP && import.meta.env.DEV && (
        <p className="mt-4 rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-500">
          Solo en desarrollo: admin@malhu.com / admin123 (después de correr seed.py)
        </p>
      )}
    </AuthShell>
  )
}
