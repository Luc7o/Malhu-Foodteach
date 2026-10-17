import { useState } from 'react'
import { Flame, Minus, Plus, SlidersHorizontal, Star } from 'lucide-react'
import { ProductImage } from './ui'
import { money } from '../lib/format'
import { kcal } from '../lib/dish'

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

export function ProductCard({ product, onAdd, onOpen }) {
  const [qty, setQty] = useState(1)
  const outOfStock = product.sold_out ?? product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5
  const customizable = Boolean(product.customizable)
  const calories = product.nutrition?.calories

  return (
    <article className="panel group flex flex-col overflow-hidden transition-all duration-300 ease-out hover:z-10 hover:scale-[1.04] hover:border-brand-500 hover:shadow-pop">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        {product.featured && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
            <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Destacado
          </span>
        )}
        {customizable && !product.featured && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-ink-900/85 px-2 py-1 text-xs font-semibold text-white">
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" /> Armable
          </span>
        )}
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
        <h3 className="text-base font-semibold text-ink-900">
          <button type="button" onClick={() => onOpen?.(product)} className="text-left hover:underline focus-visible:underline">
            {product.name}
          </button>
        </h3>
        {product.description && (
          <p className="line-clamp-2 flex-1 text-sm text-ink-500">{product.description}</p>
        )}
        {product.health_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {product.health_tags.slice(0, 2).map((t) => (
              <span key={t.id} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">{t.name}</span>
            ))}
            {product.health_tags.length > 2 && (
              <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500" title={product.health_tags.slice(2).map((t) => t.name).join(', ')}>
                +{product.health_tags.length - 2}
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2 pt-1">
          <p className="font-display text-xl font-bold text-ink-900">
            {customizable && <span className="mr-1 text-xs font-medium text-ink-500">Desde</span>}
            {money(product.price)}
          </p>
          {calories != null && !customizable && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700" title="Calorías por porción">
              <Flame className="h-3 w-3" aria-hidden="true" /> {kcal(calories)}
            </span>
          )}
        </div>

        {customizable ? (
          <button type="button" onClick={() => onOpen?.(product)} disabled={outOfStock} className="btn-primary mt-2 w-full">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Personalizar
          </button>
        ) : (
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
        )}
      </div>
    </article>
  )
}
