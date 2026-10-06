import { useState } from 'react'
import {
  CupSoda, Cookie, Salad, Sandwich, UtensilsCrossed, ShoppingBag, Wrench, Loader2,
} from 'lucide-react'
import { ICON_GREEN, ICON_WHITE } from '../assets/brand-icon'
import { assetUrl } from '../api'

/**
 * Logo oficial de MALHÚ. `tone="dark"` usa el ícono verde (para fondos claros,
 * la mayoría de la app); `tone="light"` usa el ícono blanco (para fondos oscuros,
 * como el hero o el pie de página si se oscurece).
 */
export function Logo({ className = '', tone = 'dark', tagline = true }) {
  const icon = tone === 'light' ? ICON_WHITE : ICON_GREEN
  const textColor = tone === 'light' ? 'text-white' : 'text-ink-900'
  const taglineColor = tone === 'light' ? 'text-white/60' : 'text-ink-400'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={icon} alt="" aria-hidden="true" className="h-9 w-auto shrink-0" />
      <span className={`font-display text-xl font-bold tracking-tight ${textColor}`}>
        MALHÚ
        {tagline && (
          <span className={`ml-1.5 hidden text-[11px] font-sans font-semibold uppercase tracking-wide ${taglineColor} sm:inline`}>
            Coffee break &amp; Catering
          </span>
        )}
      </span>
    </span>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
}

export function PageLoader({ label = 'Cargando...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-400" role="status">
      <Spinner className="h-7 w-7 text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-300 px-6 py-14 text-center">
      {Icon && <Icon className="h-9 w-9 text-ink-300" strokeWidth={1.5} aria-hidden="true" />}
      <h3 className="text-lg font-semibold text-ink-800">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-ink-500">{subtitle}</p>}
      {action}
    </div>
  )
}

const STATUS_MAP = {
  pendiente_pago: { label: 'Pendiente de pago', dot: 'bg-led-service', className: 'bg-amber-50 text-amber-800' },
  pagado: { label: 'Listo para retirar', dot: 'bg-led-free', className: 'bg-blue-50 text-blue-800' },
  retirado: { label: 'Retirado', dot: 'bg-led-ok', className: 'bg-emerald-50 text-emerald-800' },
  expirado: { label: 'Vencido', dot: 'bg-ink-400', className: 'bg-ink-100 text-ink-600' },
  cancelado: { label: 'Cancelado', dot: 'bg-led-busy', className: 'bg-red-50 text-red-700' },
}

export function statusInfo(status) {
  return STATUS_MAP[status] || { label: status, dot: 'bg-ink-400', className: 'bg-ink-100 text-ink-600' }
}

export function StatusBadge({ status }) {
  const info = statusInfo(status)
  return (
    <span className={`badge ${info.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} aria-hidden="true" />
      {info.label}
    </span>
  )
}

const CATEGORY_ICONS = {
  sándwiches: Sandwich,
  sandwiches: Sandwich,
  ensaladas: Salad,
  bebidas: CupSoda,
  postres: Cookie,
}

export function categoryIcon(category) {
  return CATEGORY_ICONS[(category || '').toLowerCase()] || UtensilsCrossed
}

export function ProductImage({ src, alt, category, className = '' }) {
  const [failed, setFailed] = useState(false)
  const Icon = categoryIcon(category)
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-brand-50 text-brand-300 ${className}`}>
        <Icon className="h-1/3 w-1/3 max-h-12 max-w-12 min-h-5 min-w-5" strokeWidth={1.5} aria-hidden="true" />
      </div>
    )
  }
  return <img src={assetUrl(src)} alt={alt} className={className} onError={() => setFailed(true)} />
}

const LED = {
  libre: 'bg-led-free shadow-[0_0_6px_1px_rgb(47_125_255/0.7)]',
  ocupado: 'bg-led-busy shadow-[0_0_6px_1px_rgb(229_72_77/0.6)]',
  mantenimiento: 'bg-led-service shadow-[0_0_6px_1px_rgb(245_165_36/0.6)]',
}

/**
 * Gabinete de casilleros. Cada puerta muestra su número y un LED:
 * azul = libre, rojo = ocupada, ámbar = mantenimiento (igual que el prototipo físico).
 * Al pasar el cursor sobre una caja libre la puerta se abre.
 */
export function LockerBay({ boxes, columns = 3, demo = false, className = '' }) {
  const firstFree = boxes.find((b) => b.status === 'libre')
  return (
    <div
      className={`rounded-2xl bg-ink-800 p-3 sm:p-4 ${className}`}
      role="img"
      aria-label={`Locker con ${boxes.length} cajas, ${boxes.filter((b) => b.status === 'libre').length} libres`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="h-2 w-16 rounded-full bg-ink-700" />
        <span className="flex h-5 w-9 items-center justify-center rounded bg-ink-900">
          <span className="h-0.5 w-6 animate-led-pulse bg-led-free" />
        </span>
      </div>
      <div
        className="grid gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {boxes.map((box) => {
          const free = box.status === 'libre'
          return (
            <div key={box.id || box.box_number} className="group relative aspect-[4/5] [perspective:700px]">
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-brand-600">
                <ShoppingBag className="h-1/3 w-1/3 text-brand-100" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div
                className={`absolute inset-0 origin-left rounded-lg border border-ink-300 bg-ink-100 transition-transform duration-500 ease-out ${
                  free ? 'group-hover:[transform:rotateY(-58deg)]' : ''
                } ${demo && firstFree && box.box_number === firstFree.box_number ? 'door-demo' : ''}`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${LED[box.status] || LED.ocupado}`} />
                <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold text-ink-700 sm:text-4xl">
                  {box.box_number}
                </span>
                {box.status === 'mantenimiento' && (
                  <Wrench className="absolute bottom-2 left-2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                )}
                <span className="absolute right-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-ink-300" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Versión compacta: una fila de cuadritos con el estado de cada caja. */
export function LockerMini({ boxes }) {
  const color = { libre: 'bg-led-free', ocupado: 'bg-led-busy', mantenimiento: 'bg-led-service' }
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {boxes.map((b) => (
        <span key={b.id} className={`h-2.5 w-2.5 rounded-[3px] ${color[b.status] || 'bg-ink-300'}`} />
      ))}
    </span>
  )
}
