import { AlertTriangle, CheckCircle2, Flame, Info } from 'lucide-react'
import { kcal } from '../lib/dish'
import { DAILY, TABLE_ROWS, highlights, levelOf, macroSplit, pctDaily } from '../lib/nutrition'

const LEVEL_STYLE = {
  bajo: { text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Bajo' },
  medio: { text: 'text-amber-700', bar: 'bg-amber-500', label: 'Medio' },
  alto: { text: 'text-rose-700', bar: 'bg-rose-600', label: 'Alto' },
}

const ROWS = [
  ['protein_g', 'Proteínas'],
  ['carbs_g', 'Carbohidratos'],
  ['fat_g', 'Grasas'],
]

/** Calorías y macros. `compact` = una sola línea (para tarjetas y carrito). */
export default function NutritionFacts({
  nutrition, title = 'Información nutricional', note, compact = false,
  ingredients, allergens, indulgent = false,
}) {
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

  const split = macroSplit(nutrition)
  const { warnings, goods } = highlights(nutrition)
  const rows = TABLE_ROWS.filter((r) => nutrition[r.key] != null)
  const kcalPct = nutrition.calories != null ? pctDaily('calories', nutrition.calories) : null
  const hasSugarNote = nutrition.sugar_g != null

  return (
    <div className="space-y-3">
      {indulgent && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="note">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Un antojo, no un hábito
          </p>
          <p className="mt-1 leading-snug">
            Esta porción aporta{' '}
            {kcalPct != null && <strong>{kcalPct}% de las calorías</strong>}
            {nutrition.sodium_mg != null && <>, <strong>{pctDaily('sodium_mg', nutrition.sodium_mg)}% del sodio</strong></>}
            {nutrition.sat_fat_g != null && <> y <strong>{pctDaily('sat_fat_g', nutrition.sat_fat_g)}% de la grasa saturada</strong></>}
            {' '}recomendados para un día entero. Si cuidas tu salud, disfrútalo de vez en cuando.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-ink-200 bg-ink-50 p-4" aria-label={title}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
          {nutrition.serving && <span className="text-xs text-ink-500">{nutrition.serving}</span>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-display text-2xl font-bold text-ink-900" aria-live="polite">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-5 w-5 text-amber-600" aria-hidden="true" />
            {nutrition.calories != null ? kcal(nutrition.calories) : 'Calorías no informadas'}
          </span>
          {kcalPct != null && <span className="font-sans text-xs font-normal text-ink-500">{kcalPct}% de un día (2000 kcal)</span>}
        </p>

        {split && (
          <div className="mt-3">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white" role="img" aria-label={`De dónde vienen las calorías: ${split.map((m) => `${m.label} ${m.pct}%`).join(', ')}`}>
              {split.map((m) => <div key={m.key} className={m.bar} style={{ width: `${m.pct}%` }} />)}
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-600">
              {split.map((m) => (
                <li key={m.key} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${m.bar}`} aria-hidden="true" /> {m.label} {m.pct}%
                </li>
              ))}
            </ul>
            <p className="mt-0.5 text-[11px] text-ink-400">Porcentaje de las calorías que aporta cada nutriente.</p>
          </div>
        )}

        {rows.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Tabla nutricional por porción</caption>
            <thead>
              <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wide text-ink-500">
                <th scope="col" className="pb-1.5 font-semibold">Nutriente</th>
                <th scope="col" className="pb-1.5 text-right font-semibold">Por porción</th>
                <th scope="col" className="w-28 pb-1.5 pl-3 font-semibold">% del día</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const value = nutrition[r.key]
                const pct = pctDaily(r.key, value)
                const level = r.limit ? levelOf(pct) : null
                const style = level ? LEVEL_STYLE[level] : null
                return (
                  <tr key={r.key} className="border-b border-ink-200/70 last:border-0">
                    <th scope="row" className={`py-1.5 text-left font-normal ${r.sub ? 'pl-4 text-ink-500' : 'font-semibold text-ink-800'}`}>
                      {r.label}
                    </th>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-ink-900">{value} {r.unit}</td>
                    <td className="py-1.5 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white" aria-hidden="true">
                          <div className={`h-full rounded-full ${style ? style.bar : 'bg-brand-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-ink-600">{pct}%</span>
                      </div>
                      {style && <span className={`block text-[10px] font-semibold uppercase ${style.text}`}>{style.label}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {(warnings.length > 0 || goods.length > 0) && (
          <div className="mt-4 space-y-2">
            {warnings.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Ten en cuenta</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {warnings.map((w) => (
                    <li key={w} className="inline-flex items-center gap-1 rounded-md bg-ink-900 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {goods.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {goods.map((g) => (
                  <li key={g} className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-snug text-ink-500">
          {note || 'Valores referenciales por porción. Pueden variar levemente según la preparación.'}
          {' '}% del día según una dieta de {DAILY.calories} kcal.
          {hasSugarNote && ' Los azúcares incluyen los naturales de frutas y lácteos.'}
        </p>
      </section>

      {(ingredients || allergens) && (
        <section className="rounded-xl border border-ink-200 bg-white p-4 text-sm" aria-label="Ingredientes y alérgenos">
          {ingredients && (
            <div>
              <h3 className="text-sm font-semibold text-ink-700">Ingredientes</h3>
              <p className="mt-1 leading-snug text-ink-600">{ingredients}</p>
            </div>
          )}
          <div className={ingredients ? 'mt-3 border-t border-ink-200 pt-3' : ''}>
            <h3 className="text-sm font-semibold text-ink-700">Alérgenos</h3>
            <p className="mt-1 leading-snug text-ink-600">
              {allergens ? <>Contiene: <strong className="text-ink-900">{allergens}</strong>.</> : 'No declaramos alérgenos principales en este producto.'}
            </p>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-ink-500">
            <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            Se prepara en una cocina donde también se manipulan gluten, lácteos, huevo, soya y frutos secos. Si tienes una alergia o una condición médica, consulta con tu médico o nutricionista.
          </p>
        </section>
      )}
    </div>
  )
}
