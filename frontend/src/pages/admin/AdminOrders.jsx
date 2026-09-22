import { useEffect, useMemo, useState } from 'react'
import { Ban, Receipt, Search } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { EmptyState, PageLoader, Spinner, StatusBadge } from '../../components/ui'
import { formatDateTime, money, shortId } from '../../lib/format'

const FILTERS = [
  ['todos', 'Todos'],
  ['pendiente_pago', 'Por pagar'],
  ['pagado', 'Por retirar'],
  ['retirado', 'Retirados'],
  ['expirado', 'Vencidos'],
  ['cancelado', 'Cancelados'],
]

export default function AdminOrders() {
  const { token } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    api.getAdminOrders(token).then(setOrders).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        (filter === 'todos' || o.status === filter) &&
        (!q ||
          o.id.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q))
    )
  }, [orders, filter, search])

  async function handleCancel(order) {
    if (!confirm(`¿Cancelar el pedido #${shortId(order.id)}?`)) return
    setBusyId(order.id)
    try {
      await api.cancelAdminOrder(token, order.id)
      toast.success('Pedido cancelado')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Todos los pedidos de la tienda.</p>
      <AdminNav />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={filter === value ? 'chip-on' : 'chip-off'}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            className="input !pl-9"
            placeholder="Buscar cliente o ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No hay pedidos con ese filtro" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
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
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink-700">
                    #{shortId(o.id)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{o.customer_name}</p>
                    <p className="text-xs text-ink-400">{o.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{o.locker_name}{o.box_number ? ` · Caja ${o.box_number}` : ''}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{money(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {(o.status === 'pendiente_pago' || o.status === 'pagado') && (
                      <button
                        onClick={() => handleCancel(o)}
                        disabled={busyId === o.id}
                        className="btn-danger !px-3 !py-1.5 text-xs"
                      >
                        {busyId === o.id ? <Spinner className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
