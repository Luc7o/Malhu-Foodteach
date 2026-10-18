import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, QrCode, ShoppingBag, Smartphone } from 'lucide-react'
import { api } from '../api'
import { ProductImage } from './ui'
import { kcal } from '../lib/dish'
import { money } from '../lib/format'

const DAILY_KCAL = 2000 // referencia diaria habitual
const HEALTHY = ['nutracéuticos', 'gymrat']

// Verde / ámbar / rojo según qué parte del día representa el plato.
function tone(pct) {
  if (pct < 20) return { color: '#17a56b', text: 'Una porción ligera: deja espacio para el resto de tu día.' }
  if (pct < 35) return { color: '#E9A23B', text: 'Una porción moderada dentro de tu día.' }
  if (pct < 50) return { color: '#D9644A', text: 'Más de un tercio de tus calorías del día en un solo plato.' }
  return { color: '#B83A3A', text: 'Más de la mitad de tus calorías del día en un solo plato.' }
}

// Evita que la barra o el gráfico "salten": arrancan en 0 y se llenan al montar.
function useReady(deps) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(false)
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ready
}

function CalorieMeter({ calories, serving }) {
  const ready = useReady([calories])
  const pct = Math.round((calories / DAILY_KCAL) * 100)
  const t = tone(pct)
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5" aria-label="Calorías frente a tu día">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
          <Flame className="h-4 w-4" style={{ color: t.color }} aria-hidden="true" /> Frente a tu día
        </h2>
        {serving && <span className="text-xs text-ink-500">{serving}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-ink-900">
        {kcal(calories)} <span className="text-lg font-semibold" style={{ color: t.color }}>= {pct}% de tu día</span>
      </p>
      <div
        className="mt-3 h-3.5 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)}
        aria-label={`${pct}% de las calorías diarias de referencia`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: ready ? `${Math.min(pct, 100)}%` : '0%', backgroundColor: t.color }}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-ink-800">{t.text}</p>
      <p className="mt-1 text-[11px] text-ink-500">Referencia: {DAILY_KCAL} kcal al día. Tus necesidades pueden variar.</p>
    </section>
  )
}

const MACROS = [
  ['protein_g', 'Proteínas', 4, '#375534'],
  ['carbs_g', 'Carbohidratos', 4, '#E9A23B'],
  ['fat_g', 'Grasas', 9, '#D9644A'],
]

function MacroDonut({ nutrition }) {
  const ready = useReady([nutrition])
  const parts = MACROS.map(([key, label, factor, color]) => ({
    label,
    color,
    grams: Number(nutrition[key]) || 0,
    energy: (Number(nutrition[key]) || 0) * factor,
  }))
  const total = parts.reduce((s, p) => s + p.energy, 0)
  if (total <= 0) return null
  let offset = 0
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5" aria-label="De dónde vienen las calorías">
      <h2 className="text-sm font-semibold text-ink-700">De dónde vienen las calorías</h2>
      <div className="mt-3 flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="Reparto de macronutrientes">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#E3EED4" strokeWidth="16" />
          {parts.map((p) => {
            const share = (p.energy / total) * 100
            const el = (
              <circle
                key={p.label}
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke={p.color}
                strokeWidth="16"
                pathLength="100"
                strokeDasharray={`${ready ? share : 0} 100`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            )
            offset += share
            return el
          })}
        </svg>
        <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
          {parts.map((p) => (
            <li key={p.label} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
              <span className="flex-1 text-ink-700">{p.label}</span>
              <span className="font-semibold text-ink-900">{Math.round((p.energy / total) * 100)}%</span>
              <span className="w-12 text-right text-xs text-ink-500">{p.grams} g</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Suggestions({ product }) {
  const [all, setAll] = useState([])
  useEffect(() => {
    let cancelled = false
    api.getProducts().then((l) => !cancelled && setAll(l)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const cat = (product.category || '').toLowerCase()
  const swap = cat === 'la última cena'
  const calories = product.nutrition?.calories

  const list = useMemo(() => {
    const ok = all.filter((p) => p.id !== product.id && !p.customizable && (p.sold_out ?? p.stock === 0) === false)
    const pool = swap
      ? ok.filter((p) => HEALTHY.includes((p.category || '').toLowerCase()) && p.nutrition?.calories != null)
      : ok.filter((p) => (p.category || '').toLowerCase() === cat)
    const score = (p) => (p.image_url ? 0 : 1)
    return [...pool].sort((a, b) => score(a) - score(b)).slice(0, 3)
  }, [all, product.id, swap, cat])

  if (list.length === 0) return null
  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5" aria-label={swap ? 'Versión sana' : 'También te puede gustar'}>
      <h2 className="text-sm font-semibold text-ink-700">
        {swap ? '¿Prefieres la versión consciente?' : 'También te puede gustar'}
      </h2>
      {swap && <p className="mt-0.5 text-xs text-ink-500">Platos de Nutracéuticos y Gymrat para el mismo antojo, con menos peso en tu día.</p>}
      <ul className="mt-3 space-y-2">
        {list.map((p) => {
          const diff = swap && calories != null ? calories - p.nutrition.calories : 0
          return (
            <li key={p.id}>
              <Link
                to={`/menu/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-ink-200 p-2 transition-colors hover:border-brand-500 hover:bg-brand-50/50"
              >
                <ProductImage src={p.image_url} alt="" category={p.category} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{p.name}</span>
                  <span className="block text-xs text-ink-500">
                    {p.category}
                    {p.nutrition?.calories != null && ` · ${kcal(p.nutrition.calories)}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-ink-900">{money(p.price)}</span>
                  {diff > 0 && <span className="block text-xs font-semibold text-emerald-700">−{diff} kcal</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const STEPS = [
  [Smartphone, 'Pide y paga', 'Desde tu celular, en segundos.'],
  [QrCode, 'Recibe tu QR', 'Se te asigna una caja del locker.'],
  [ShoppingBag, 'Escanea y retira', 'Acerca el QR al lector y se abre.'],
]

function HowItWorks() {
  return (
    <section className="rounded-2xl bg-brand-900 p-5 text-white" aria-label="Cómo lo retiras">
      <h2 className="text-sm font-semibold text-brand-200">Cómo lo retiras</h2>
      <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map(([Icon, title, text], i) => (
          <li key={title} className="flex items-start gap-3 sm:block">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="block sm:mt-2">
              <span className="block text-sm font-semibold">{i + 1}. {title}</span>
              <span className="block text-xs text-brand-200">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Relleno útil para la columna derecha de un plato que no se personaliza. */
export default function ProductExtras({ product }) {
  const n = product.nutrition
  return (
    <div className="space-y-5">
      {n?.calories != null && <CalorieMeter calories={n.calories} serving={n.serving} />}
      {n && <MacroDonut nutrition={n} />}
      <Suggestions product={product} />
      <HowItWorks />
    </div>
  )
}
