import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ProductImage } from '../components/ui'

function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-40 animate-pulse bg-ink-100" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-8 w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1)
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-40 w-full overflow-hidden bg-ink-50">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2.5 py-1 text-xs font-semibold text-white">
            Sin stock
          </span>
        )}
        {lowStock && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">
            ¡Quedan {product.stock}!
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-ink-900">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 flex-1 text-sm text-ink-500">{product.description}</p>
        )}
        <p className="text-lg font-bold text-brand-600">S/. {product.price.toFixed(2)}</p>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <div className="flex items-center rounded-lg border border-ink-200">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-2.5 py-1.5 text-ink-500 hover:text-ink-800 disabled:opacity-40"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              disabled={outOfStock || qty >= product.stock}
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              className="px-2.5 py-1.5 text-ink-500 hover:text-ink-800 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            onClick={() => {
              onAdd(product, qty)
              setQty(1)
            }}
            disabled={outOfStock}
            className="btn-primary flex-1 !py-2"
          >
            {outOfStock ? 'Agotado' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('default')
  const { addItem } = useCart()
  const toast = useToast()

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const visibleProducts = useMemo(() => {
    let list = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
    )
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, search, sort])

  function handleAdd(product, qty) {
    addItem(product, qty)
    toast.success(`${qty} x ${product.name} agregado al carrito`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-10 text-white shadow-card sm:px-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Pide y retira en minutos 🍱</h1>
        <p className="mt-2 max-w-xl text-brand-50">
          Elige tus productos, paga en línea y recógelos en el locker inteligente más cercano —
          sin filas.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-ink-900">Catálogo</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input sm:w-64"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input sm:w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">Orden: recomendado</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name">Nombre: A-Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="No encontramos productos"
          subtitle="Prueba con otra búsqueda o vuelve más tarde."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  )
}
