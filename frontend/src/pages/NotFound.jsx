import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-extrabold text-ink-200">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">Esta página no existe</h1>
      <p className="mt-2 text-ink-500">Revisa la dirección o vuelve al menú para hacer tu pedido.</p>
      <Link to="/menu" className="btn-primary mt-6">Ir al menú</Link>
    </div>
  )
}
