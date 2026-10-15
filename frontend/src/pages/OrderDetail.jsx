import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Ban, Check, CircleCheck, Clock, Copy, CreditCard, Download, MapPin, Smartphone,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageLoader, Spinner, StatusBadge } from '../components/ui'
import IzipayForm from '../components/IzipayForm'
import { formatDateTime, formatDuration, money, shortId, useCountdown } from '../lib/format'

const METHODS = [
  ['tarjeta', 'Tarjeta', CreditCard],
  ['yape', 'Yape', Smartphone],
  ['plin', 'Plin', Smartphone],
]

const STEPS = ['Pedido creado', 'Pago', 'Retiro']

function currentStep(status) {
  if (status === 'pendiente_pago') return 1
  if (status === 'pagado') return 2
  if (status === 'retirado') return 3
  return -1
}

function Progress({ status }) {
  const step = currentStep(status)
  if (step < 0) return null
  return (
    <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Progreso del pedido">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
        return (
          <li key={label}>
            <div className={`h-1.5 rounded-full ${done ? 'bg-led-ok' : current ? 'bg-brand-500' : 'bg-ink-200'}`} />
            <p className={`mt-2 flex items-center gap-1.5 text-sm ${current ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>
              {done && <Check className="h-3.5 w-3.5 text-led-ok" aria-hidden="true" />}
              {label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Summary({ order }) {
  return (
    <aside className="panel h-fit p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink-700">Tu pedido</h2>
      <ul className="space-y-2 text-sm">
        {order.items.map((it, idx) => (
          <li key={idx} className="flex justify-between gap-3">
            <span className="text-ink-700">
              {it.product_name} <span className="text-ink-400">× {it.quantity}</span>
            </span>
            <span className="text-ink-600">{money(it.unit_price * it.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-3">
        <span className="font-semibold text-ink-700">Total</span>
        <span className="font-display text-xl font-bold text-ink-900">{money(order.total)}</span>
      </div>
      <div className="mt-4 flex items-start gap-2 border-t border-ink-200 pt-3 text-sm text-ink-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-ink-800">{order.locker_name}</p>
          {order.locker_address && <p className="text-ink-500">{order.locker_address}</p>}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400">Pedido #{shortId(order.id)} · {formatDateTime(order.created_at)}</p>
    </aside>
  )
}

function PaymentPanel({ order, remaining, config, token, onPay, onPaidOrder, onCancel, paying, canceling }) {
  const [method, setMethod] = useState('tarjeta')
  const simulated = config?.payment_provider === 'simulated'
  const izipay = config?.payment_provider === 'izipay'
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-ink-900">Paga tu pedido</h2>
        {remaining !== null && (
          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Se cancela en {formatDuration(remaining)}
          </p>
        )}
      </div>

      {!config && (
        <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
          <Spinner className="h-4 w-4" /> Cargando...
        </div>
      )}

      {izipay && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-ink-600">
            Total a pagar: <span className="font-bold text-ink-900">{money(order.total)}</span>
          </p>
          <IzipayForm token={token} orderId={order.id} onPaid={onPaidOrder} />
          <div className="mt-5">
            <button onClick={onCancel} disabled={canceling} className="btn-ghost">
              {canceling ? <Spinner className="h-4 w-4" /> : 'Cancelar pedido'}
            </button>
          </div>
        </div>
      )}

      {simulated && (
        <>
        <fieldset className="mt-5">
          <legend className="label">Método de pago</legend>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(([value, label, Icon]) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  method === value ? 'border-ink-900 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => setMethod(value)}
                  className="sr-only"
                />
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pago de prueba: no se cobra dinero real.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => onPay(method)} disabled={paying || canceling} className="btn-primary !px-6 !py-3">
            {paying ? <Spinner className="h-4 w-4" /> : `Pagar ${money(order.total)}`}
          </button>
          <button onClick={onCancel} disabled={paying || canceling} className="btn-ghost">
            {canceling ? <Spinner className="h-4 w-4" /> : 'Cancelar pedido'}
          </button>
        </div>
        </>
      )}
    </section>
  )
}

function PickupTicket({ order, qr, remaining }) {
  const toast = useToast()

  function copyCode() {
    navigator.clipboard?.writeText(qr.code)
    toast.success('Código copiado')
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <div className="flex items-end justify-between gap-4 bg-ink-800 px-6 py-5 text-white">
        <div>
          <p className="text-sm text-ink-300">Tu caja</p>
          <p className="font-display text-6xl font-extrabold leading-none">{order.box_number}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{order.locker_name}</p>
          {order.locker_address && <p className="text-ink-300">{order.locker_address}</p>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:items-start sm:gap-8">
        {qr ? (
          <img src={qr.qr_image_base64} alt={`Código QR ${qr.code}`} className="h-48 w-48 shrink-0 rounded-lg border border-ink-200 p-2" />
        ) : (
          <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-lg border border-ink-200">
            <Spinner className="h-6 w-6 text-brand-600" />
          </div>
        )}
        <div className="w-full text-center sm:text-left">
          <p className="text-sm text-ink-500">Código de retiro</p>
          <p className="font-mono text-xl font-bold tracking-wider text-ink-900">{order.pickup_code}</p>
          {remaining !== null && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-ink-600 sm:justify-start">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {remaining > 0 ? `Vence en ${formatDuration(remaining)}` : 'El código venció'}
            </p>
          )}
          {qr && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button onClick={copyCode} className="btn-secondary !py-2">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiar código
              </button>
              <a href={qr.qr_image_base64} download={`qr-${qr.code}.png`} className="btn-secondary !py-2">
                <Download className="h-4 w-4" aria-hidden="true" /> Descargar QR
              </a>
            </div>
          )}
        </div>
      </div>

      <ol className="space-y-2 border-t border-ink-200 bg-ink-50 px-6 py-5 text-sm text-ink-700">
        <li>1. Ve al locker {order.locker_name}.</li>
        <li>2. Acerca este QR al lector hasta que se ilumine.</li>
        <li>3. Recoge tu pedido en la caja {order.box_number}.</li>
      </ol>
    </section>
  )
}

function Notice({ tone, icon: Icon, title, children }) {
  const tones = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-ink-200 bg-white text-ink-800',
    bad: 'border-red-200 bg-red-50 text-red-900',
  }
  return (
    <section className={`flex gap-4 rounded-2xl border p-6 ${tones[tone]}`}>
      <Icon className="h-7 w-7 shrink-0" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </section>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [qr, setQr] = useState(null)
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      const o = await api.getOrder(token, id)
      setOrder(o)
      if (o.status === 'pagado' && o.pickup_code) {
        api.getOrderQr(token, id).then(setQr).catch(() => {})
      }
      return o
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [token, id])

  useEffect(() => {
    load()
    api.getConfig().then(setConfig).catch(() => {})
  }, [load])

  // Mientras el pedido siga en curso, revisa su estado cada 5 s (detecta el pago y el retiro).
  const status = order?.status
  useEffect(() => {
    if (status !== 'pendiente_pago' && status !== 'pagado') return undefined
    const timer = setInterval(async () => {
      const o = await api.getOrder(token, id).catch(() => null)
      if (o && o.status !== status) {
        setOrder(o)
        if (o.status === 'pagado') api.getOrderQr(token, id).then(setQr).catch(() => {})
        if (o.status === 'retirado') toast.success('¡Pedido retirado! Buen provecho.')
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [status, token, id, toast])

  const target =
    status === 'pendiente_pago' ? order.pending_expires_at : status === 'pagado' ? order.pickup_expires_at : null
  const remaining = useCountdown(target)

  async function handlePay(method) {
    setPaying(true)
    try {
      const paid = await api.payOrder(token, id, method)
      setOrder(paid)
      api.getOrderQr(token, id).then(setQr).catch(() => {})
      toast.success('Pago confirmado. Aquí está tu código QR.')
    } catch (e) {
      toast.error(e.message)
      load()
    } finally {
      setPaying(false)
    }
  }

  function handlePaidOrder(paid) {
    setOrder(paid)
    api.getOrderQr(token, id).then(setQr).catch(() => {})
    toast.success('Pago confirmado. Aquí está tu código QR.')
  }

  async function handleCancel() {
    setCanceling(true)
    try {
      setOrder(await api.cancelOrder(token, id))
      toast.info('Pedido cancelado')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCanceling(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink-700">{error}</p>
        <Link to="/orders" className="btn-secondary mt-4">Volver a mis pedidos</Link>
      </div>
    )
  }
  if (!order) return <PageLoader label="Cargando tu pedido..." />

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mis pedidos
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-ink-900">Pedido #{shortId(order.id)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <Progress status={order.status} />

      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <div>
          {order.status === 'pendiente_pago' && (
            <PaymentPanel
              order={order}
              remaining={remaining}
              config={config}
              token={token}
              onPay={handlePay}
              onPaidOrder={handlePaidOrder}
              onCancel={handleCancel}
              paying={paying}
              canceling={canceling}
            />
          )}
          {order.status === 'pagado' && <PickupTicket order={order} qr={qr} remaining={remaining} />}
          {order.status === 'retirado' && (
            <Notice tone="ok" icon={CircleCheck} title="Pedido retirado">
              Lo retiraste de la caja {order.box_number} el {formatDateTime(order.used_at)}. Buen provecho.
            </Notice>
          )}
          {order.status === 'expirado' && (
            <Notice tone="warn" icon={Clock} title="El código venció">
              Tu código de retiro venció el {formatDateTime(order.pickup_expires_at)} sin usarse. Comunícate con el
              administrador del locker para revisar tu pedido.
            </Notice>
          )}
          {order.status === 'cancelado' && (
            <Notice tone="bad" icon={Ban} title="Pedido cancelado">
              Este pedido ya no está activo. Puedes armar uno nuevo desde el menú.
            </Notice>
          )}
        </div>
        <Summary order={order} />
      </div>
    </div>
  )
}
