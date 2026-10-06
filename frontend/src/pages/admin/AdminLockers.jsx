import { useEffect, useState } from 'react'
import { History, KeyRound, Plus, QrCode, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { EmptyState, LockerBay, PageLoader, Spinner } from '../../components/ui'
import { formatDateTime, formatDuration, useCountdown } from '../../lib/format'

const BOX_LABEL = { libre: 'Libre', ocupado: 'Ocupado', mantenimiento: 'Mantenimiento' }

// Texto y color de cada movimiento que el ESP32 reporta
const EVENT_INFO = {
  retiro: { label: 'Retiro de cliente', tone: 'text-ink-700' },
  carga: { label: 'Carga con llave de admin', tone: 'text-brand-700' },
  rechazado: { label: 'Código rechazado', tone: 'text-amber-700' },
  puerta_abierta: { label: 'Puerta abierta', tone: 'text-ink-700' },
  puerta_cerrada: { label: 'Puerta cerrada', tone: 'text-ink-700' },
  sin_apertura: { label: 'Nadie abrió la puerta', tone: 'text-amber-700' },
  codigo_restaurado: { label: 'Código devuelto al cliente', tone: 'text-brand-700' },
  puerta_forzada: { label: 'Puerta abierta sin autorización', tone: 'text-red-600 font-semibold' },
  arranque: { label: 'Locker encendido', tone: 'text-ink-500' },
}

const KEY_DURATIONS = [5, 10, 15, 30, 60]

function NewLockerForm({ onCancel, onCreated }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', device_id: '', address: '', num_boxes: 6 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.device_id.trim()) return setError('Nombre y device_id son obligatorios')
    setSaving(true)
    try {
      const locker = await api.createLocker(token, { ...form, num_boxes: parseInt(form.num_boxes, 10) || 1 })
      toast.success('Locker creado. Copia la clave al firmware del ESP32.')
      onCreated(locker)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Nuevo locker</h2>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Device ID (del ESP32)</label>
            <input className="input" value={form.device_id} onChange={(e) => set('device_id', e.target.value)} placeholder="LOCKER-002" required />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <label className="label">Número de cajas</label>
            <input className="input" type="number" min="1" max="64" value={form.num_boxes} onChange={(e) => set('num_boxes', e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Crear locker'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Llave digital del admin: un QR que abre UNA caja para cargar productos.
 * - Sin `existingKey`: muestra el formulario para generarla.
 * - Con `existingKey`: carga y muestra el QR de una llave que sigue vigente.
 */
function AdminKeyModal({ locker, box, existingKey, onClose, onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [minutes, setMinutes] = useState(10)
  const [singleUse, setSingleUse] = useState(false)
  const [keyData, setKeyData] = useState(null)
  const [loading, setLoading] = useState(Boolean(existingKey))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const boxNumber = box?.box_number ?? existingKey?.box_number
  const remaining = useCountdown(keyData?.expires_at)

  useEffect(() => {
    if (!existingKey) return
    api.getAdminKeyQr(token, existingKey.id)
      .then(setKeyData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [existingKey, token])

  async function handleGenerate() {
    setError('')
    setBusy(true)
    try {
      const created = await api.createAdminKey(token, locker.id, {
        box_number: boxNumber,
        minutes,
        single_use: singleUse,
      })
      setKeyData(created)
      onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('¿Revocar esta llave? Dejará de abrir la caja de inmediato.')) return
    setBusy(true)
    try {
      await api.revokeAdminKey(token, keyData.id)
      toast.success('Llave revocada')
      onChanged()
      onClose()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const expired = remaining !== null && remaining <= 0

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-pop">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Llave digital</h2>
            <p className="text-sm text-ink-500">{locker.name} · Caja {boxNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-brand-600" /></div>
        ) : !keyData ? (
          <>
            <p className="mb-4 text-sm text-ink-600">
              Genera un QR para abrir esta caja y cargar productos. Acércalo al lector del locker.
              Los pedidos de los clientes no se ven afectados.
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">Duración de la llave</label>
                <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                  {KEY_DURATIONS.map((m) => (
                    <option key={m} value={m}>{m} minutos</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={singleUse} onChange={(e) => setSingleUse(e.target.checked)} />
                Un solo uso (se invalida al abrir la caja)
              </label>
            </div>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={handleGenerate} disabled={busy} className="btn-primary">
                {busy ? <Spinner className="h-4 w-4" /> : <><QrCode className="h-4 w-4" aria-hidden="true" /> Generar llave</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`mx-auto w-fit rounded-xl border border-ink-200 bg-white p-2 ${expired ? 'opacity-30' : ''}`}>
              <img src={keyData.qr_image_base64} alt={`QR de la llave de la caja ${boxNumber}`} className="h-56 w-56" />
            </div>
            <p className="mt-3 text-center font-mono text-sm text-ink-700">{keyData.code}</p>
            <p className={`mt-1 text-center text-sm ${expired ? 'font-semibold text-red-600' : 'text-ink-500'}`}>
              {expired ? 'Esta llave venció' : `Vence en ${formatDuration(remaining ?? 0)}`}
              {keyData.single_use && !expired ? ' · un solo uso' : ''}
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Cualquiera que tenga este QR puede abrir la caja mientras esté vigente. No lo compartas.
            </p>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={handleRevoke} disabled={busy || expired} className="btn-danger">
                {busy ? <Spinner className="h-4 w-4" /> : 'Revocar'}
              </button>
              <button type="button" onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActiveKeyRow({ adminKey, onView, onRevoke }) {
  const remaining = useCountdown(adminKey.expires_at)
  if (remaining !== null && remaining <= 0) return null
  return (
    <li className="flex items-center justify-between gap-2 py-2 text-sm">
      <span className="text-ink-700">
        Caja {adminKey.box_number}
        <span className="ml-2 text-xs text-ink-400">vence en {formatDuration(remaining ?? 0)}</span>
      </span>
      <div className="flex gap-1.5">
        <button onClick={() => onView(adminKey)} className="btn-secondary !px-2.5 !py-1 text-xs">Ver QR</button>
        <button onClick={() => onRevoke(adminKey)} className="btn-ghost !px-2.5 !py-1 text-xs text-red-600">Revocar</button>
      </div>
    </li>
  )
}

function LockerCard({ locker, onSetStatus, onRotate, onNewKey, onViewKey, onRevokeKey, busy }) {
  const keys = locker.keys || []
  const events = locker.events || []
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-ink-900">{locker.name}</h2>
            {locker.online ? (
              <span className="flex items-center gap-1 text-xs font-medium text-led-ok">
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> en línea
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-ink-400">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> sin señal
              </span>
            )}
          </div>
          <p className="text-xs text-ink-400">{locker.address || 'Sin dirección'}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-400">{locker.device_id}</p>
        </div>
        <button
          onClick={() => onRotate(locker)}
          disabled={busy}
          className="btn-secondary !px-2.5 !py-1.5 text-xs"
          title="Genera una nueva clave para el ESP32"
        >
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
          Rotar clave
        </button>
      </div>

      <LockerBay boxes={locker.boxes} />

      <ul className="mt-4 divide-y divide-ink-100 text-sm">
        {locker.boxes.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-ink-700">Caja {b.box_number}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-500">{BOX_LABEL[b.status]}</span>
              {b.status === 'mantenimiento' && (
                <button onClick={() => onSetStatus(b, 'libre')} className="btn-secondary !px-2.5 !py-1 text-xs">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" /> Liberar
                </button>
              )}
              {b.status === 'libre' && (
                <button onClick={() => onSetStatus(b, 'mantenimiento')} className="btn-ghost !px-2.5 !py-1 text-xs">
                  Poner en mantenimiento
                </button>
              )}
              <button
                onClick={() => onNewKey(locker, b)}
                className="btn-secondary !px-2.5 !py-1 text-xs"
                title="Genera un QR para abrir esta caja y cargar productos"
              >
                <QrCode className="h-3 w-3" aria-hidden="true" /> Llave
              </button>
            </div>
          </li>
        ))}
      </ul>

      {keys.length > 0 && (
        <div className="mt-4 rounded-xl bg-brand-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Llaves activas</p>
          <ul className="divide-y divide-brand-100">
            {keys.map((k) => (
              <ActiveKeyRow key={k.id} adminKey={k} onView={(key) => onViewKey(locker, key)} onRevoke={onRevokeKey} />
            ))}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800">
            <History className="h-3.5 w-3.5" aria-hidden="true" /> Actividad reciente
          </summary>
          <ul className="mt-2 space-y-1.5">
            {events.map((ev) => {
              const info = EVENT_INFO[ev.kind] || { label: ev.kind, tone: 'text-ink-700' }
              return (
                <li key={ev.id} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className={info.tone}>
                    {info.label}
                    {ev.box_number ? ` · caja ${ev.box_number}` : ''}
                    {ev.detail ? <span className="text-ink-400"> — {ev.detail}</span> : null}
                  </span>
                  <span className="shrink-0 text-ink-400">{formatDateTime(ev.created_at)}</span>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </div>
  )
}

export default function AdminLockers() {
  const { token } = useAuth()
  const toast = useToast()
  const [lockers, setLockers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [keyModal, setKeyModal] = useState(null) // { locker, box?, existingKey? }
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    api.getAdminLockers(token).then(setLockers).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [token])

  // Refresca sin spinner (para ver "en línea" y la actividad al día)
  function refreshQuiet() {
    api.getAdminLockers(token).then(setLockers).catch(() => {})
  }

  useEffect(() => {
    const id = setInterval(refreshQuiet, 15000)
    return () => clearInterval(id)
  }, [token])

  function handleCreated(locker) {
    setLockers((prev) => [locker, ...prev])
    setShowForm(false)
    setNewKey(locker)
  }

  async function handleSetStatus(box, status) {
    setBusyId(box.id)
    try {
      await api.setBoxStatus(token, box.id, status)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRotate(locker) {
    if (!confirm(`Esto invalida la clave actual del ESP32 de "${locker.name}". ¿Continuar?`)) return
    setBusyId(locker.id)
    try {
      const updated = await api.rotateLockerKey(token, locker.id)
      setLockers((prev) => prev.map((l) => (l.id === locker.id ? updated : l)))
      setNewKey(updated)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevokeKey(adminKey) {
    if (!confirm(`¿Revocar la llave de la caja ${adminKey.box_number}?`)) return
    try {
      await api.revokeAdminKey(token, adminKey.id)
      toast.success('Llave revocada')
      refreshQuiet()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Lockers físicos y sus casillas.</p>
      <AdminNav />

      <div className="mb-4 flex justify-end">
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo locker
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : lockers.length === 0 ? (
        <EmptyState title="Aún no hay lockers" subtitle="Crea el primero con el device_id que usará el ESP32." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {lockers.map((l) => (
            <LockerCard
              key={l.id}
              locker={l}
              onSetStatus={handleSetStatus}
              onRotate={handleRotate}
              onNewKey={(locker, box) => setKeyModal({ locker, box })}
              onViewKey={(locker, existingKey) => setKeyModal({ locker, existingKey })}
              onRevokeKey={handleRevokeKey}
              busy={busyId === l.id}
            />
          ))}
        </div>
      )}

      {showForm && <NewLockerForm onCancel={() => setShowForm(false)} onCreated={handleCreated} />}

      {keyModal && (
        <AdminKeyModal
          locker={keyModal.locker}
          box={keyModal.box}
          existingKey={keyModal.existingKey}
          onClose={() => setKeyModal(null)}
          onChanged={refreshQuiet}
        />
      )}

      {newKey && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
            <h2 className="mb-2 text-lg font-bold text-ink-900">Clave del dispositivo</h2>
            <p className="mb-3 text-sm text-ink-500">
              Copia esta clave al firmware del ESP32 de <strong>{newKey.name}</strong>. No se volverá a mostrar completa.
            </p>
            <code className="block break-all rounded-lg bg-ink-100 px-3 py-2.5 text-sm text-ink-800">
              {newKey.device_key}
            </code>
            <button onClick={() => setNewKey(null)} className="btn-primary mt-4 w-full">Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}
