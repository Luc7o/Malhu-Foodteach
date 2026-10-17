import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Flame, Minus, Plus, SlidersHorizontal, Star, Zap } from 'lucide-react'
import { ProductImage } from './ui'
import { money } from '../lib/format'
import { buildPreset, flattenSelected, kcal, loadLastChoice } from '../lib/dish'

export function ProductCardSkeleton() {
  return (
    <div className="panel overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-ink-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-9 w-full animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  )
}

/**
 * Tarjeta de producto. TODA la tarjeta lleva a la página del producto: el enlace del nombre
 * se estira sobre la tarjeta (after:inset-0) y los controles (cantidad, agregar, armado rápido)
 * quedan por encima con `relative z-10`, así que se pueden usar sin salir del menú.
 */
export function ProductCard({ product, onAdd }) {
  const [qty, setQty] = useState(1)
  const outOfStock = product.sold_out ?? product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5
  const customizable = Boolean(product.customizable)
  const calories = product.nutrition?.calories
  const detailPath = `/menu/${product.id}`
  const groups = product.option_groups || []

  // Armado rápido: repite la última elección de esta persona o, si no hay, el armado "Clásico"
  function quickAdd() {
    const selected = loadLastChoice(product) || buildPreset(groups, 'clasico')
    if (groups.some((g) => (selected[g.id] || []).length < g.min_select)) return // falta algo: que lo arme en la página
    onAdd(product, 1, flattenSelected(groups, selected))
  }
  const canQuickAdd = customizable && groups.every((g) => g.items.filter((i) => i.available).length >= g.min_select)

  return (
    <article
      className="panel group relative flex flex-col overflow-hidden transition-all duration-200 ease-out
        hover:-translate-y-1 hover:border-brand-500 hover:shadow-pop focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        <ProductImage
          src={product.image_url}
          alt=""
          category={product.category}
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${outOfStock ? 'grayscale' : ''}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-900/35 to-transparent" aria-hidden="true" />

        {outOfStock || lowStock ? (
          <span
            className={`absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-xs font-semibold ${
              outOfStock ? 'bg-ink-900 text-white' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {outOfStock ? 'Agotado' : `Quedan ${product.stock}`}
          </span>
        ) : null}

        {product.featured ? (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
            <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Destacado
          </span>
        ) : customizable ? (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-ink-900/85 px-2 py-1 text-xs font-semibold text-white">
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" /> Armable
          </span>
        ) : null}

        {calories != null && !customizable && (
          <span
            className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-amber-700"
            title="Calorías por porción"
          >
            <Flame className="h-3 w-3" aria-hidden="true" /> {kcal(calories)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{product.category}</p>
        )}

        <h3 className="text-base font-semibold leading-snug text-ink-900">
          <Link
            to={detailPath}
            className="line-clamp-2 outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700"
          >
            {product.name}
          </Link>
        </h3>

        {product.description && <p className="line-clamp-2 flex-1 text-sm text-ink-500">{product.description}</p>}

        {product.health_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.health_tags.slice(0, 2).map((t) => (
              <span key={t.id} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">{t.name}</span>
            ))}
            {product.health_tags.length > 2 && (
              <span
                className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500"
                title={product.health_tags.slice(2).map((t) => t.name).join(', ')}
              >
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
          <span className="inline-flex items-center text-xs font-semibold text-brand-700 opacity-80 transition-opacity group-hover:opacity-100" aria-hidden="true">
            Ver detalle <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {customizable ? (
          <div className="mt-1 flex gap-2">
            {/* Solo visual: el clic lo recibe el enlace que cubre la tarjeta */}
            <span className={`btn-primary flex-1 ${outOfStock ? 'opacity-50' : ''}`}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Personalizar
            </span>
            {canQuickAdd && (
              <button
                type="button"
                onClick={quickAdd}
                disabled={outOfStock}
                className="btn-secondary relative z-10 !px-3"
                title="Armado rápido: agrega tu última elección o el armado clásico"
                aria-label={`Armado rápido de ${product.name}`}
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative z-10 mt-1 flex items-center gap-2">
            <div className="flex items-center rounded-[10px] border border-ink-200 bg-white">
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
              type="button"
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
