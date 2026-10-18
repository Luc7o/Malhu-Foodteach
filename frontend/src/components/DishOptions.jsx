import { Check } from 'lucide-react'
import { kcal } from '../lib/dish'
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

/** Los pasos de armado de un plato. El estado vive en quien lo usa: `selected` = { groupId: [opción] }. */
export default function DishOptions({ groups, selected, onToggle }) {
  return (
    <div className="space-y-5">
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
                    onToggle={() => onToggle(g, item)}
                  />
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
