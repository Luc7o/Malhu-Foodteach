import { useEffect, useRef, useState } from 'react'
import { Download, Search, UserCheck, UserX, Users } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { EmptyState, PageLoader, Spinner, StatusBadge } from '../../components/ui'
import { formatDate, formatDateTime, money, shortId, timeAgo } from '../../lib/format'

const PER_PAGE = 20

const STATUS_FILTERS = [
  ['todos', 'Todos'],
  ['activos', 'Activos'],
  ['inactivos', 'Desactivados'],
]

function CustomerDetail({ id, onClose, onToggle, busy }) {
  const { token } = useAuth()
  const toast = useToast()
  const [customer, setCustomer] = useState(null)

  useEffect(() => {
    api.getCustomer(token, id).then(setCustomer).catch((e) => { toast.error(e.message); onClose() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id])

  return (
    <Modal title={customer ? customer.name : 'Cliente'} onClose={onClose} size="lg">
      {!customer ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-500">{customer.email}</p>
              <p className="mt-1 text-xs text-ink-400">
                Registrado el {formatDate(customer.created_at)} · Último acceso {customer.last_login_at ? timeAgo(customer.last_login_at) : 'nunca'}
              </p>
            </div>
            <span className={`badge ${customer.active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {customer.active ? 'Cuenta activa' : 'Cuenta desactivada'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="font-display text-xl font-bold text-ink-900">{customer.orders_count}</p>
              <p className="text-xs text-ink-500">pedidos</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="font-display text-xl font-bold text-ink-900">{money(customer.total_spent)}</p>
              <p className="text-xs text-ink-500">gastado</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="font-display text-xl font-bold text-ink-900">{customer.last_order_at ? timeAgo(customer.last_order_at).replace('hace ', '') : '—'}</p>
              <p className="text-xs text-ink-500">desde su último pedido</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Pedidos recientes</p>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-ink-400">Todavía no hizo pedidos.</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 text-sm">
                {customer.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <span className="font-mono text-xs font-semibold text-ink-700">#{shortId(o.id)}</span>
                    <span className="flex-1 truncate text-ink-600">{o.items.map((i) => `${i.quantity}× ${i.product_name}${i.options?.length ? ` (${i.options.map((x) => x.name).join(', ')})` : ''}`).join(', ')}</span>
                    <span className="text-ink-400">{formatDateTime(o.created_at)}</span>
                    <span className="font-semibold text-ink-900">{money(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => { if (await onToggle(customer)) setCustomer((c) => ({ ...c, active: !c.active })) }}
              disabled={busy}
              className={customer.active ? 'btn-danger' : 'btn-secondary'}
            >
              {busy ? <Spinner className="h-4 w-4" /> : customer.active ? <UserX className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
              {customer.active ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function AdminCustomers() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [filters, setFilters] = useState({ status: 'todos', sort: 'reciente', q: '' })
  const [qInput, setQInput] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestId = useRef(0)

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
    api.getCustomers(token, { ...filters, page, per_page: PER_PAGE })
      .then((res) => { if (current === requestId.current) setData(res) })
      .catch((e) => { if (current === requestId.current) toast.error(e.message) })
      .finally(() => { if (current === requestId.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters, page, reloadKey])

  function setFilter(patch) {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  async function toggleActive(customer) {
    const disabling = customer.active
    const ok = await confirm({
      title: disabling ? `¿Desactivar la cuenta de ${customer.name}?` : `¿Reactivar la cuenta de ${customer.name}?`,
      message: disabling
        ? 'No podrá iniciar sesión ni hacer pedidos nuevos, y su sesión actual se cierra. Sus pedidos anteriores se conservan.'
        : 'Podrá volver a iniciar sesión y hacer pedidos.',
      confirmText: disabling ? 'Desactivar' : 'Reactivar',
      tone: disabling ? 'danger' : 'default',
    })
    if (!ok) return false
    setBusyId(customer.id)
    try {
      await api.setCustomerActive(token, customer.id, !customer.active)
      toast.success(disabling ? 'Cuenta desactivada' : 'Cuenta reactivada')
      setReloadKey((k) => k + 1)
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await api.exportCustomers(token, filters)
      toast.success('Descarga lista')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const customers = data?.items || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Clientes registrados en la tienda.</p>
      <AdminNav />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(([value, label]) => (
          <button key={value} onClick={() => setFilter({ status: value })} className={filters.status === value ? 'chip-on' : 'chip-off'}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input className="input !pl-9" placeholder="Buscar por nombre o correo" aria-label="Buscar clientes" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <select className="input sm:w-52" aria-label="Ordenar clientes" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
          <option value="reciente">Más recientes</option>
          <option value="gasto">Los que más gastaron</option>
          <option value="pedidos">Los que más piden</option>
          <option value="nombre">Nombre (A-Z)</option>
        </select>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary sm:ml-auto">
          {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" aria-hidden="true" />} Exportar CSV
        </button>
      </div>

      {!data ? (
        <PageLoader />
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No hay clientes con esos filtros" />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Pedidos</th>
                  <th className="px-4 py-3 font-medium">Gastado</th>
                  <th className="px-4 py-3 font-medium">Último pedido</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3 font-medium">Cuenta</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {customers.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setSelectedId(c.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">{c.name}</p>
                      <p className="text-xs text-ink-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{c.orders_count}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{money(c.total_spent)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">{c.last_order_at ? timeAgo(c.last_order_at) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{c.active ? 'Activa' : 'Desactivada'}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleActive(c)} disabled={busyId === c.id} className={`!px-3 !py-1.5 text-xs ${c.active ? 'btn-danger' : 'btn-secondary'}`}>
                        {busyId === c.id ? <Spinner className="h-3.5 w-3.5" /> : c.active ? <UserX className="h-3.5 w-3.5" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                        {c.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page} onPage={setPage} />
        </div>
      )}

      {selectedId && (
        <CustomerDetail
          id={selectedId}
          busy={busyId === selectedId}
          onClose={() => { setSelectedId(null); setReloadKey((k) => k + 1) }}
          onToggle={toggleActive}
        />
      )}
    </div>
  )
}
