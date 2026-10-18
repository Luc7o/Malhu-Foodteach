import { useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import Modal from './Modal'
import NutritionFacts from './NutritionFacts'
import { ProductImage } from './ui'
import { kcal, nutritionTotals, unitPrice } from '../lib/dish'
import { money } from '../lib/format'

function rule(group) {
  if (group.max_select === 1) return group.min_select >= 1 ? 'Elige 1' : 'Elige 1 (opcional)'
  if (group.min_select >= 1) {
    return group.min_select === group.max_select ? `Elige ${group.max_select}` : `Elige de ${group.min_select} a ${group.max_select}`
  }
  return `Hasta ${group.max_select} (opcional)`
}

function OptionButton({ item, selected, disabled, single, onToggle }) {
  const cal = item.nutrition?.calories
  return (
    <button
      type="button"
      role={single ? 'radio' : 'checkbox'}
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition-colors ${
        selected ? 'border-ink-900 bg-ink-50' : 'border-ink-200 hover:border-ink-300'
      } ${disabled && !selected ? 'cursor-not-allowed opacity-45' : ''}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border ${single ? 'rounded-full' : 'rounded-md'} ${
          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white'
        }`}
        aria-hidden="true"
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink-900">{item.name}</span>
        <span className="block text-xs text-ink-500">
          {!item.available ? 'Agotado' : cal != null ? kcal(cal) : 'Sin datos de calorías'}
        </span>
      </span>
      {item.extra_price > 0 && <span className="shrink-0 text-xs font-semibold text-ink-700">+ {money(item.extra_price)}</span>}
    </button>
  )
}

/**
 * Detalle de un producto: información nutricional y, si es personalizable,
 * el armado del plato con el precio y las calorías actualizándose al elegir.
 */
export default function ProductModal({ product, onClose, onAdd }) {
  const groups = product.option_groups || []
  const customizable = groups.length > 0
  const [selected, setSelected] = useState({}) // { groupId: [item, ...] }
  const [qty, setQty] = useState(1)
  const outOfStock = product.sold_out ?? product.stock === 0

  const options = useMemo(
    () => groups.flatMap((g) => (selected[g.id] || []).map((i) => ({ ...i, group: g.name }))),
    [groups, selected]
  )
  const missing = groups.filter((g) => (selected[g.id] || []).length < g.min_select)
  const total = unitPrice(product, options)
  const totals = useMemo(() => nutritionTotals(product, options), [product, options])

  function toggle(group, item) {
    setSelected((prev) => {
      const current = prev[group.id] || []
      const has = current.some((i) => i.id === item.id)
      let next
      if (has) next = current.filter((i) => i.id !== item.id)
      else if (group.max_select === 1) next = [item]
      else if (current.length >= group.max_select) next = current
      else next = [...current, item]
      // En un grupo de elección única y obligatoria no se puede dejar vacío
      if (has && group.max_select === 1 && group.min_select >= 1) next = current
      return { ...prev, [group.id]: next }
    })
  }

  function handleAdd() {
    onAdd(product, qty, options)
    onClose()
  }

  const canAdd = !outOfStock && missing.length === 0

  return (
    <Modal
      title={product.name}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-[10px] border border-ink-200">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30" aria-label="Quitar una unidad">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
            <button type="button" disabled={qty >= (product.stock ?? Infinity)} onClick={() => setQty((q) => Math.min(product.stock ?? Infinity, q + 1))} className="p-2 text-ink-500 hover:text-ink-900 disabled:opacity-30" aria-label="Agregar una unidad">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary flex-1 sm:flex-none sm:min-w-56">
            {outOfStock ? 'Agotado' : missing.length > 0 ? `Falta elegir: ${missing[0].name}` : `Agregar · ${money(total * qty)}`}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-4">
          <ProductImage src={product.image_url} alt={product.name} category={product.category} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            {product.description && <p className="text-sm text-ink-600">{product.description}</p>}
            <p className="mt-2 font-display text-xl font-bold text-ink-900">
              {customizable && <span className="mr-1 text-sm font-medium text-ink-500">Desde</span>}
              {money(product.price)}
            </p>
          </div>
        </div>

        {groups.map((g, idx) => {
          const chosen = selected[g.id] || []
          const full = chosen.length >= g.max_select
          const single = g.max_select === 1
          return (
            <fieldset key={g.id}>
              <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
                <span className="font-semibold text-ink-900">{idx + 1}. {g.name}</span>
                <span className={`text-xs ${g.min_select > 0 && chosen.length < g.min_select ? 'font-semibold text-amber-700' : 'text-ink-500'}`}>
                  {rule(g)}{g.max_select > 1 && ` · ${chosen.length}/${g.max_select}`}
                </span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role={single ? 'radiogroup' : 'group'} aria-label={g.name}>
                {g.items.map((item) => {
                  const on = chosen.some((i) => i.id === item.id)
                  return (
                    <OptionButton
                      key={item.id}
                      item={item}
                      selected={on}
                      single={single}
                      disabled={!item.available || (!single && full && !on)}
                      onToggle={() => toggle(g, item)}
                    />
                  )
                })}
              </div>
            </fieldset>
          )
        })}

        {customizable ? (
          totals ? (
            <NutritionFacts
              nutrition={totals}
              title="Tu plato"
              note={
                totals.complete
                  ? 'Suma de los ingredientes elegidos. Valores referenciales por porción.'
                  : 'Total aproximado: a algún ingrediente le faltan datos de calorías. Valores referenciales.'
              }
            />
          ) : (
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Este plato aún no tiene información de calorías.</p>
          )
        ) : product.nutrition ? (
          <NutritionFacts nutrition={product.nutrition} />
        ) : (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Este producto aún no tiene información nutricional.</p>
        )}
      </div>
    </Modal>
  )
}
