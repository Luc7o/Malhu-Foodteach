export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function PageLoader({ label = 'Cargando...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-400">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      {icon && <div className="text-5xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink-700">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-ink-400">{subtitle}</p>}
      {action}
    </div>
  )
}

const STATUS_MAP = {
  pendiente_pago: { label: 'Pendiente de pago', className: 'bg-amber-100 text-amber-700' },
  pagado: { label: 'Pagado — listo para retiro', className: 'bg-blue-100 text-blue-700' },
  retirado: { label: 'Retirado', className: 'bg-emerald-100 text-emerald-700' },
  expirado: { label: 'Expirado', className: 'bg-ink-100 text-ink-500' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-600' },
}

export function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, className: 'bg-ink-100 text-ink-600' }
  return <span className={`badge ${info.className}`}>{info.label}</span>
}

export function ProductImage({ src, alt, className = '' }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-3xl ${className}`}>
        🍔
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null
        e.currentTarget.src =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#fff7ed"/><text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle">🍔</text></svg>`
          )
      }}
    />
  )
}
