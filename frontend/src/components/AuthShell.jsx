import { Link } from 'react-router-dom'
import { Logo, LockerBay } from './ui'

const DEMO_BOXES = [
  { id: 1, box_number: 1, status: 'ocupado' },
  { id: 2, box_number: 2, status: 'libre' },
  { id: 3, box_number: 3, status: 'libre' },
  { id: 4, box_number: 4, status: 'libre' },
  { id: 5, box_number: 5, status: 'ocupado' },
  { id: 6, box_number: 6, status: 'libre' },
]

/** Estructura compartida por Login y Registro: formulario a la derecha, locker a la izquierda. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-2">
      <div className="hidden lg:block">
        <LockerBay boxes={DEMO_BOXES} className="max-w-md" />
        <p className="mt-5 max-w-md text-lg font-medium text-ink-700">
          Tu pedido queda guardado en una caja. Solo tu código la abre.
        </p>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="mb-8 inline-block" aria-label="Ir al inicio">
          <Logo />
        </Link>
        <h1 className="text-3xl font-bold text-ink-900">{title}</h1>
        <p className="mt-1 text-ink-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 text-sm text-ink-600">{footer}</div>
      </div>
    </div>
  )
}
