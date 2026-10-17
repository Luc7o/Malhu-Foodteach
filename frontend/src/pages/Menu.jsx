import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Heart, Search, X } from 'lucide-react'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard'

// Compara sin tildes ni mayúsculas: "cesar" encuentra "César"
const norm = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Menu() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categoryList, setCategoryList] = useState(null)
  const [healthTags, setHealthTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { addItem } = useCart()
  const toast = useToast()

  // Los filtros viven en la URL: /menu?categoria=Bebidas&q=jugo&orden=precio_asc&disponibles=1
  const search = params.get('q') || ''
  const category = params.get('categoria') || 'todas'
  const sort = params.get('orden') || 'default'
  const health = params.get('salud') || ''
  const onlyAvailable = params.get('disponibles') === '1'
  const hasFilters = Boolean(search) || category !== 'todas' || sort !== 'default' || onlyAvailable || Boolean(health)

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setError(e.message)).finally(() => setLoading(false))
    api.getCategories().then((list) => setCategoryList(list.map((c) => c.name))).catch(() => {})
    api.getHealthTags().then((list) => setHealthTags(list.map((t) => t.name))).catch(() => {})
  }, [])

  // Las categorías salen en el orden que definió el administrador
  const categories = useMemo(
    () => categoryList ?? [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [categoryList, products]
  )

  const visible = useMemo(() => {
    const q = norm(search.trim())
    let list = products.filter(
      (p) =>
        (category === 'todas' || p.category === category) &&
        (!onlyAvailable || !p.sold_out) &&
        (!health || p.health_tags?.some((t) => t.name === health)) &&
        (!q ||
          norm(p.name).includes(q) ||
          norm(p.description).includes(q) ||
          norm(p.category).includes(q) ||
          p.health_tags?.some((t) => norm(t.name).includes(q)))
    )
    if (sort === 'precio_asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'precio_desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'nombre') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, search, category, sort, onlyAvailable, health])

  function handleAdd(product, qty, options = []) {
    addItem(product, qty, options)
    toast.success(`${qty} × ${product.name} en el carrito`)
  }

  return (
    <div>
      <PageHeader eyebrow="Coffee break & Catering" title="Nuestro menú" subtitle="Busca, filtra y arma tu pedido. Lo retiras en el locker con tu código QR." />

      <div className="sticky top-[60px] z-40 border-b border-ink-200 bg-ink-50/95 backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                className="input !pl-9 !pr-9"
                placeholder="Buscar por nombre, ingrediente o categoría"
                aria-label="Buscar en el menú"
                value={search}
                onChange={(e) => setParam('q', e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setParam('q', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-800"
                  aria-label="Borrar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              className="input md:w-56"
              aria-label="Ordenar productos"
              value={sort}
              onChange={(e) => setParam('orden', e.target.value === 'default' ? '' : e.target.value)}
            >
              <option value="default">Orden recomendado</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre: A-Z</option>
            </select>
            <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={onlyAvailable}
                onChange={(e) => setParam('disponibles', e.target.checked ? '1' : '')}
              />
              Solo disponibles
            </label>
          </div>

          {categories.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {['todas', ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setParam('categoria', c === 'todas' ? '' : c)}
                  className={`shrink-0 ${category === c ? 'chip-on' : 'chip-off'}`}
                >
                  {c === 'todas' ? 'Todo' : c}
                </button>
              ))}
            </div>
          )}

          {healthTags.length > 0 && (
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Cuida tu salud
              </span>
              {healthTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setParam('salud', health === t ? '' : t)}
                  aria-pressed={health === t}
                  className={`shrink-0 !px-3 !py-1 !text-xs ${health === t ? 'chip-on' : 'chip-off'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-4 flex items-center justify-between text-sm text-ink-500" aria-live="polite">
          <span>{loading ? 'Cargando…' : `${visible.length} ${visible.length === 1 ? 'producto' : 'productos'}`}</span>
          {hasFilters && (
            <button onClick={() => setParams({}, { replace: true })} className="font-semibold text-brand-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>

        {health && (
          <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Productos para <strong>{health.toLowerCase()}</strong>. Es información general sobre alimentación y no reemplaza la consulta con un profesional de la salud.
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No encontramos productos"
            subtitle="Prueba con otra búsqueda o quita algún filtro."
            action={hasFilters && <button onClick={() => setParams({}, { replace: true })} className="btn-secondary mt-2">Limpiar filtros</button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
