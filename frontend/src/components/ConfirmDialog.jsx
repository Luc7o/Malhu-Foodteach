import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'

const ConfirmContext = createContext(null)

/**
 * Reemplaza el confirm() del navegador por un diálogo propio.
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: '¿Cancelar el pedido?', message: '...', tone: 'danger' }))) return
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const cancelRef = useRef(null)

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    []
  )

  function close(result) {
    dialog?.resolve(result)
    setDialog(null)
  }

  useEffect(() => {
    if (!dialog) return undefined
    cancelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        dialog.resolve(false)
        setDialog(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  const danger = dialog?.tone === 'danger'
  const Icon = danger ? AlertTriangle : HelpCircle

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onMouseDown={(e) => e.target === e.currentTarget && close(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop">
            <div className="flex gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="confirm-title" className="text-lg font-bold text-ink-900">{dialog.title}</h2>
                {dialog.message && <p className="mt-1 text-sm text-ink-500">{dialog.message}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button ref={cancelRef} onClick={() => close(false)} className="btn-secondary">
                {dialog.cancelText || 'Volver'}
              </button>
              <button
                onClick={() => close(true)}
                className={danger ? 'btn border border-red-600 bg-red-600 text-white hover:bg-red-700' : 'btn-primary'}
              >
                {dialog.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
