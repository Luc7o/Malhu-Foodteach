import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ProductImage, Spinner } from '../components/ui'

export default function Cart() {
  const { items, removeItem, incrementItem, total, clearCart } = useCart()
  const { token } = useAuth()
  const [lockers, setLockers] = useState([])
  const [lockerId, setLockerId] = useState('')
  const [error, setError] = useState('')
  const [loadingLockers, setLoadingLockers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    api
      .getLockers()
      .then((data) => {
        setLockers(data)
        const withSpace = data.find((l) => l.boxes_libres > 0)
        if (withSpace) setLockerId(withSpace.id)
        else if (data.length > 0) setLockerId(data[0].id)
      })
      .finally(() => setLoadingLockers(false))
  }, [])

  async function handleCheckout() {
    setError('')
    if (!token) {
      toast.info('Inicia sesión para completar tu pedido')
      navigate('/login')
      return
    }
    if (!lockerId) {
      setError('Elige un locker para retirar tu pedido')
      return
    }
    setSubmitting(true)
    try {
      const orderItems = items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }))
      const order = await api.createOrder(token, orderItems, lockerId)
      clearCart()
      toast.success('¡Pedido creado! Ahora simula el pago.')
      navigate(`/orders?highlight=${order.id}`)
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon="🛒"
          title="Tu carrito está vacío"
          subtitle="Explora el catálogo y agrega tus productos favoritos."
          action={
            <button onClick={() => navigate('/')} className="btn-primary mt-2">
              Ver catálogo
            </button>
          }
        />
      </div>
    )
  }

  const selectedLocker = lockers.find((l) => l.id === lockerId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="mb-6 text-2xl font-bold text-ink-900">Tu carrito</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          {items.map((i) => (
            <div key={i.product.id} className="card flex items-center gap-4 p-3">
              <ProductImage
                src={i.product.image_url}
                alt={i.product.name}
                className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{i.product.name}</p>
                <p className="text-sm text-ink-400">S/. {i.product.price.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center rounded-lg border border-ink-200">
                <button
                  onClick={() => incrementItem(i.product.id, -1)}
                  className="px-2.5 py-1.5 text-ink-500 hover:text-ink-800"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
                <button
                  onClick={() => incrementItem(i.product.id, 1)}
                  disabled={i.quantity >= (i.product.stock ?? Infinity)}
                  className="px-2.5 py-1.5 text-ink-500 hover:text-ink-800 disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <p className="w-20 text-right font-semibold text-ink-800">
                S/. {(i.product.price * i.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => removeItem(i.product.id)}
                className="text-ink-300 hover:text-red-500"
                aria-label="Quitar"
                title="Quitar del carrito"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        <div className="card sticky top-20 h-fit space-y-4 p-5">
          <h3 className="font-semibold text-ink-900">Resumen del pedido</h3>
          <div className="flex justify-between text-sm text-ink-500">
            <span>Subtotal</span>
            <span>S/. {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-bold text-ink-900">
            <span>Total</span>
            <span>S/. {total.toFixed(2)}</span>
          </div>

          <div>
            <label className="label">Locker de retiro</label>
            {loadingLockers ? (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <Spinner className="h-4 w-4" /> Buscando lockers...
              </div>
            ) : lockers.length === 0 ? (
              <p className="text-sm text-ink-400">No hay lockers disponibles.</p>
            ) : (
              <div className="space-y-2">
                {lockers.map((l) => (
                  <label
                    key={l.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                      lockerId === l.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-ink-200 hover:border-ink-300'
                    } ${l.boxes_libres === 0 ? 'opacity-50' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="locker"
                        value={l.id}
                        checked={lockerId === l.id}
                        disabled={l.boxes_libres === 0}
                        onChange={(e) => setLockerId(e.target.value)}
                        className="accent-brand-600"
                      />
                      <span>
                        <span className="block font-medium text-ink-800">{l.name}</span>
                        {l.address && <span className="block text-xs text-ink-400">{l.address}</span>}
                      </span>
                    </span>
                    <span
                      className={`badge ${
                        l.boxes_libres > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {l.boxes_libres} libres
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={submitting || !selectedLocker || selectedLocker.boxes_libres === 0}
            className="btn-primary w-full"
          >
            {submitting ? <Spinner className="h-4 w-4 text-white" /> : 'Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
