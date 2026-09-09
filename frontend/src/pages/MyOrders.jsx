import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function MyOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [qrByOrder, setQrByOrder] = useState({})
  const [error, setError] = useState('')

  function loadOrders() {
    api.getMyOrders(token).then(setOrders).catch((e) => setError(e.message))
  }

  useEffect(() => {
    if (token) loadOrders()
  }, [token])

  async function handlePay(orderId) {
    setError('')
    try {
      await api.payOrder(token, orderId)
      const qr = await api.getOrderQr(token, orderId)
      setQrByOrder((prev) => ({ ...prev, [orderId]: qr }))
      loadOrders()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleShowQr(orderId) {
    try {
      const qr = await api.getOrderQr(token, orderId)
      setQrByOrder((prev) => ({ ...prev, [orderId]: qr }))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Mis pedidos</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {orders.map((o) => (
        <div key={o.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
          <p>
            Pedido #{o.id.slice(0, 8)} — Estado: <b>{o.status}</b> — Total: S/. {o.total.toFixed(2)}
          </p>
          <ul>
            {o.items.map((it, idx) => (
              <li key={idx}>
                {it.product_name} x{it.quantity}
              </li>
            ))}
          </ul>

          {o.status === 'pendiente_pago' && (
            <button onClick={() => handlePay(o.id)}>Simular pago</button>
          )}

          {o.status === 'pagado' && !qrByOrder[o.id] && (
            <button onClick={() => handleShowQr(o.id)}>Ver código QR</button>
          )}

          {qrByOrder[o.id] && (
            <div>
              <p>Código: {qrByOrder[o.id].code}</p>
              <img src={qrByOrder[o.id].qr_image_base64} alt="QR de retiro" width={150} />
            </div>
          )}

          {o.status === 'retirado' && <p>✅ Ya fue retirado</p>}
        </div>
      ))}
    </div>
  )
}
