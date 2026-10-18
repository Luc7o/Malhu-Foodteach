// Utilidades para platos personalizables y datos nutricionales.
// Las mismas cuentas las hace el servidor al crear el pedido; aquí solo sirven para mostrar el total en vivo.

/** Identifica una línea del carrito: el mismo plato con otras opciones es otra línea. */
export function lineKey(productId, optionIds = []) {
  return [productId, ...[...optionIds].sort()].join('|')
}

/** Precio unitario: precio del plato + extras de las opciones elegidas. */
export function unitPrice(product, options = []) {
  return product.price + options.reduce((s, o) => s + (o.extra_price || 0), 0)
}

/**
 * Suma calorías y macros del plato y de las opciones elegidas.
 * `complete` es false si a alguna opción le faltan datos (el total sería aproximado).
 * Devuelve null si no hay ningún dato nutricional.
 */
export function nutritionTotals(product, options = []) {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  const EXT = ['fiber_g', 'sugar_g', 'sat_fat_g', 'sodium_mg']
  const ext = Object.fromEntries(EXT.map((k) => [k, { sum: 0, ok: true, any: false }]))
  let known = false
  let complete = true
  const add = (n, required) => {
    if (!n || n.calories == null) {
      if (required) complete = false
    } else {
      known = true
      // El detalle ampliado solo se muestra si TODOS los ingredientes lo tienen (si no, la suma engañaría)
      for (const k of EXT) {
        if (n[k] == null) ext[k].ok = false
        else {
          ext[k].sum += n[k]
          ext[k].any = true
        }
      }
    }
    if (!n) return
    for (const k of Object.keys(totals)) totals[k] += n[k] || 0
  }
  add(product.nutrition, !product.customizable)
  options.forEach((o) => add(o.nutrition, true))
  if (!known) return null
  const round1 = (x) => Math.round(x * 10) / 10
  return {
    calories: Math.round(totals.calories),
    protein_g: round1(totals.protein_g),
    carbs_g: round1(totals.carbs_g),
    fat_g: round1(totals.fat_g),
    fiber_g: ext.fiber_g.ok && ext.fiber_g.any ? round1(ext.fiber_g.sum) : null,
    sugar_g: ext.sugar_g.ok && ext.sugar_g.any ? round1(ext.sugar_g.sum) : null,
    sat_fat_g: ext.sat_fat_g.ok && ext.sat_fat_g.any ? round1(ext.sat_fat_g.sum) : null,
    sodium_mg: ext.sodium_mg.ok && ext.sodium_mg.any ? Math.round(ext.sodium_mg.sum) : null,
    complete,
  }
}

export const kcal = (n) => `${Math.round(n)} kcal`

// ---------------------------------------------------------------------------
// Armado rápido: elecciones sugeridas calculadas con los datos de cada opción.
// `selected` siempre tiene la forma { [groupId]: [opción, ...] }.
// ---------------------------------------------------------------------------

export const PRESETS = [
  { id: 'clasico', label: 'Clásico', hint: 'Las primeras opciones de cada paso obligatorio' },
  { id: 'ligero', label: 'Ligero', hint: 'Las opciones con menos calorías' },
  { id: 'proteico', label: 'Alto en proteína', hint: 'Más proteína, también en los pasos opcionales' },
  { id: 'economico', label: 'Económico', hint: 'Sin extras o con el menor costo adicional' },
  { id: 'sorpresa', label: 'Sorpréndeme', hint: 'Una combinación al azar' },
]

const val = (item, key) => item.nutrition?.[key]

// Ordena de menor a mayor por `key`; las opciones sin dato van siempre al final.
function byAsc(key) {
  return (a, b) => {
    const x = key === 'extra_price' ? a.extra_price || 0 : val(a, key)
    const y = key === 'extra_price' ? b.extra_price || 0 : val(b, key)
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    return x - y
  }
}

function byDesc(key) {
  return (a, b) => {
    const x = val(a, key)
    const y = val(b, key)
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    return y - x
  }
}

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Elección sugerida para un plato personalizable.
 * Cumple siempre el mínimo de cada paso con opciones disponibles (si no hay
 * suficientes disponibles, deja lo que se pueda y la página avisa qué falta).
 */
export function buildPreset(groups, mode) {
  const selected = {}
  for (const group of groups) {
    const available = group.items.filter((i) => i.available)
    let sorted = available
    if (mode === 'ligero') sorted = [...available].sort(byAsc('calories'))
    else if (mode === 'proteico') sorted = [...available].sort(byDesc('protein_g'))
    else if (mode === 'economico') sorted = [...available].sort(byAsc('extra_price'))
    else if (mode === 'sorpresa') sorted = shuffled(available)

    let count = group.min_select
    if (mode === 'proteico' && count === 0 && sorted.some((i) => val(i, 'protein_g') != null)) count = 1
    if (mode === 'sorpresa' && count === 0 && Math.random() < 0.5) count = 1
    count = Math.min(count, group.max_select, sorted.length)
    selected[group.id] = sorted.slice(0, count)
  }
  return selected
}

// ---------------------------------------------------------------------------
// Última elección de cada plato, guardada en el navegador de la persona.
// ---------------------------------------------------------------------------

const lastKey = (productId) => `malhu_last_dish_${productId}`

export function saveLastChoice(productId, selected) {
  try {
    const ids = {}
    for (const [groupId, items] of Object.entries(selected)) ids[groupId] = items.map((i) => i.id)
    localStorage.setItem(lastKey(productId), JSON.stringify(ids))
  } catch {
    /* sin almacenamiento: simplemente no se recuerda */
  }
}

/** Devuelve la última elección validada con las opciones actuales, o null si no hay o ya no sirve. */
export function loadLastChoice(product) {
  try {
    const stored = JSON.parse(localStorage.getItem(lastKey(product.id)))
    if (!stored) return null
    const selected = {}
    let any = false
    for (const group of product.option_groups || []) {
      const items = (stored[group.id] || [])
        .map((id) => group.items.find((i) => i.id === id))
        .filter((i) => i && i.available)
        .slice(0, group.max_select)
      selected[group.id] = items
      if (items.length) any = true
    }
    if (!any) return null
    // Si ya no se puede cumplir algún paso obligatorio, la elección guardada no sirve
    const valid = (product.option_groups || []).every((g) => selected[g.id].length >= g.min_select)
    return valid ? selected : null
  } catch {
    return null
  }
}

/** Lista plana de opciones elegidas, con el nombre del paso al que pertenecen. */
export function flattenSelected(groups, selected) {
  return groups.flatMap((g) => (selected[g.id] || []).map((i) => ({ ...i, group: g.name })))
}
