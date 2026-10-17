import { Plus, Trash2 } from 'lucide-react'

const emptyGroup = () => ({ name: '', min_select: 1, max_select: 1, items: [{ ingredient_id: '', extra_price: '0' }] })

/** Convierte lo que devuelve la API en el estado editable del formulario. */
export function groupsToForm(groups = []) {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    min_select: g.min_select,
    max_select: g.max_select,
    items: g.items.map((i) => ({ id: i.id, ingredient_id: i.ingredient_id, extra_price: String(i.extra_price ?? 0) })),
  }))
}

/** Convierte el estado del formulario al cuerpo que espera la API. */
export function groupsToPayload(groups) {
  return groups.map((g) => ({
    ...(g.id ? { id: g.id } : {}),
    name: g.name.trim(),
    min_select: Number(g.min_select),
    max_select: Number(g.max_select),
    items: g.items.map((i) => ({
      ...(i.id ? { id: i.id } : {}),
      ingredient_id: i.ingredient_id,
      extra_price: parseFloat(i.extra_price) || 0,
    })),
  }))
}

/** Primer problema que se ve a simple vista (el servidor valida todo de nuevo). */
export function groupsError(groups) {
  for (const g of groups) {
    const name = g.name.trim() || 'Un grupo'
    if (!g.name.trim()) return 'Cada grupo necesita un nombre (por ejemplo "Elige tu base")'
    if (g.items.some((i) => !i.ingredient_id)) return `«${name}»: elige un producto en cada opción o quita la fila vacía`
    const ids = g.items.map((i) => i.ingredient_id)
    if (new Set(ids).size !== ids.length) return `«${name}»: hay un producto repetido`
    if (g.items.length === 0) return `«${name}»: agrega al menos una opción`
    if (Number(g.min_select) > Number(g.max_select)) return `«${name}»: el mínimo no puede ser mayor que el máximo`
    if (Number(g.max_select) > g.items.length) return `«${name}»: el máximo no puede superar las ${g.items.length} opciones`
  }
  return ''
}

export default function OptionGroupsEditor({ groups, onChange, candidates }) {
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]))

  const setGroup = (gi, patch) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
  const setItem = (gi, ii, patch) =>
    setGroup(gi, { items: groups[gi].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) })

  function addItem(gi) {
    const g = groups[gi]
    setGroup(gi, { items: [...g.items, { ingredient_id: '', extra_price: '0' }] })
  }
  function removeItem(gi, ii) {
    const g = groups[gi]
    const items = g.items.filter((_, i) => i !== ii)
    setGroup(gi, { items, max_select: Math.min(g.max_select, Math.max(1, items.length)) })
  }

  return (
    <div className="space-y-3">
      {groups.map((g, gi) => (
        <fieldset key={g.id || gi} className="space-y-2 rounded-xl border border-ink-200 p-3">
          <legend className="sr-only">Grupo {gi + 1}</legend>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor={`g-name-${gi}`}>Paso {gi + 1}</label>
              <input
                id={`g-name-${gi}`}
                className="input"
                placeholder='Ej. "Elige tu base"'
                maxLength={60}
                value={g.name}
                onChange={(e) => setGroup(gi, { name: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(groups.filter((_, i) => i !== gi))}
              className="rounded-lg p-2.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Quitar el paso ${gi + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor={`g-min-${gi}`}>Mínimo a elegir</label>
              <input id={`g-min-${gi}`} className="input" type="number" min="0" max={g.items.length} value={g.min_select}
                onChange={(e) => setGroup(gi, { min_select: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor={`g-max-${gi}`}>Máximo a elegir</label>
              <input id={`g-max-${gi}`} className="input" type="number" min="1" max={Math.max(1, g.items.length)} value={g.max_select}
                onChange={(e) => setGroup(gi, { max_select: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-ink-400">
            {Number(g.min_select) === 0 ? 'Opcional' : 'Obligatorio'} · el cliente elige{' '}
            {Number(g.min_select) === Number(g.max_select) ? `exactamente ${g.max_select}` : `de ${g.min_select} a ${g.max_select}`}.
          </p>

          <ul className="space-y-2">
            {g.items.map((it, ii) => {
              const taken = new Set(g.items.filter((_, i) => i !== ii).map((x) => x.ingredient_id))
              const chosen = byId[it.ingredient_id]
              return (
                <li key={it.id || ii} className="flex items-center gap-2">
                  <select
                    className="input min-w-0 flex-1"
                    aria-label={`Producto de la opción ${ii + 1}`}
                    value={it.ingredient_id}
                    onChange={(e) => setItem(gi, ii, { ingredient_id: e.target.value })}
                  >
                    <option value="">Elige un producto…</option>
                    {candidates.filter((c) => !taken.has(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.nutrition?.calories != null ? ` · ${c.nutrition.calories} kcal` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">+ S/.</span>
                    <input
                      className="input !pl-12"
                      type="number" min="0" step="0.10"
                      aria-label={`Precio extra de ${chosen?.name || `la opción ${ii + 1}`}`}
                      value={it.extra_price}
                      onChange={(e) => setItem(gi, ii, { extra_price: e.target.value })}
                    />
                  </div>
                  <button type="button" onClick={() => removeItem(gi, ii)} disabled={g.items.length <= 1}
                    className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30" aria-label="Quitar opción">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" onClick={() => addItem(gi)} className="text-xs font-semibold text-brand-600 hover:underline">
            + Agregar opción
          </button>
        </fieldset>
      ))}

      <button type="button" onClick={() => onChange([...groups, emptyGroup()])} className="btn-secondary !px-3 !py-2 text-xs">
        <Plus className="h-4 w-4" aria-hidden="true" /> Agregar un paso
      </button>
    </div>
  )
}
