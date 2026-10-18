import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { lineKey } from './dish'

/**
 * Modo rápido de pruebas: cuando el backend está con PAYMENT_PROVIDER=simulated (pago de
 * prueba, no cobra dinero), al agregar un producto se crea el pedido en el primer locker con
 * cajas libres y se abre directo la página de pago, sin pasar por el carrito.
 *
 * Con cualquier otra pasarela (culqi, izipay) no hace nada y todo funciona como siempre,
 * así que volver al flujo normal es solo cambiar PAYMENT_PROVIDER en el backend.
 * Si falta algo (no hay locker libre, algo falla) lleva al carrito.
 */
export function useQuickCheckout() {
  const { token, guestLogin } = useAuth()
  const { items, clearCart } = useCart()
  const navigate = useNavigate()
  const toast = useToast()
  const busy = useRef(false)

  return async function quickCheckout(product, qty, options = []) {
    if (busy.current) return
    busy.current = true
    try {
      const config = await api.getConfig()
      if (config.payment_provider !== 'simulated') return

      // Sin sesión se compra como invitado sin pedir datos (en modo de prueba son opcionales)
      let authToken = token
      if (!authToken) {
        const session = await guestLogin('', '')
        authToken = session.token
      }

      // El pedido lleva lo que ya había en el carrito más lo que se acaba de agregar
      const key = lineKey(product.id, options.map((o) => o.id))
      const lines = items
        .filter((i) => i.key !== key)
        .map((i) => ({ product_id: i.product.id, quantity: i.quantity, option_ids: i.options.map((o) => o.id) }))
      const previous = items.find((i) => i.key === key)
      lines.push({
        product_id: product.id,
        quantity: Math.min((previous?.quantity || 0) + qty, product.stock ?? Infinity),
        option_ids: options.map((o) => o.id),
      })

      const lockers = await api.getLockers()
      const locker = lockers.find((l) => l.boxes_libres > 0)
      if (!locker) {
        navigate('/cart')
        return
      }
      const order = await api.createOrder(authToken, lines, locker.id)
      clearCart()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      toast.error(e.message)
      navigate('/cart')
    } finally {
      busy.current = false
    }
  }
}
