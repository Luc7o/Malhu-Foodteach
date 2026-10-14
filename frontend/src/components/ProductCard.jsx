import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { ProductImage } from './ui'
import { money } from '../lib/format'

export function ProductCardSkeleton() {
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

export function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1)
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <article className="panel group flex flex-col overflow-hidden transition-all duration-300 ease-out hover:z-10 hover:scale-[1.04] hover:border-brand-500 hover:shadow-pop">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
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
