import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { EmptyState, PageLoader, StatusBadge } from '../components/ui'
import { formatDateTime, money, shortId } from '../lib/format'

const FILTERS = [
  ['todos', 'Todos'],
  ['pendiente_pago', 'Por pagar'],
  ['pagado', 'Por retirar'],
  ['retirado', 'Retirados'],
]

const ACTION_LABEL = {
  pendiente_pago: 'Pagar',
  pagado: 'Ver QR',
}

export default function MyOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos')

  useEffect(() => {
    api
      .getMyOrders(token)
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = orders.filter((o) => filter === 'todos' || o.status === filter)

  if (loading) return <PageLoader label="Cargando tus pedidos..." />

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-5 text-3xl font-bold text-ink-900">Mis pedidos</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)} className={filter === value ? 'chip-on' : 'chip-off'}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aquí no hay pedidos"
          subtitle="Cuando hagas un pedido lo verás en esta lista."
          action={<Link to="/menu" className="btn-primary mt-2">Ver el menú</Link>}
        />
      ) : (
        <ul className="divide-y divide-ink-200 rounded-2xl border border-ink-200 bg-white">
          {filtered.map((o) => {
            const count = o.items.reduce((s, i) => s + i.quantity, 0)
            return (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-ink-50 sm:flex-nowrap">
                  <div className="min-w-0 basis-[calc(100%-2rem)] flex-1 sm:basis-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-900">#{shortId(o.id)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-500">
                      {o.items.map((i) => `${i.quantity} × ${i.product_name}${i.options?.length ? ` (${i.options.map((x) => x.name).join(', ')})` : ''}`).join(', ')}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatDateTime(o.created_at)} · {count} {count === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display font-bold text-ink-900">{money(o.total)}</p>
                    {ACTION_LABEL[o.status] && (
                      <p className="text-sm font-semibold text-brand-600">{ACTION_LABEL[o.status]}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
