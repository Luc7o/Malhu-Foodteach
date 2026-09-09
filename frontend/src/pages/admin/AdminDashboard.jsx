import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/ui'

const CARD_CONFIG = [
  { key: 'total_ordenes', label: 'Total de órdenes', icon: '📦', color: 'from-blue-500 to-blue-600' },
  { key: 'pendientes_pago', label: 'Pendientes de pago', icon: '⏳', color: 'from-amber-500 to-amber-600' },
  { key: 'pagadas_esperando_retiro', label: 'Por retirar', icon: '🔒', color: 'from-purple-500 to-purple-600' },
  { key: 'retiradas', label: 'Retiradas', icon: '✅', color: 'from-emerald-500 to-emerald-600' },
  { key: 'ingresos_totales', label: 'Ingresos totales', icon: '💰', color: 'from-brand-500 to-brand-600', prefix: 'S/. ' },
  { key: 'productos_activos', label: 'Productos activos', icon: '🍔', color: 'from-pink-500 to-pink-600' },
  { key: 'lockers_activos', label: 'Lockers activos', icon: '🗄️', color: 'from-sky-500 to-sky-600' },
]

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAdminStats(token).then(setStats).catch((e) => setError(e.message))
  }, [token])

  if (error) return <p className="p-6 text-red-600">{error}</p>
  if (!stats) return <PageLoader label="Cargando estadísticas..." />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-ink-900">Dashboard</h2>
        <div className="flex gap-2">
          <Link to="/admin/products" className="btn-secondary">
            Gestionar productos
          </Link>
          <Link to="/admin/orders" className="btn-primary">
            Ver órdenes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CARD_CONFIG.map(({ key, label, icon, color, prefix }) => (
          <div key={key} className="card overflow-hidden p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${color}`}
            >
              {icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">
              {prefix}
              {typeof stats[key] === 'number' && key === 'ingresos_totales'
                ? stats[key].toFixed(2)
                : stats[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
