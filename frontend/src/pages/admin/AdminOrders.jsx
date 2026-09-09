import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { EmptyState, PageLoader, StatusBadge } from '../../components/ui'

const STATUS_FILTERS = [
  ['todos', 'Todos'],
  ['pendiente_pago', 'Pendiente de pago'],
  ['pagado', 'Pagado'],
  ['retirado', 'Retirado'],
  ['expirado', 'Expirado'],
  ['cancelado', 'Cancelado'],
]

export default function AdminOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getAdminOrders(token).then(setOrders).finally(() => setLoading(false))
  }, [token])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = status === 'todos' || o.status === status
      const matchesSearch =
        !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.pickup_code || '').toLowerCase().includes(search.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [orders, status, search])

  const totalIngresos = filtered
    .filter((o) => ['pagado', 'retirado'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0)

  if (loading) return <PageLoader label="Cargando órdenes..." />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-ink-900">Todas las órdenes</h2>
        <p className="text-sm text-ink-500">
          Mostrando <span className="font-semibold text-ink-800">{filtered.length}</span> · Ingresos:{' '}
          <span className="font-semibold text-brand-600">S/. {totalIngresos.toFixed(2)}</span>
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input sm:w-64"
          placeholder="Buscar por ID o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                status === value
                  ? 'bg-brand-600 text-white'
                  : 'border border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🧾" title="No hay órdenes" subtitle="Ajusta los filtros o espera nuevos pedidos." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Código QR</th>
                <th className="px-4 py-3">Caja</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-700">S/. {o.total.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{o.pickup_code || '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{o.box_number ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
