import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/ui'
import AuthShell from '../components/AuthShell'

function passwordStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const levels = [
    { label: 'Muy débil', className: 'bg-led-busy', width: '25%' },
    { label: 'Débil', className: 'bg-led-service', width: '50%' },
    { label: 'Buena', className: 'bg-led-free', width: '75%' },
    { label: 'Fuerte', className: 'bg-led-ok', width: '100%' },
  ]
  return levels[Math.min(score, 3)]
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const strength = passwordStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success('Cuenta creada')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Pide en segundos y retira sin filas."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Nombre</label>
          <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
          {strength ? (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full rounded-full transition-all ${strength.className}`} style={{ width: strength.width }} />
              </div>
              <p className="mt-1 text-xs text-ink-500">Seguridad: {strength.label}</p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-500">Mínimo 6 caracteres.</p>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
          {loading ? <Spinner className="h-4 w-4" /> : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}
