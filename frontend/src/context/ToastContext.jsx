import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.9 3.9 6.7-6.7a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1.2 1.2 0 100 2.4A1.2 1.2 0 0010 5z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zM9 8a1 1 0 112 0 1 1 0 01-2 0zm.25 3a.75.75 0 000 1.5h.5v2h-.5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-.5v-2.75a.75.75 0 00-.75-.75h-1.25z" clipRule="evenodd" />
    </svg>
  ),
}

const STYLES = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-ink-800',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => remove(id), 3200)
    },
    [remove]
  )

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-slide-in items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-pop ${STYLES[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-white/70 hover:text-white">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
