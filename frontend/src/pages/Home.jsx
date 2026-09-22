import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, LockerBay, ProductImage } from '../components/ui'
import { money } from '../lib/format'

const SAMPLE_BOXES = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  box_number: i + 1,
  status: 'libre',
}))

const STEPS = [
  ['1', 'Elige y paga', 'Arma tu pedido y págalo desde el celular.'],
  ['2', 'Recibe tu QR', 'Se asigna una caja y aparece tu código de retiro.'],
  ['3', 'Escanea y abre', 'Acerca el QR al lector del locker y recoge tu comida.'],
]

function Hero({ locker }) {
  const boxes = locker?.boxes?.length ? locker.boxes : SAMPLE_BOXES
  const libres = boxes.filter((b) => b.status === 'libre').length
  return (
    <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
      <div>
        <h1 className="text-4xl font-extrabold leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl">
          Pide desde el celular.
          <br />
          Retira con un QR.
        </h1>
        <p className="mt-5 max-w-md text-lg text-ink-600">
          Elige tu comida, paga en línea y abre tu caja escaneando el código. Sin filas y sin esperar a que te atiendan.
        </p>
        <a href="#menu" className="btn-primary mt-7 !px-6 !py-3 text-base">
          Ver el menú
        </a>
      </div>

      <div className="mx-auto w-full max-w-sm md:max-w-none">
        <LockerBay boxes={boxes} demo />
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-ink-600">
          <span className="font-semibold text-ink-800">{locker ? locker.name : 'Locker de ejemplo'}</span>
          {locker?.address && <span className="text-ink-500">{locker.address}</span>}
          <span className="ml-auto font-medium text-ink-800">
            {libres} de {boxes.length} cajas libres
          </span>
        </p>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <ol className="grid gap-6 border-y border-ink-200 py-6 sm:grid-cols-3">
      {STEPS.map(([n, title, text]) => (
        <li key={n} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-900 font-display text-sm font-bold text-white">
            {n}
          </span>
          <div>
            <p className="font-semibold text-ink-900">{title}</p>
            <p className="text-sm text-ink-500">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="panel overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-ink-100" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-9 w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1)
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <article className="panel flex flex-col overflow-hidden transition-colors hover:border-ink-400">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          className="h-full w-full object-cover"
        />
        {(outOfStock || lowStock) && (
          <span
            className={`absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-xs font-semibold ${
              outOfStock ? 'bg-ink-900 text-white' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {outOfStock ? 'Agotado' : `Quedan ${product.stock}`}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-base font-semibold text-ink-900">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 flex-1 text-sm text-ink-500">{product.description}</p>
        )}
        <p className="pt-1 font-display text-xl font-bold text-ink-900">{money(product.price)}</p>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-[10px] border border-ink-200">
            <button
              type="button"
              disabled={outOfStock || qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30"
              aria-label="Quitar una unidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
            <button
              type="button"
              disabled={outOfStock || qty >= product.stock}
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30"
              aria-label="Agregar una unidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              onAdd(product, qty)
              setQty(1)
            }}
            disabled={outOfStock}
            className="btn-primary flex-1"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [locker, setLocker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todas')
  const [sort, setSort] = useState('default')
  const { addItem } = useCart()
  const toast = useToast()

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    api.getLockers().then((l) => setLocker(l[0] || null)).catch(() => {})
  }, [])

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  )

  const visibleProducts = useMemo(() => {
    const q = search.toLowerCase()
    let list = products.filter(
      (p) =>
        (category === 'todas' || p.category === category) &&
        (p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    )
    if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, search, category, sort])

  function handleAdd(product, qty) {
    addItem(product, qty)
    toast.success(`${qty} × ${product.name} en el carrito`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <Hero locker={locker} />
      <HowItWorks />

      <section id="menu" className="scroll-mt-20 pt-10">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-3xl font-bold text-ink-900">Menú</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                className="input !pl-9"
                placeholder="Buscar en el menú"
                aria-label="Buscar en el menú"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input sm:w-52"
              aria-label="Ordenar productos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Orden recomendado</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="name">Nombre: A-Z</option>
            </select>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['todas', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={category === c ? 'chip-on' : 'chip-off'}
              >
                {c === 'todas' ? 'Todo' : c}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No encontramos productos"
            subtitle="Prueba con otra búsqueda o cambia la categoría."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
