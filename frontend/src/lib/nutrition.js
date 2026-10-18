// Referencias para mostrar cuánto aporta una porción respecto a un día de comida.
// Base de 2000 kcal; sodio y azúcares siguen las recomendaciones de la OMS.
// Es información orientativa: no reemplaza la indicación de un médico o nutricionista.

export const DAILY = {
  calories: 2000,
  fat_g: 78,
  sat_fat_g: 20,
  carbs_g: 275,
  sugar_g: 50,
  fiber_g: 28,
  protein_g: 50,
  sodium_mg: 2000,
}

/** Filas de la tabla nutricional. `limit` = conviene no pasarse (se avisa); `sub` = va sangrada bajo la fila anterior. */
export const TABLE_ROWS = [
  { key: 'fat_g', label: 'Grasas totales', unit: 'g' },
  { key: 'sat_fat_g', label: 'Grasas saturadas', unit: 'g', sub: true, limit: true },
  { key: 'carbs_g', label: 'Carbohidratos', unit: 'g' },
  { key: 'sugar_g', label: 'Azúcares', unit: 'g', sub: true, limit: true },
  { key: 'fiber_g', label: 'Fibra', unit: 'g', sub: true },
  { key: 'protein_g', label: 'Proteínas', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodio', unit: 'mg', limit: true },
]

export const pctDaily = (key, value) => (value == null ? null : Math.round((value / DAILY[key]) * 100))

// Una comida es cerca de 1/3 del día: de ahí los cortes (15 % y 30 % del valor diario por porción).
export function levelOf(pct) {
  if (pct == null) return null
  if (pct >= 30) return 'alto'
  if (pct >= 15) return 'medio'
  return 'bajo'
}

/** Reparto de calorías entre proteína, carbohidratos y grasa (4-4-9 kcal/g). */
export function macroSplit(n) {
  const p = (n.protein_g || 0) * 4
  const c = (n.carbs_g || 0) * 4
  const f = (n.fat_g || 0) * 9
  const sum = p + c + f
  if (!sum) return null
  const pct = (x) => Math.round((x / sum) * 100)
  const protein = pct(p)
  const carbs = pct(c)
  return [
    { key: 'protein_g', label: 'Proteínas', pct: protein, bar: 'bg-brand-600' },
    { key: 'carbs_g', label: 'Carbohidratos', pct: carbs, bar: 'bg-amber-400' },
    { key: 'fat_g', label: 'Grasas', pct: Math.max(0, 100 - protein - carbs), bar: 'bg-rose-400' },
  ]
}

/** Advertencias (lo que conviene limitar) y destacados (lo bueno) de una porción. */
export function highlights(n) {
  const warnings = []
  const goods = []
  const alto = (key) => levelOf(pctDaily(key, n[key])) === 'alto'
  if (alto('sodium_mg')) warnings.push('Alto en sodio')
  if (alto('sugar_g')) warnings.push('Alto en azúcares')
  if (alto('sat_fat_g')) warnings.push('Alto en grasas saturadas')
  if (n.fiber_g != null && n.fiber_g >= 5) goods.push('Buena fuente de fibra')
  if (n.protein_g != null && n.protein_g >= 20) goods.push('Alto en proteína')
  if (n.sodium_mg != null && n.sodium_mg <= 140) goods.push('Bajo en sodio')
  if (n.sugar_g != null && n.sugar_g <= 5) goods.push('Bajo en azúcares')
  return { warnings, goods }
}

/** Los productos de La Última Cena son los antojos: se muestran con un aviso extra. */
export const isIndulgent = (category) => /[uú]ltima\s+cena/i.test(category || '')
