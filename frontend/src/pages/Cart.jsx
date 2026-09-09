import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, removeItem, total, clearCart } = useCart()
  const { token } = useAuth()
  const [lockers, setLockers] = useState([])
  const [lockerId, setLockerId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.getLockers().then((data) => {
      setLockers(data)
      if (data.length > 0) setLockerId(data[0].id)
    })
  }, [])

  async function handleCheckout() {
    setError('')
    if (!token) {
      navigate('/login')
      return
    }
    if (!lockerId) {
      setError('Elige un locker para retirar tu pedido')
      return
    }
    try {
      const orderItems = items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }))
      const order = await api.createOrder(token, orderItems, lockerId)
      clearCart()
      navigate(`/orders?highlight=${order.id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Carrito</h2>
      {items.length === 0 && <p>Tu carrito está vacío.</p>}
      {items.map((i) => (
        <div key={i.product.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{i.product.name}</span>
          <span>x{i.quantity}</span>
          <span>S/. {(i.product.price * i.quantity).toFixed(2)}</span>
          <button onClick={() => removeItem(i.product.id)}>Quitar</button>
        </div>
      ))}

      {items.length > 0 && (
        <>
          <h3>Total: S/. {total.toFixed(2)}</h3>

          <label>
            Locker de retiro:{' '}
            <select value={lockerId} onChange={(e) => setLockerId(e.target.value)}>
              {lockers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.boxes_libres} cajas libres
                </option>
              ))}
            </select>
          </label>
          <br />
          <button onClick={handleCheckout}>Confirmar pedido</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
      )}
    </div>
  )
}
