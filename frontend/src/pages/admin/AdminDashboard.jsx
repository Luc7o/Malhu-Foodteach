import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Receipt, ShoppingBag, TrendingUp, Wrench } from 'lucide-react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import AdminNav from '../../components/AdminNav'
import { PageLoader } from '../../components/ui'
import { money } from '../../lib/format'

function KpiCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-ink-900',
    warn: 'text-amber-600',
  }
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <Icon className="h-4 w-4 text-ink-300" aria-hidden="true" />
      </div>
      <p className={`font-display text-3xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

function SalesChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.total))
  return (
    <div className="panel p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink-700">Ventas de los últimos 7 días</h2>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {data.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-ink-600">
              {d.total > 0 ? money(d.total) : ''}
            </span>
            <div
              className="w-full min-h-[3px] rounded-t-md bg-brand-500 transition-all"
              style={{ height: `${Math.max(3, (d.total / max) * 100)}%` }}
              title={`${money(d.total)} · ${d.pedidos} pedidos`}
            />
            <span className="text-[11px] text-ink-400">
              {new Date(d.date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopProducts({ data }) {
  const max = Math.max(1, ...data.map((d) => d.cantidad))
  return (
    <div className="panel p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink-700">Productos más vendidos</h2>
      {data.length === 0 ? (
        <p className="text-sm text-ink-400">Aún no hay ventas.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-ink-800">{p.name}</span>
                <span className="text-ink-500">{p.cantidad}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-ink-800" style={{ width: `${(p.cantidad / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAdminStats(token).then(setStats).catch((e) => setError(e.message))
  }, [token])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Resumen del negocio.</p>
      <AdminNav />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      {!stats ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={TrendingUp} label="Ingresos totales" value={money(stats.ingresos_totales)} />
            <KpiCard
              icon={ShoppingBag}
              label="Por retirar"
              value={stats.pagadas_esperando_retiro}
              hint={`${stats.retiradas} ya retiradas`}
            />
            <KpiCard icon={Receipt} label="Pedidos totales" value={stats.total_ordenes} />
            <KpiCard
              icon={Wrench}
              label="Casillas en mantenimiento"
              value={stats.cajas.mantenimiento}
              tone={stats.cajas.mantenimiento > 0 ? 'warn' : 'default'}
              hint={stats.cajas.mantenimiento > 0 ? 'Hay comida sin retirar' : 'Todo en orden'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SalesChart data={stats.ventas_por_dia} />
            <TopProducts data={stats.top_productos} />
          </div>

          <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Boxes className="h-6 w-6 text-ink-400" aria-hidden="true" />
              <div>
                <p className="font-semibold text-ink-900">
                  {stats.cajas.libres} libres · {stats.cajas.ocupadas} ocupadas · {stats.cajas.mantenimiento} en mantenimiento
                </p>
                <p className="text-sm text-ink-500">Estado de todos los lockers</p>
              </div>
            </div>
            <Link to="/admin/lockers" className="btn-secondary">Ver lockers</Link>
          </div>
        </div>
      )}
    </div>
  )
}
