import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Boxes, PackageX, Receipt, ShoppingBag, TrendingUp, Wifi, WifiOff, Wrench,
} from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import AdminNav from '../../components/AdminNav'
import { BarChart, Delta, HBarList, HourBars } from '../../components/Charts'
import { ADMIN_BASE } from '../../lib/appMode'
import { PageLoader } from '../../components/ui'
import { money, timeAgo } from '../../lib/format'

const RANGES = [
  [7, '7 días'],
  [30, '30 días'],
  [90, '3 meses'],
  [365, '12 meses'],
]

function KpiCard({ icon: Icon, label, value, children }) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon className="h-4 w-4 text-ink-300" aria-hidden="true" />
      </div>
      <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
      <div className="mt-1 min-h-[1rem] text-xs text-ink-400">{children}</div>
    </div>
  )
}

function chartLabel(granularity) {
  return (d, _i, long) => {
    const date = new Date(`${d.date}T00:00:00`)
    if (granularity === 'month') {
      return date.toLocaleDateString('es-PE', { month: 'short', ...(long ? { year: 'numeric' } : {}) })
    }
    if (granularity === 'week') {
      return long
        ? `Semana del ${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
        : date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    }
    return long
      ? date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })
      : date.toLocaleDateString('es-PE', { weekday: 'short' })
  }
}

function AlertsPanel({ alertas }) {
  const items = []
  if (alertas.agotados.length) {
    items.push({
      key: 'agotados',
      icon: PackageX,
      tone: 'text-red-700 bg-red-50',
      title: `${alertas.agotados.length} ${alertas.agotados.length === 1 ? 'producto agotado' : 'productos agotados'}`,
      detail: alertas.agotados.map((p) => p.name).join(', '),
      to: `${ADMIN_BASE}/products?filtro=agotados`,
    })
  }
  if (alertas.stock_bajo.length) {
    items.push({
      key: 'bajo',
      icon: AlertTriangle,
      tone: 'text-amber-800 bg-amber-50',
      title: `${alertas.stock_bajo.length} ${alertas.stock_bajo.length === 1 ? 'producto por agotarse' : 'productos por agotarse'}`,
      detail: alertas.stock_bajo.map((p) => `${p.name} (${p.stock})`).join(', '),
      to: `${ADMIN_BASE}/products?filtro=por_agotarse`,
    })
  }
  alertas.lockers_sin_senal.forEach((l) =>
    items.push({
      key: `lk-${l.id}`,
      icon: WifiOff,
      tone: 'text-red-700 bg-red-50',
      title: `${l.name} sin señal`,
      detail: `Último aviso ${timeAgo(l.last_seen)}. Revisa la energía y el WiFi del ESP32.`,
      to: `${ADMIN_BASE}/lockers`,
    })
  )
  if (alertas.cajas_mantenimiento > 0) {
    items.push({
      key: 'mant',
      icon: Wrench,
      tone: 'text-amber-800 bg-amber-50',
      title: `${alertas.cajas_mantenimiento} ${alertas.cajas_mantenimiento === 1 ? 'caja' : 'cajas'} en mantenimiento`,
      detail: 'Puede haber comida sin retirar. Vacía la caja y libérala.',
      to: `${ADMIN_BASE}/lockers`,
    })
  }

  return (
    <div className="panel p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink-700">Requiere tu atención</h2>
      {items.length === 0 ? (
        <p className="text-sm text-emerald-700">Todo en orden: sin alertas de stock, lockers ni cajas.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ key, icon: Icon, tone, title, detail, to }) => (
            <li key={key}>
              <Link to={to} className={`flex gap-3 rounded-xl p-3 transition hover:brightness-95 ${tone}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block truncate text-xs opacity-80">{detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [range, setRange] = useState(7)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getAdminStats(token, range)
      .then((data) => { if (!cancelled) { setStats(data); setError('') } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, range])

  const p = stats?.periodo

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Resumen del negocio.</p>
      <AdminNav />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      {!stats ? (
        !error && <PageLoader />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
              {RANGES.map(([value, label]) => (
                <button key={value} onClick={() => setRange(value)} className={range === value ? 'chip-on' : 'chip-off'}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-400">Ingresos de siempre: <strong className="text-ink-700">{money(stats.ingresos_totales)}</strong> · {stats.total_ordenes} pedidos</p>
          </div>

          <AlertsPanel alertas={stats.alertas} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={TrendingUp} label="Ingresos del periodo" value={money(p.ingresos)}>
              <Delta value={p.variacion_ingresos} />
            </KpiCard>
            <KpiCard icon={Receipt} label="Pedidos cobrados" value={p.pedidos}>
              <Delta value={p.variacion_pedidos} />
            </KpiCard>
            <KpiCard icon={ShoppingBag} label="Ticket promedio" value={money(p.ticket_promedio)}>
              Por pedido cobrado
            </KpiCard>
            <KpiCard icon={Boxes} label="Por retirar ahora" value={stats.pagadas_esperando_retiro}>
              {stats.retiradas} ya retirados · {stats.pendientes_pago} por pagar
            </KpiCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink-700">
                Ventas {stats.granularity === 'day' ? 'por día' : stats.granularity === 'week' ? 'por semana' : 'por mes'}
              </h2>
              <BarChart
                data={stats.ventas}
                value={(d) => d.total}
                label={chartLabel(stats.granularity)}
                format={money}
              />
            </div>
            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink-700">Productos más vendidos</h2>
              <HBarList
                items={stats.top_productos}
                name={(x) => x.name}
                value={(x) => x.cantidad}
                extra={(x) => money(x.ingresos)}
                format={(v) => `${v} u.`}
                emptyText="Aún no hay ventas en este periodo."
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink-700">Horas con más pedidos</h2>
              <HourBars data={stats.por_hora} />
            </div>
            <div className="panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink-700">Ventas por categoría</h2>
              <HBarList
                items={stats.por_categoria}
                name={(x) => x.name}
                value={(x) => x.ingresos}
                extra={(x) => `${x.cantidad} u.`}
                format={money}
                emptyText="Aún no hay ventas en este periodo."
              />
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-700">Lockers</h2>
              <Link to={`${ADMIN_BASE}/lockers`} className="text-sm font-semibold text-brand-600 hover:underline">Ver todos</Link>
            </div>
            {stats.lockers.length === 0 ? (
              <p className="text-sm text-ink-400">Aún no hay lockers activos.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {stats.lockers.map((l) => {
                  const used = l.total ? ((l.ocupadas + l.mantenimiento) / l.total) * 100 : 0
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
                      <div className="min-w-[10rem]">
                        <p className="font-semibold text-ink-900">{l.name}</p>
                        <p className={`flex items-center gap-1 text-xs ${l.online ? 'text-led-ok' : 'text-ink-400'}`}>
                          {l.online ? <Wifi className="h-3 w-3" aria-hidden="true" /> : <WifiOff className="h-3 w-3" aria-hidden="true" />}
                          {l.online ? 'en línea' : l.last_seen ? `sin señal · ${timeAgo(l.last_seen)}` : 'sin conectar aún'}
                        </p>
                      </div>
                      <div className="min-w-[10rem] flex-1">
                        <div className="mb-1 flex justify-between text-xs text-ink-500">
                          <span>{l.libres} libres · {l.ocupadas} ocupadas{l.mantenimiento ? ` · ${l.mantenimiento} en mant.` : ''}</span>
                          <span>{Math.round(used)}% en uso</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full rounded-full bg-led-busy" style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
