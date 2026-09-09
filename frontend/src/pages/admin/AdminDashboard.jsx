import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.getAdminStats(token).then(setStats)
  }, [token])

  if (!stats) return <p>Cargando...</p>

  const cards = [
    ['Total de órdenes', stats.total_ordenes],
    ['Pagadas, esperando retiro', stats.pagadas_esperando_retiro],
    ['Retiradas', stats.retiradas],
    ['Pendientes de pago', stats.pendientes_pago],
    ['Ingresos totales', `S/. ${stats.ingresos_totales.toFixed(2)}`],
    ['Productos activos', stats.productos_activos],
    ['Lockers activos', stats.lockers_activos],
  ]

  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {cards.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #ccc', padding: 12 }}>
            <p style={{ fontSize: 12, color: '#666' }}>{label}</p>
            <p style={{ fontSize: 24 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
