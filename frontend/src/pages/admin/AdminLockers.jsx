import { useEffect, useState } from 'react'
import { DoorOpen, History, KeyRound, Plus, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { EmptyState, LockerBay, PageLoader, Spinner } from '../../components/ui'
import { formatDateTime, timeAgo } from '../../lib/format'

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
  sin_senal: { label: 'Perdió la señal', tone: 'text-red-600 font-semibold' },
  en_linea: { label: 'Volvió a estar en línea', tone: 'text-led-ok' },
}

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
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

function EventRow({ ev }) {
  const info = EVENT_INFO[ev.kind] || { label: ev.kind, tone: 'text-ink-700' }
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className={info.tone}>
        {info.label}
        {ev.box_number ? ` · caja ${ev.box_number}` : ''}
        {ev.detail ? <span className="text-ink-400"> — {ev.detail}</span> : null}
      </span>
      <span className="shrink-0 text-ink-400">{formatDateTime(ev.created_at)}</span>
    </li>
  )
}

function HistoryModal({ locker, onClose }) {
  const { token } = useAuth()
  const toast = useToast()
  const [kind, setKind] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.getLockerEvents(token, locker.id, { kind, page, per_page: 30 })
      .then((res) => { if (!cancelled) setData(res) })
      .catch((e) => { if (!cancelled) toast.error(e.message) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, locker.id, kind, page])

  return (
    <Modal title={`Historial · ${locker.name}`} onClose={onClose} size="lg">
      <div className="mb-4">
        <select className="input sm:w-64" aria-label="Filtrar por tipo de movimiento" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1) }}>
          <option value="">Todos los movimientos</option>
          {Object.entries(EVENT_INFO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
        </select>
      </div>
      {!data ? (
        <PageLoader />
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">No hay movimientos con ese filtro.</p>
      ) : (
        <>
          <ul className="space-y-2">{data.items.map((ev) => <EventRow key={ev.id} ev={ev} />)}</ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Modal>
  )
}

function LockerCard({ locker, onSetStatus, onRotate, onOpenBox, onHistory, openingId, busy }) {
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
          <p className="text-xs text-ink-400">
            {locker.last_seen ? `Último aviso ${timeAgo(locker.last_seen)}` : 'Aún no se conectó'}
          </p>
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
                onClick={() => onOpenBox(locker, b)}
                disabled={openingId === b.id || !locker.online}
                className="btn-secondary !px-2.5 !py-1 text-xs"
                title={locker.online ? 'Abre esta caja para cargar productos' : 'El locker está sin señal'}
              >
                {openingId === b.id ? <Spinner className="h-3 w-3" /> : <DoorOpen className="h-3 w-3" aria-hidden="true" />} Abrir
              </button>
            </div>
          </li>
        ))}
      </ul>

      <details className="mt-4 text-sm">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800">
          <History className="h-3.5 w-3.5" aria-hidden="true" /> Actividad reciente
        </summary>
        {events.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">Todavía no hay movimientos.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">{events.map((ev) => <EventRow key={ev.id} ev={ev} />)}</ul>
        )}
        <button onClick={() => onHistory(locker)} className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
          Ver historial completo
        </button>
      </details>
    </div>
  )
}

export default function AdminLockers() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [lockers, setLockers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [openingId, setOpeningId] = useState(null)
  const [history, setHistory] = useState(null)

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
    const ok = await confirm({
      title: `¿Rotar la clave de «${locker.name}»?`,
      message: 'La clave actual del ESP32 deja de funcionar. Tendrás que copiar la nueva al firmware o el locker quedará sin conexión.',
      confirmText: 'Rotar clave',
      tone: 'danger',
    })
    if (!ok) return
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

  async function handleOpenBox(locker, box) {
    if (box.status === 'ocupado') {
      const ok = await confirm({
        title: `¿Abrir la caja ${box.box_number}?`,
        message: 'Tiene el pedido de un cliente guardado. Si la abres, la comida queda a la vista de cualquiera.',
        confirmText: 'Abrir de todos modos',
        tone: 'danger',
      })
      if (!ok) return
    }
    setOpeningId(box.id)
    try {
      await api.openBox(token, locker.id, box.box_number)
      toast.success(`Abriendo caja ${box.box_number}… en unos segundos se abre la puerta`)
      setTimeout(refreshQuiet, 4000)
    } catch (e) {
      toast.error(e.message)
    } finally {
      // Pequeña pausa para evitar dobles clics mientras el ESP32 recoge la orden
      setTimeout(() => setOpeningId(null), 3000)
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
              onOpenBox={handleOpenBox}
              onHistory={setHistory}
              openingId={openingId}
              busy={busyId === l.id}
            />
          ))}
        </div>
      )}

      {history && <HistoryModal locker={history} onClose={() => setHistory(null)} />}

      {showForm && <NewLockerForm onCancel={() => setShowForm(false)} onCreated={handleCreated} />}

      {newKey && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
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
