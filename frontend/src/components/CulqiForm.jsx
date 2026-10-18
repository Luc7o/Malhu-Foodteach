import { useEffect, useRef, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { api } from '../api'
import { money } from '../lib/format'
import { Spinner } from './ui'

const CULQI_SCRIPT = 'https://js.culqi.com/checkout-js'

// Carga el script de Culqi una sola vez (si falla, el siguiente intento lo vuelve a pedir)
let scriptPromise = null
function loadCulqi() {
  if (window.CulqiCheckout) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = CULQI_SCRIPT
      script.async = true
      script.onload = () => {
        if (window.CulqiCheckout) resolve()
        else {
          scriptPromise = null
          reject(new Error('No se pudo iniciar el pago con Culqi.'))
        }
      }
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('No se pudo cargar Culqi. Revisa tu conexión e intenta de nuevo.'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

/**
 * Pago con Culqi (tarjeta y Yape). Los datos de la tarjeta se escriben dentro del checkout
 * de Culqi y nunca pasan por nuestro servidor: aquí solo recibimos un token de un solo uso
 * (tkn_...) y el backend crea el cargo con la llave secreta antes de dar el pedido por pagado.
 */
export default function CulqiForm({ token, order, publicKey, email, onPaid }) {
  const [ready, setReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const culqiRef = useRef(null)
  const onPaidRef = useRef(onPaid)
  onPaidRef.current = onPaid

  useEffect(() => {
    if (!publicKey) {
      setError('El pago con Culqi no está configurado todavía.')
      return undefined
    }
    let cancelled = false
    setReady(false)

    loadCulqi()
      .then(() => {
        if (cancelled) return
        const config = {
          settings: {
            title: 'MALHÚ',
            currency: 'PEN',
            amount: Math.round(Number(order.total) * 100), // en céntimos (Yape lo exige)
          },
          client: email ? { email } : {},
          options: {
            lang: 'es',
            installments: false,
            modal: true,
            paymentMethods: { tarjeta: true, yape: true },
            paymentMethodsSort: ['tarjeta', 'yape'],
          },
          appearance: {
            theme: 'default',
            menuType: 'sidebar',
            buttonCardPayText: `Pagar ${money(order.total)}`,
            defaultStyle: {
              bannerColor: '#0F2A1D',
              buttonBackground: '#375534',
              buttonTextColor: '#FFFFFF',
              linksColor: '#375534',
              priceColor: '#0F2A1D',
            },
          },
        }
        const culqi = new window.CulqiCheckout(publicKey, config)

        // Culqi llama a esta función cuando termina de tokenizar (o si falla)
        culqi.culqi = async () => {
          if (culqi.token) {
            const tokenId = culqi.token.id
            culqi.close()
            setPaying(true)
            setError('')
            try {
              const paid = await api.culqiPay(token, order.id, tokenId)
              onPaidRef.current(paid)
            } catch (e) {
              setError(e.message)
            } finally {
              setPaying(false)
            }
          } else if (culqi.order) {
            culqi.close() // no usamos órdenes de pago (PagoEfectivo, etc.)
          } else if (culqi.error) {
            setError(culqi.error.user_message || culqi.error.merchant_message || 'No se pudo procesar el pago. Intenta de nuevo.')
          }
        }

        culqiRef.current = culqi
        setReady(true)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })

    return () => {
      cancelled = true
      try {
        culqiRef.current?.close()
      } catch {
        /* el checkout ya estaba cerrado */
      }
      culqiRef.current = null
    }
  }, [publicKey, order.id, order.total, email, token])

  function open() {
    setError('')
    try {
      culqiRef.current?.open()
    } catch {
      setError('No se pudo abrir el pago. Recarga la página e intenta de nuevo.')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={!ready || paying}
        className="btn-primary !px-6 !py-3"
      >
        {paying || (!ready && !error) ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <>
            <CreditCard className="h-4 w-4" aria-hidden="true" /> Pagar {money(order.total)}
          </>
        )}
      </button>
      <p className="mt-2 text-xs text-ink-500">
        {paying ? 'Confirmando tu pago...' : 'Tarjeta o Yape. Pago seguro con Culqi.'}
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
      )}
    </div>
  )
}
