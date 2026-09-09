import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function AdminOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.getAdminOrders(token).then(setOrders)
  }, [token])

  return (
    <div style={{ padding: 16 }}>
      <h2>Todas las órdenes</h2>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>ID</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Código QR</th>
            <th>Caja</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id.slice(0, 8)}</td>
              <td>{o.status}</td>
              <td>S/. {o.total.toFixed(2)}</td>
              <td>{o.pickup_code || '-'}</td>
              <td>{o.box_number ?? '-'}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
