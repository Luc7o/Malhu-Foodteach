import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, History, Minus, Plus, ShoppingBag, Sparkles, Zap } from 'lucide-react'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import DishOptions from '../components/DishOptions'
import NutritionFacts from '../components/NutritionFacts'
import { EmptyState, PageLoader, ProductImage } from '../components/ui'
import {
  PRESETS, buildPreset, flattenSelected, loadLastChoice, nutritionTotals, saveLastChoice, unitPrice,
} from '../lib/dish'
import { money } from '../lib/format'
import { isIndulgent } from '../lib/nutrition'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem, count } = useCart()
  const toast = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({}) // { groupId: [opción, ...] }
  const [preset, setPreset] = useState('') // armado rápido aplicado (solo para resaltarlo)
  const [qty, setQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setProduct(null)
    setSelected({})
    setPreset('')
    setQty(1)
    setJustAdded(false)
    api
      .getProduct(id)
      .then((p) => {
        if (cancelled) return
        // Un producto no publicado o que solo sirve como ingrediente no se muestra en la tienda
        if (p.active === false || p.ingredient_only) setError('Este producto no está disponible.')
        else setProduct(p)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const groups = product?.option_groups || []
  const customizable = groups.length > 0
  const outOfStock = product ? product.sold_out ?? product.stock === 0 : false
  const maxQty = product?.stock > 0 ? product.stock : 1

  const lastChoice = useMemo(() => (product && customizable ? loadLastChoice(product) : null), [product, customizable])
  const options = useMemo(() => flattenSelected(groups, selected), [groups, selected])
  const missing = groups.filter((g) => (selected[g.id] || []).length < g.min_select)
  const total = product ? unitPrice(product, options) : 0
  const totals = useMemo(() => (product ? nutritionTotals(product, options) : null), [product, options])

  function toggle(group, item) {
    setPreset('')
    setJustAdded(false)
    setSelected((prev) => {
      const current = prev[group.id] || []
      const has = current.some((i) => i.id === item.id)
      let next
      if (has) next = current.filter((i) => i.id !== item.id)
      else if (group.max_select === 1) next = [item]
      else if (current.length >= group.max_select) next = current
      else next = [...current, item]
      // En un paso de elección única y obligatoria no se puede dejar vacío
      if (has && group.max_select === 1 && group.min_select >= 1) next = current
      return { ...prev, [group.id]: next }
    })
  }

  function applyPreset(mode) {
    setSelected(buildPreset(groups, mode))
    setPreset(mode)
    setJustAdded(false)
  }

  function applyLast() {
    if (!lastChoice) return
    setSelected(lastChoice)
    setPreset('ultima')
    setJustAdded(false)
  }

  function handleAdd() {
    if (customizable) saveLastChoice(product.id, selected)
    addItem(product, qty, options)
    toast.success(`${qty} × ${product.name} en el carrito`)
    setJustAdded(true)
  }

  if (loading) return <PageLoader label="Cargando producto..." />

  if (error || !product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon={ShoppingBag}
          title="No encontramos este producto"
          subtitle={error || 'Puede que ya no esté en el menú.'}
          action={<Link to="/menu" className="btn-primary mt-2">Volver al menú</Link>}
        />
      </section>
    )
  }

  const canAdd = !outOfStock && missing.length === 0

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">
      <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al menú
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Columna izquierda: foto, descripción y nutrición */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            category={product.category}
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
          <div>
            {product.category && <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{product.category}</p>}
            <h1 className="mt-1 font-display text-3xl font-bold text-ink-900">{product.name}</h1>
            {product.description && <p className="mt-2 text-ink-600">{product.description}</p>}
            {product.health_tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.health_tags.map((t) => (
                  <span key={t.id} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">{t.name}</span>
                ))}
              </div>
            )}
          </div>

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
            <NutritionFacts
              nutrition={product.nutrition}
              ingredients={product.ingredients}
              allergens={product.allergens}
              indulgent={isIndulgent(product.category)}
            />
          ) : (
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Este producto aún no tiene información nutricional.</p>
          )}
        </div>

        {/* Columna derecha: personalización y compra */}
        <div className="space-y-6">
          <p className="font-display text-3xl font-bold text-ink-900">
            {customizable && <span className="mr-1.5 text-base font-medium text-ink-500">Desde</span>}
            {money(product.price)}
          </p>

          {customizable && (
            <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4" aria-label="Armado rápido">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                <Zap className="h-4 w-4" aria-hidden="true" /> Armado rápido
              </h2>
              <p className="mt-0.5 text-xs text-brand-800/80">Elige una opción y la completamos por ti. Después puedes cambiar lo que quieras.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lastChoice && (
                  <button
                    type="button"
                    onClick={applyLast}
                    aria-pressed={preset === 'ultima'}
                    disabled={outOfStock}
                    className={`inline-flex items-center gap-1.5 ${preset === 'ultima' ? 'chip-on' : 'chip-off'}`}
                  >
                    <History className="h-3.5 w-3.5" aria-hidden="true" /> Mi última elección
                  </button>
                )}
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    aria-pressed={preset === p.id}
                    title={p.hint}
                    disabled={outOfStock}
                    className={`inline-flex items-center gap-1.5 ${preset === p.id ? 'chip-on' : 'chip-off'}`}
                  >
                    {p.id === 'sorpresa' && <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                    {p.label}
                  </button>
                ))}
              </div>
              {preset && preset !== 'ultima' && (
                <p className="mt-2 text-xs text-brand-800/80">{PRESETS.find((p) => p.id === preset)?.hint}.</p>
              )}
            </section>
          )}

          {customizable && <DishOptions groups={groups} selected={selected} onToggle={toggle} />}

          {/* Compra: en pantallas grandes va en la columna; en el celular queda fija abajo */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:rounded-2xl lg:border lg:bg-ink-50 lg:p-4">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
              <div className="flex items-center rounded-[10px] border border-ink-200 bg-white">
                <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 text-ink-500 hover:text-ink-900 disabled:opacity-30" aria-label="Quitar una unidad">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                <button type="button" disabled={outOfStock || qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="p-2.5 text-ink-500 hover:text-ink-900 disabled:opacity-30" aria-label="Agregar una unidad">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary flex-1 sm:min-w-56 sm:flex-none">
                {outOfStock ? 'Agotado' : missing.length > 0 ? `Falta elegir: ${missing[0].name}` : `Agregar · ${money(total * qty)}`}
              </button>
            </div>
            {justAdded && (
              <p className="mx-auto mt-2 flex max-w-6xl items-center justify-between gap-3 text-sm text-emerald-700" role="status">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" aria-hidden="true" /> Agregado al carrito</span>
                <Link to="/cart" className="font-semibold underline">Ver carrito ({count})</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
