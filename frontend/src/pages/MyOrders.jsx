import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, PageLoader, Spinner, StatusBadge } from '../components/ui'

function OrderCard({ order, highlighted, onPay, onShowQr, qr, paying, loadingQr }) {
  const toast = useToast()

  function copyCode() {
    navigator.clipboard.writeText(qr.code)
    toast.success('Código copiado al portapapeles')
  }

  return (
    <div
      className={`card p-5 transition ${highlighted ? 'ring-2 ring-brand-400' : ''}`}
      id={`order-${order.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-ink-400">Pedido #{order.id.slice(0, 8)}</p>
          <p className="text-lg font-bold text-ink-900">S/. {order.total.toFixed(2)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm text-ink-600">
        {order.items.map((it, idx) => (
          <li key={idx} className="flex justify-between">
            <span>
              {it.product_name} <span className="text-ink-400">x{it.quantity}</span>
            </span>
            <span>S/. {(it.unit_price * it.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {order.status === 'pendiente_pago' && (
          <button onClick={() => onPay(order.id)} disabled={paying} className="btn-primary">
            {paying ? <Spinner className="h-4 w-4 text-white" /> : 'Simular pago'}
          </button>
        )}

        {order.status === 'pagado' && !qr && (
          <button onClick={() => onShowQr(order.id)} disabled={loadingQr} className="btn-secondary">
            {loadingQr ? <Spinner className="h-4 w-4" /> : 'Ver código QR'}
          </button>
        )}

        {order.status === 'retirado' && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            ✅ Ya fue retirado
          </p>
        )}
      </div>

      {qr && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-ink-50 p-4 sm:flex-row">
          <img src={qr.qr_image_base64} alt="QR de retiro" width={130} className="rounded-lg bg-white p-2" />
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-wide text-ink-400">Código de retiro</p>
            <p className="text-lg font-bold tracking-wider text-ink-900">{qr.code}</p>
            {order.box_number && (
              <p className="mt-1 text-sm text-ink-500">Caja asignada: #{order.box_number}</p>
            )}
            <button onClick={copyCode} className="btn-ghost mt-2 !px-2 !py-1 text-xs">
              📋 Copiar código
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrByOrder, setQrByOrder] = useState({})
  const [payingId, setPayingId] = useState(null)
  const [loadingQrId, setLoadingQrId] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos')
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')
  const toast = useToast()

  function loadOrders() {
    api
      .getMyOrders(token)
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (token) loadOrders()
  }, [token])

  async function handlePay(orderId) {
    setError('')
    setPayingId(orderId)
    try {
      await api.payOrder(token, orderId)
      const qr = await api.getOrderQr(token, orderId)
      setQrByOrder((prev) => ({ ...prev, [orderId]: qr }))
      toast.success('Pago confirmado. ¡Aquí está tu código QR!')
      loadOrders()
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setPayingId(null)
    }
  }

  async function handleShowQr(orderId) {
    setLoadingQrId(orderId)
    try {
      const qr = await api.getOrderQr(token, orderId)
      setQrByOrder((prev) => ({ ...prev, [orderId]: qr }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingQrId(null)
    }
  }

  const filtered = orders.filter((o) => filter === 'todos' || o.status === filter)
  const filters = [
    ['todos', 'Todos'],
    ['pendiente_pago', 'Pendientes'],
    ['pagado', 'Por retirar'],
    ['retirado', 'Retirados'],
  ]

  if (loading) return <PageLoader label="Cargando tus pedidos..." />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-2xl font-bold text-ink-900">Mis pedidos</h2>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === value ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 border border-ink-200 hover:bg-ink-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState icon="📦" title="No hay pedidos aquí" subtitle="Cuando hagas un pedido aparecerá en esta sección." />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              highlighted={highlight === o.id}
              qr={qrByOrder[o.id]}
              paying={payingId === o.id}
              loadingQr={loadingQrId === o.id}
              onPay={handlePay}
              onShowQr={handleShowQr}
            />
          ))}
        </div>
      )}
    </div>
  )
}
