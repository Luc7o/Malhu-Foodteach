import { useEffect, useMemo } from 'react'
import { Check, Lock, ShoppingBag } from 'lucide-react'

const COLORS = ['#7DBE8A', '#F28C4B', '#E9A23B', '#4F8FBF', '#D9644A', '#E3EED4']
const AUTO_CLOSE_MS = 15000

// Números "al azar" fijos (así el confeti no cambia en cada render).
const rnd = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Escena a pantalla completa cuando se confirma la compra:
 * se abre la caja asignada, el pedido cae adentro, la puerta se cierra,
 * el LED pasa de azul (libre) a rojo (ocupada) y cae confeti.
 */
export default function LockerPurchaseScene({ boxNumber, lockerName, onClose }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: `${Math.round(rnd(i, 1) * 100)}%`,
        size: 6 + Math.round(rnd(i, 2) * 8),
        color: COLORS[i % COLORS.length],
        delay: (3.5 + rnd(i, 3) * 1.4).toFixed(2),
        dur: (2.6 + rnd(i, 4) * 2).toFixed(2),
        drift: `${Math.round((rnd(i, 5) - 0.5) * 160)}px`,
        round: i % 3 === 0,
      })),
    []
  )

  useEffect(() => {
    const t = setTimeout(onClose, AUTO_CLOSE_MS)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink-900/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Compra confirmada: tu pedido está en la caja ${boxNumber}`}
      onClick={onClose}
    >
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece absolute top-0 block"
            style={{
              left: c.left,
              width: c.size,
              height: c.round ? c.size : c.size * 0.55,
              backgroundColor: c.color,
              borderRadius: c.round ? '9999px' : '2px',
              '--delay': `${c.delay}s`,
              '--dur': `${c.dur}s`,
              '--drift': c.drift,
            }}
          />
        ))}
      </div>

      <div className="relative my-auto w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-52 rounded-2xl bg-ink-800 p-3 shadow-pop ring-1 ring-white/10">
          <div className="mb-2 px-1 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-300">{lockerName}</div>
          <div className="relative aspect-[4/5] [perspective:800px]">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg bg-brand-600 ring-2 ring-amber-300/80">
              <ShoppingBag className="bag-drop h-1/2 w-1/2 text-brand-100" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div
              className="door-cycle absolute inset-0 origin-left rounded-lg border border-ink-300 bg-ink-100"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="led-busy-anim absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#2f7dff' }} />
              <span className="absolute inset-0 flex items-center justify-center font-display text-6xl font-bold text-ink-700">
                {boxNumber}
              </span>
              <span className="absolute right-2 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-ink-300" />
            </div>
          </div>
        </div>

        <div className="mt-6" aria-live="polite">
          <span className="pop-in mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-pop">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
          </span>
          <div className="rise-in">
            <h2 className="mt-3 font-display text-3xl font-bold text-white">¡Compra confirmada!</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-ink-200">
              <Lock className="h-4 w-4" aria-hidden="true" /> Tu pedido está reservado en la caja {boxNumber}
            </p>
            <button type="button" onClick={onClose} className="btn mt-5 bg-brand-100 !px-8 !py-2.5 text-brand-900 hover:bg-white">
              Ver mi código QR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
