import { useEffect, useRef, useState } from 'react'
import { Ban, Download, MapPin, Receipt, Search } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { EmptyState, PageLoader, Spinner, StatusBadge } from '../../components/ui'
import { formatDateTime, money, shortId } from '../../lib/format'

const STATUS_FILTERS = [
  ['todos', 'Todos'],
  ['pendiente_pago', 'Por pagar'],
  ['pagado', 'Por retirar'],
  ['retirado', 'Retirados'],
  ['expirado', 'Vencidos'],
  ['cancelado', 'Cancelados'],
]

const PER_PAGE = 20
const EMPTY = { status: 'todos', q: '', locker_id: '', date_from: '', date_to: '' }

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function presetRange(days) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  return { date_from: ymd(from), date_to: ymd(to) }
}

function Timeline({ order }) {
  const steps = [{ label: 'Pedido creado', at: order.created_at }]
  if (order.paid_at) steps.push({ label: `Pagado${order.payment_method ? ` con ${order.payment_method}` : ''}`, at: order.paid_at })
  if (order.used_at) steps.push({ label: 'Retirado del locker', at: order.used_at })
  else if (order.status === 'pagado' && order.pickup_expires_at) steps.push({ label: 'Vence el código de retiro', at: order.pickup_expires_at, pending: true })
  else if (order.status === 'expirado' && order.pickup_expires_at) steps.push({ label: 'Venció sin retirar', at: order.pickup_expires_at })
  if (order.status === 'cancelado') steps.push({ label: 'Cancelado', at: null })

  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.pending ? 'bg-ink-300' : 'bg-brand-600'}`} aria-hidden="true" />
          <span className="flex-1 text-ink-700">{s.label}</span>
          <span className="text-ink-400">{s.at ? formatDateTime(s.at) : ''}</span>
        </li>
      ))}
    </ol>
  )
}

function OrderDetail({ order, busy, onCancel, onClose }) {
  const cancellable = order.status === 'pendiente_pago' || order.status === 'pagado'
  return (
    <Modal
      title={`Pedido #${shortId(order.id)}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {cancellable && (
            <button onClick={() => onCancel(order)} disabled={busy} className="btn-danger">
              {busy ? <Spinner className="h-4 w-4" /> : <Ban className="h-4 w-4" aria-hidden="true" />} Cancelar pedido
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={order.status} />
          <p className="font-display text-2xl font-bold text-ink-900">{money(order.total)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-ink-50 p-4 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Cliente</p>
            <p className="font-semibold text-ink-900">{order.customer_name}</p>
            <p className="text-ink-500">{order.customer_email}</p>
          </div>
          <div className="rounded-xl bg-ink-50 p-4 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Retiro</p>
            <p className="flex items-center gap-1 font-semibold text-ink-900">
              <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" /> {order.locker_name}
            </p>
            <p className="text-ink-500">
              {order.box_number ? `Caja ${order.box_number}` : 'Aún sin caja asignada'}
              {order.pickup_code ? ` · ${order.pickup_code}` : ''}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Productos</p>
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 text-sm">
            {order.items.map((i, idx) => (
              <li key={`${i.product_id}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-ink-800">
                  {i.quantity} × {i.product_name}
                  {i.options?.length > 0 && (
                    <span className="mt-0.5 block text-xs text-ink-500">{i.options.map((o) => `${o.group}: ${o.name}`).join(' · ')}</span>
                  )}
                </span>
                <span className="text-ink-500">{money(i.unit_price * i.quantity)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-4 py-2.5 font-semibold text-ink-900">
              <span>Total</span><span>{money(order.total)}</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Historial</p>
          <Timeline order={order} />
        </div>

        {order.payment_ref && (
          <p className="text-xs text-ink-400">Referencia de pago: <span className="font-mono">{order.payment_ref}</span></p>
        )}
      </div>
    </Modal>
  )
}

export default function AdminOrders() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [filters, setFilters] = useState(EMPTY)
  const [qInput, setQInput] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lockers, setLockers] = useState([])
  const [selected, setSelected] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    api.getAdminLockers(token).then(setLockers).catch(() => {})
  }, [token])

  // La búsqueda espera a que termines de escribir
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => (f.q === qInput.trim() ? f : { ...f, q: qInput.trim() }))
      setPage(1)
    }, 350)
    return () => clearTimeout(id)
  }, [qInput])

  useEffect(() => {
    const current = ++requestId.current
    setLoading(true)
    api.getAdminOrders(token, { ...filters, page, per_page: PER_PAGE })
      .then((res) => { if (current === requestId.current) setData(res) })
      .catch((e) => { if (current === requestId.current) toast.error(e.message) })
      .finally(() => { if (current === requestId.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters, page, reloadKey])

  function setFilter(patch) {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY)

  function clearFilters() {
    setFilters(EMPTY)
    setQInput('')
    setPage(1)
  }

  async function handleCancel(order) {
    const paid = order.status === 'pagado'
    const ok = await confirm({
      title: `¿Cancelar el pedido #${shortId(order.id)}?`,
      message: paid
        ? 'El cliente ya pagó: se devolverá el stock, el código QR dejará de funcionar y la caja quedará libre. El reembolso del dinero lo haces tú por fuera.'
        : 'El pedido todavía no se pagó. Se cancelará y el cliente ya no podrá pagarlo.',
      confirmText: 'Sí, cancelar pedido',
      cancelText: 'No, volver',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(order.id)
    try {
      const updated = await api.cancelAdminOrder(token, order.id)
      toast.success('Pedido cancelado')
      setSelected(updated)
      setReloadKey((k) => k + 1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await api.exportOrders(token, filters)
      toast.success('Descarga lista')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const orders = data?.items || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Todos los pedidos de la tienda.</p>
      <AdminNav />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(([value, label]) => (
            <button key={value} onClick={() => setFilter({ status: value })} className={filters.status === value ? 'chip-on' : 'chip-off'}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input className="input !pl-9" placeholder="Buscar cliente, correo o ID" aria-label="Buscar pedidos" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>
          <select className="input" aria-label="Filtrar por locker" value={filters.locker_id} onChange={(e) => setFilter({ locker_id: e.target.value })}>
            <option value="">Todos los lockers</option>
            {lockers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input className="input" type="date" aria-label="Desde" value={filters.date_from} max={filters.date_to || undefined} onChange={(e) => setFilter({ date_from: e.target.value })} />
          <input className="input" type="date" aria-label="Hasta" value={filters.date_to} min={filters.date_from || undefined} onChange={(e) => setFilter({ date_to: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-400">Fechas rápidas:</span>
            <button onClick={() => setFilter(presetRange(1))} className="font-semibold text-brand-600 hover:underline">Hoy</button>
            <button onClick={() => setFilter(presetRange(7))} className="font-semibold text-brand-600 hover:underline">7 días</button>
            <button onClick={() => setFilter(presetRange(30))} className="font-semibold text-brand-600 hover:underline">30 días</button>
            {hasFilters && <button onClick={clearFilters} className="ml-2 font-semibold text-ink-500 hover:underline">Limpiar filtros</button>}
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary !py-2 text-xs">
            {exporting ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />} Exportar CSV
          </button>
        </div>
      </div>

      {data && (
        <p className="mb-3 text-sm text-ink-500" aria-live="polite">
          <strong className="text-ink-800">{data.total}</strong> {data.total === 1 ? 'pedido' : 'pedidos'} · {money(data.summary.monto)} cobrados
        </p>
      )}

      {!data ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <EmptyState icon={Receipt} title="No hay pedidos con esos filtros" subtitle={hasFilters ? 'Prueba quitando algún filtro.' : undefined} />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Locker</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setSelected(o)}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink-700">#{shortId(o.id)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">{o.customer_name}</p>
                      <p className="text-xs text-ink-400">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{o.locker_name}{o.box_number ? ` · Caja ${o.box_number}` : ''}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{money(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {(o.status === 'pendiente_pago' || o.status === 'pagado') && (
                        <button onClick={() => handleCancel(o)} disabled={busyId === o.id} className="btn-danger !px-3 !py-1.5 text-xs">
                          {busyId === o.id ? <Spinner className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page} onPage={setPage} />
        </div>
      )}

      {selected && (
        <OrderDetail order={selected} busy={busyId === selected.id} onCancel={handleCancel} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
