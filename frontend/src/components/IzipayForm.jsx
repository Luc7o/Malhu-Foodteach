import { useEffect, useRef, useState } from 'react'
import KRGlue from '@lyracom/embedded-form-glue'
import { api } from '../api'
import { Spinner } from './ui'

/**
 * Formulario de pago incrustado de Izipay. Los datos de la tarjeta se escriben dentro del
 * formulario de Izipay y nunca pasan por nuestro servidor; aquí solo recibimos el resultado
 * firmado y el backend lo valida antes de dar el pedido por pagado.
 */
export default function IzipayForm({ token, orderId, onPaid }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const onPaidRef = useRef(onPaid)
  onPaidRef.current = onPaid

  useEffect(() => {
    let cancelled = false
    let kr = null

    async function start() {
      try {
        const { formToken, publicKey, endpoint } = await api.izipayFormToken(token, orderId)
        const { KR } = await KRGlue.loadLibrary(endpoint, publicKey)
        if (cancelled) return
        kr = KR
        await KR.setFormConfig({ formToken, 'kr-language': 'es-ES' })
        // Se ejecuta cuando el cliente termina de pagar. Devolver false evita la redirección.
        await KR.onSubmit(async (paymentData) => {
          setError('')
          try {
            const order = await api.izipayValidate(token, orderId, paymentData.rawClientAnswer, paymentData.hash)
            onPaidRef.current(order)
          } catch (e) {
            setError(e.message)
          }
          return false
        })
        await KR.onError((e) => setError(e?.errorMessage || 'No se pudo procesar el pago. Intenta de nuevo.'))
        const { result } = await KR.attachForm('#izipay-form')
        if (cancelled) return
        await KR.showForm(result.formId)
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'No se pudo cargar el formulario de pago.')
          setLoading(false)
        }
      }
    }
    start()

    return () => {
      cancelled = true
      try {
        kr?.removeForms()
      } catch {
        /* el formulario ya no estaba */
      }
    }
  }, [token, orderId])

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
          <Spinner className="h-4 w-4" /> Cargando formulario de pago seguro...
        </div>
      )}
      <div id="izipay-form">
        <div className="kr-smart-form" kr-card-form-expanded=""></div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
      )}
      <p className="mt-3 text-xs text-ink-500">Pago seguro con Izipay.</p>
    </div>
  )
}
