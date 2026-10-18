import { useEffect } from 'react'
import { X } from 'lucide-react'

/** Ventana emergente: se cierra con Esc, con la X o al hacer clic fuera. */
export default function Modal({ title, onClose, children, size = 'md', footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:max-h-[90dvh] sm:rounded-2xl ${widths[size]}`}>
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse justify-end gap-2 border-t border-ink-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:py-4">{footer}</div>}
      </div>
    </div>
  )
}
