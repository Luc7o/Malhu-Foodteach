import { Flame } from 'lucide-react'
import { kcal } from '../lib/dish'

const ROWS = [
  ['protein_g', 'Proteínas'],
  ['carbs_g', 'Carbohidratos'],
  ['fat_g', 'Grasas'],
]

/** Calorías y macros. `compact` = una sola línea (para tarjetas y carrito). */
export default function NutritionFacts({ nutrition, title = 'Información nutricional', note, compact = false }) {
  if (!nutrition) return null
  const macros = ROWS.filter(([k]) => nutrition[k] != null)

  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
        {nutrition.calories != null && (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
            <Flame className="h-3 w-3" aria-hidden="true" /> {kcal(nutrition.calories)}
          </span>
        )}
        {macros.map(([k, label]) => (
          <span key={k}>{label.slice(0, 1)} {nutrition[k]} g</span>
        ))}
      </p>
    )
  }

  return (
    <section className="rounded-xl border border-ink-200 bg-ink-50 p-4" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
        {nutrition.serving && <span className="text-xs text-ink-500">{nutrition.serving}</span>}
      </div>
      <p className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold text-ink-900" aria-live="polite">
        <Flame className="h-5 w-5 text-amber-600" aria-hidden="true" />
        {nutrition.calories != null ? kcal(nutrition.calories) : 'Calorías no informadas'}
      </p>
      {macros.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {macros.map(([k, label]) => (
            <div key={k} className="rounded-lg bg-white px-2 py-1.5">
              <dt className="text-[11px] text-ink-500">{label}</dt>
              <dd className="text-sm font-semibold text-ink-900">{nutrition[k]} g</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-[11px] leading-snug text-ink-500">
        {note || 'Valores referenciales por porción. Pueden variar levemente según la preparación.'}
      </p>
    </section>
  )
}
