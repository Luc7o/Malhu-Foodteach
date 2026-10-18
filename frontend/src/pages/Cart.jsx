import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, MapPin } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, LockerMini, ProductImage, Spinner } from '../components/ui'
import { money } from '../lib/format'
import { kcal, nutritionTotals, unitPrice } from '../lib/dish'

function LockerOption({ locker, selected, onSelect }) {
  const full = locker.boxes_libres === 0
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
        selected ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-300'
      } ${full ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        type="radio"
        name="locker"
        value={locker.id}
        checked={selected}
        disabled={full}
        onChange={() => onSelect(locker.id)}
        className="mt-1 accent-brand-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900">{locker.name}</span>
        {locker.address && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{locker.address}</span>
          </span>
        )}
        <span className="mt-2 flex items-center gap-2 text-xs text-ink-600">
          <LockerMini boxes={locker.boxes} />
          {full ? 'Sin cajas libres' : `${locker.boxes_libres} de ${locker.boxes_total} libres`}
        </span>
      </span>
    </label>
  )
}

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
      })
      .catch((e) => setError(e.message))
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
      const orderItems = items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        option_ids: i.options.map((o) => o.id),
      }))
      const order = await api.createOrder(token, orderItems, lockerId)
      clearCart()
      navigate(`/orders/${order.id}`)
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
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          subtitle="Agrega algo del menú y aquí verás el resumen de tu pedido."
          action={<Link to="/menu" className="btn-primary mt-2">Ver el menú</Link>}
        />
      </div>
    )
  }

  const selectedLocker = lockers.find((l) => l.id === lockerId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-ink-900">Tu carrito</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-ink-200 self-start rounded-2xl border border-ink-200 bg-white">
          {items.map((i) => {
            const price = unitPrice(i.product, i.options)
            const totals = nutritionTotals(i.product, i.options)
            return (
            <li key={i.key} className="flex flex-wrap items-center gap-x-3 gap-y-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
              <ProductImage
                src={i.product.image_url}
                alt={i.product.name}
                category={i.product.category}
                className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
                <p className="truncate font-semibold text-ink-900">{i.product.name}</p>
                {i.options.length > 0 && (
                  <p className="text-sm text-ink-600">{i.options.map((o) => o.name).join(' · ')}</p>
                )}
                <p className="text-sm text-ink-500">
                  {money(price)} c/u
                  {totals && (
                    <span className="ml-2 font-semibold text-amber-700" title={totals.complete ? 'Calorías por unidad' : 'Calorías aproximadas por unidad'}>
                      {totals.complete ? '' : '≈ '}{kcal(totals.calories)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center rounded-[10px] border border-ink-200">
                <button
                  onClick={() => incrementItem(i.key, -1)}
                  disabled={i.quantity <= 1}
                  className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30"
                  aria-label="Quitar una unidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                <button
                  onClick={() => incrementItem(i.key, 1)}
                  disabled={i.quantity >= (i.product.stock ?? Infinity)}
                  className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30"
                  aria-label="Agregar una unidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="ml-auto w-20 text-right font-display font-bold text-ink-900 sm:ml-0">
                {money(price * i.quantity)}
              </p>
              <button
                onClick={() => removeItem(i.key)}
                className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar ${i.product.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
            )
          })}
        </ul>

        <aside className="panel h-fit space-y-5 p-4 sm:p-5 md:sticky md:top-20">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink-700">Retira en</h2>
            {loadingLockers ? (
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <Spinner className="h-4 w-4" /> Buscando lockers...
              </div>
            ) : lockers.length === 0 ? (
              <p className="text-sm text-ink-500">Por ahora no hay lockers disponibles.</p>
            ) : (
              <div className="space-y-2">
                {lockers.map((l) => (
                  <LockerOption key={l.id} locker={l} selected={lockerId === l.id} onSelect={setLockerId} />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between border-t border-ink-200 pt-4">
            <span className="font-semibold text-ink-700">Total</span>
            <span className="font-display text-2xl font-bold text-ink-900">{money(total)}</span>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
          )}

          <div>
            <button
              onClick={handleCheckout}
              disabled={submitting || !selectedLocker || selectedLocker.boxes_libres === 0}
              className="btn-primary w-full !py-3"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : 'Confirmar pedido'}
            </button>
            <p className="mt-2 text-center text-xs text-ink-500">El pago se hace en el siguiente paso.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
