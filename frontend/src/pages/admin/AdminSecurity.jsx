import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { PageLoader, Spinner } from '../../components/ui'
import { timeAgo } from '../../lib/format'

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="input pr-11"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-3 text-ink-400 hover:text-ink-700"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function ChangePassword() {
  const { token } = useAuth()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres')
    if (next !== repeat) return setError('Las contraseñas nuevas no coinciden')
    setSaving(true)
    try {
      await api.changePassword(token, current, next)
      toast.success('Contraseña actualizada')
      setCurrent('')
      setNext('')
      setRepeat('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-ink-400" aria-hidden="true" />
        <h2 className="text-lg font-bold text-ink-900">Cambiar contraseña</h2>
      </div>
      <PasswordField id="pw-current" label="Contraseña actual" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField id="pw-new" label="Contraseña nueva" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordField id="pw-repeat" label="Repite la contraseña nueva" value={repeat} onChange={setRepeat} autoComplete="new-password" />
      <p className="text-xs text-ink-400">Mínimo 8 caracteres. Usa una que no repitas en otros sitios.</p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? <Spinner className="h-4 w-4" /> : 'Guardar contraseña'}
      </button>
    </form>
  )
}

function TwoFactor({ enabled, onChange }) {
  const { token } = useAuth()
  const toast = useToast()
  const [setup, setSetup] = useState(null) // { secret, qr_image_base64 }
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setSetup(null)
    setDisabling(false)
    setCode('')
    setPassword('')
    setError('')
  }

  async function startSetup() {
    setBusy(true)
    setError('')
    try {
      setSetup(await api.twofaSetup(token))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnable(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.twofaEnable(token, code)
      toast.success('Verificación en dos pasos activada')
      reset()
      onChange(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDisable(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.twofaDisable(token, password, code)
      toast.success('Verificación en dos pasos desactivada')
      reset()
      onChange(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const codeInput = (
    <div>
      <label className="label" htmlFor="otp-code">Código de 6 dígitos</label>
      <input
        id="otp-code"
        className="input tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        required
      />
    </div>
  )

  return (
    <div className="panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {enabled ? <ShieldCheck className="h-5 w-5 text-led-ok" aria-hidden="true" /> : <ShieldOff className="h-5 w-5 text-ink-400" aria-hidden="true" />}
          <h2 className="text-lg font-bold text-ink-900">Verificación en dos pasos</h2>
        </div>
        <span className={`badge ${enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-ink-100 text-ink-600'}`}>{enabled ? 'Activada' : 'Desactivada'}</span>
      </div>

      {!setup && !disabling && (
        <>
          <p className="text-sm text-ink-500">
            {enabled
              ? 'Al iniciar sesión te pediremos, además de la contraseña, un código de tu app autenticadora. Así nadie entra solo con tu contraseña.'
              : 'Protege el panel con un segundo paso: un código que cambia cada 30 segundos en tu teléfono (Google Authenticator, Microsoft Authenticator, Authy…).'}
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          {enabled ? (
            <button onClick={() => setDisabling(true)} className="btn-danger">Desactivar</button>
          ) : (
            <button onClick={startSetup} disabled={busy} className="btn-primary">
              {busy ? <Spinner className="h-4 w-4" /> : <Smartphone className="h-4 w-4" aria-hidden="true" />} Activar
            </button>
          )}
        </>
      )}

      {setup && (
        <form onSubmit={confirmEnable} className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
            <li>Abre tu app autenticadora y elige «Escanear código QR».</li>
            <li>Escanea este código (o escribe la clave a mano).</li>
            <li>Escribe aquí el código de 6 dígitos que te muestre la app.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            <img src={setup.qr_image_base64} alt="Código QR para la app autenticadora" className="h-40 w-40 rounded-xl border border-ink-200 bg-white p-2" />
            <div className="min-w-0 text-sm">
              <p className="text-xs text-ink-400">Clave manual</p>
              <code className="block break-all rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-800">{setup.secret}</code>
            </div>
          </div>
          {codeInput}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary">
              {busy ? <Spinner className="h-4 w-4" /> : 'Confirmar y activar'}
            </button>
            <button type="button" onClick={reset} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {disabling && (
        <form onSubmit={confirmDisable} className="space-y-4">
          <p className="text-sm text-ink-500">Para desactivarla confirma tu contraseña y un código actual de la app.</p>
          <PasswordField id="off-password" label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
          {codeInput}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className="btn border border-red-600 bg-red-600 text-white hover:bg-red-700">
              {busy ? <Spinner className="h-4 w-4" /> : 'Desactivar verificación'}
            </button>
            <button type="button" onClick={reset} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function AdminSecurity() {
  const { token, user } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState(null)

  useEffect(() => {
    api.getSecurity(token).then(setStatus).catch((e) => toast.error(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Seguridad de la cuenta</h1>
      <p className="mb-6 text-ink-500">
        {user?.email}
        {status?.last_login_at && <> · Último acceso {timeAgo(status.last_login_at)}</>}
      </p>
      {!status ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <TwoFactor enabled={status.totp_enabled} onChange={(totp_enabled) => setStatus((s) => ({ ...s, totp_enabled }))} />
          <ChangePassword />
        </div>
      )}
    </div>
  )
}
