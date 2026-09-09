import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl">🧭</p>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Página no encontrada</h1>
      <p className="mt-2 text-ink-500">
        Parece que este pedido tomó un camino equivocado. Volvamos al catálogo.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Ir al catálogo
      </Link>
    </div>
  )
}
