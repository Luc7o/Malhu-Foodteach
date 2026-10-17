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
  let known = false
  let complete = true
  const add = (n, required) => {
    if (!n || n.calories == null) {
      if (required) complete = false
    } else {
      known = true
    }
    if (!n) return
    for (const k of Object.keys(totals)) totals[k] += n[k] || 0
  }
  add(product.nutrition, !product.customizable)
  options.forEach((o) => add(o.nutrition, true))
  if (!known) return null
  return {
    calories: Math.round(totals.calories),
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
    complete,
  }
}

export const kcal = (n) => `${Math.round(n)} kcal`
