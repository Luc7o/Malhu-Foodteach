import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDown, ArrowUp, Download, ImagePlus, Pencil, Plus, Search, Star, Trash2,
} from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import { ADMIN_BASE } from '../../lib/appMode'
import { EmptyState, PageLoader, ProductImage, Spinner } from '../../components/ui'
import { money } from '../../lib/format'

const MAX_IMAGE_MB = 5

const EMPTY_FORM = {
  name: '', description: '', category_id: '', price: '', stock: '', image_url: '',
  status: 'publicado', featured: false, sold_out: false,
}

const STATUS_OPTIONS = [
  ['publicado', 'Publicado', 'Se ve en el menú de la tienda'],
  ['borrador', 'Borrador', 'Todavía no se publica; solo tú lo ves'],
  ['archivado', 'Archivado', 'Retirado del menú; se conserva el historial'],
]

function ProductForm({ initial, categories, onCancel, onSaved, onCategoryCreated }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(
    initial ? { ...EMPTY_FORM, ...initial, category_id: initial.category_id || '', sold_out: initial.sold_out_manual } : EMPTY_FORM
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newCategory, setNewCategory] = useState(null) // null = oculto, texto = escribiendo
  const [creatingCategory, setCreatingCategory] = useState(false)
  const fileRef = useRef(null)
  const isEdit = Boolean(initial?.id)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const categoryName = categories.find((c) => c.id === form.category_id)?.name

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) return setError('Elige un archivo de imagen (JPG, PNG, WEBP o GIF)')
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_IMAGE_MB} MB`)

    setUploading(true)
    try {
      const { image_url } = await api.uploadProductImage(token, file)
      set('image_url', image_url)
      toast.success('Imagen subida. Guarda el producto para aplicarla.')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleCreateCategory() {
    const name = (newCategory || '').trim()
    if (!name) return
    setCreatingCategory(true)
    setError('')
    try {
      const cat = await api.createCategory(token, name)
      onCategoryCreated(cat)
      set('category_id', cat.id)
      setNewCategory(null)
      toast.success(`Categoría «${cat.name}» creada`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingCategory(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const price = parseFloat(form.price)
    const stock = parseInt(form.stock, 10)
    if (!form.name.trim()) return setError('El nombre es obligatorio')
    if (Number.isNaN(price) || price < 0) return setError('Ingresa un precio válido')
    if (Number.isNaN(stock) || stock < 0) return setError('Ingresa un stock válido')

    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description,
      category_id: form.category_id || null,
      price,
      stock,
      image_url: form.image_url,
      status: form.status,
      featured: form.featured,
      sold_out: form.sold_out,
    }
    try {
      const saved = isEdit
        ? await api.updateProduct(token, initial.id, payload)
        : await api.createProduct(token, payload)
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onSaved(saved)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" form="product-form" disabled={saving || uploading} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="p-name">Nombre</label>
          <input id="p-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Descripción</label>
          <textarea id="p-desc" className="input" rows={2} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="p-cat">Categoría</label>
          <select id="p-cat" className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {newCategory === null ? (
            <button type="button" onClick={() => setNewCategory('')} className="mt-1.5 text-xs font-semibold text-brand-600 hover:underline">
              + Crear una categoría nueva
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                autoFocus
                placeholder="Nombre de la categoría"
                value={newCategory}
                maxLength={60}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() }
                }}
              />
              <button type="button" onClick={handleCreateCategory} disabled={creatingCategory || !newCategory.trim()} className="btn-secondary shrink-0">
                {creatingCategory ? <Spinner className="h-4 w-4" /> : 'Crear'}
              </button>
              <button type="button" onClick={() => setNewCategory(null)} className="btn-ghost shrink-0">Cancelar</button>
            </div>
          )}
        </div>

        <div>
          <label className="label">Imagen</label>
          <div className="flex items-center gap-3">
            <ProductImage
              src={form.image_url}
              alt="Vista previa"
              category={categoryName}
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFile} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary !px-3 !py-2 text-xs">
                {uploading ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                {form.image_url ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', '')} disabled={uploading} className="btn-ghost !px-3 !py-2 text-xs">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ink-400">JPG, PNG, WEBP o GIF · máximo {MAX_IMAGE_MB} MB. Se ajusta sola a 1000 px.</p>
          <details className="mt-2 text-xs text-ink-500">
            <summary className="cursor-pointer select-none">O pega un enlace de imagen</summary>
            <input
              className="input mt-2"
              value={form.image_url?.startsWith('/uploads/') ? '' : form.image_url || ''}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://..."
            />
          </details>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="p-price">Precio (S/.)</label>
            <input id="p-price" className="input" type="number" step="0.10" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="p-stock">Stock</label>
            <input id="p-stock" className="input" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-status">Estado</label>
          <select id="p-status" className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="mt-1 text-xs text-ink-400">{STATUS_OPTIONS.find(([v]) => v === form.status)?.[2]}</p>
        </div>

        <div className="space-y-2 rounded-xl bg-ink-50 p-3">
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            <span><strong>Destacado.</strong> Sale primero en el menú y lleva una etiqueta.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.sold_out} onChange={(e) => set('sold_out', e.target.checked)} />
            <span><strong>Marcar como agotado</strong> aunque haya unidades en stock. Los clientes no podrán pedirlo.</span>
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

const FILTERS = [
  ['todos', 'Todos'],
  ['publicados', 'Publicados'],
  ['borradores', 'Borradores'],
  ['archivados', 'Archivados'],
  ['por_agotarse', 'Por agotarse'],
  ['agotados', 'Agotados'],
]

const MATCHERS = {
  todos: () => true,
  publicados: (p) => p.status === 'publicado',
  borradores: (p) => p.status === 'borrador',
  archivados: (p) => p.status === 'archivado',
  por_agotarse: (p) => p.status === 'publicado' && p.low_stock,
  agotados: (p) => p.status !== 'archivado' && p.sold_out,
}

function Tag({ tone, children }) {
  const tones = {
    star: 'bg-brand-100 text-brand-800',
    warn: 'bg-amber-100 text-amber-900',
    out: 'bg-ink-800 text-white',
    draft: 'bg-blue-50 text-blue-800',
    muted: 'bg-ink-100 text-ink-600',
  }
  return <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
}

export default function AdminProducts() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todas')
  const [editing, setEditing] = useState(null) // null = cerrado, {} = nuevo, objeto = editar
  const [busyId, setBusyId] = useState(null)
  const [exporting, setExporting] = useState(false)

  const filterParam = params.get('filtro')
  const filter = MATCHERS[filterParam] ? filterParam : 'todos'

  function setFilter(value) {
    const next = new URLSearchParams(params)
    if (value === 'todos') next.delete('filtro')
    else next.set('filtro', value)
    setParams(next, { replace: true })
  }

  function load() {
    setLoading(true)
    Promise.all([api.getAdminProducts(token), api.getAdminCategories(token)])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats) })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const counts = useMemo(
    () => Object.fromEntries(Object.entries(MATCHERS).map(([key, fn]) => [key, products.filter(fn).length])),
    [products]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        MATCHERS[filter](p) &&
        (category === 'todas' || (category === 'sin' ? !p.category_id : p.category_id === category)) &&
        (p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    )
  }, [products, filter, category, search])

  const canReorder = filter === 'todos' && category === 'todas' && !search

  function handleSaved(saved) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id)
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
    })
    // Si cambió el destacado, el orden del servidor cambia: lo volvemos a pedir
    api.getAdminProducts(token).then(setProducts).catch(() => {})
    setEditing(null)
  }

  async function handleArchive(product) {
    const ok = await confirm({
      title: `¿Archivar «${product.name}»?`,
      message: 'Dejará de verse en el menú. Los pedidos anteriores no se afectan y puedes volver a publicarlo editándolo.',
      confirmText: 'Archivar',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(product.id)
    try {
      await api.deleteProduct(token, product.id)
      toast.success('Producto archivado')
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: 'archivado', active: false } : p)))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleFeatured(product) {
    setBusyId(product.id)
    try {
      await api.updateProduct(token, product.id, { featured: !product.featured })
      const fresh = await api.getAdminProducts(token)
      setProducts(fresh)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function move(index, delta) {
    const target = index + delta
    const next = [...products]
    ;[next[index], next[target]] = [next[target], next[index]]
    setProducts(next)
    try {
      await api.reorderProducts(token, next.map((p) => p.id))
    } catch (e) {
      toast.error(e.message)
      load()
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await api.exportProducts(token)
      toast.success('Descarga lista')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const attention = counts.por_agotarse + counts.agotados

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Productos del menú.</p>
      <AdminNav />

      {attention > 0 && filter !== 'por_agotarse' && filter !== 'agotados' && !loading && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {counts.agotados > 0 && <><strong>{counts.agotados}</strong> {counts.agotados === 1 ? 'agotado' : 'agotados'}</>}
            {counts.agotados > 0 && counts.por_agotarse > 0 && ' y '}
            {counts.por_agotarse > 0 && <><strong>{counts.por_agotarse}</strong> por agotarse</>}
            . Repón el stock para no perder ventas.
          </span>
          <button onClick={() => setFilter(counts.agotados > 0 ? 'agotados' : 'por_agotarse')} className="font-semibold underline">Ver</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)} className={filter === value ? 'chip-on' : 'chip-off'}>
            {label} <span className="opacity-60">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input className="input !pl-9" placeholder="Buscar producto" aria-label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-52" aria-label="Filtrar por categoría" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="sin">Sin categoría</option>
        </select>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={handleExport} disabled={exporting} className="btn-secondary">
            {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" aria-hidden="true" />} Exportar
          </button>
          <button onClick={() => setEditing({})} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo producto
          </button>
        </div>
      </div>

      {!canReorder && filtered.length > 1 && (
        <p className="mb-3 text-xs text-ink-400">Para cambiar el orden del menú, quita los filtros y la búsqueda.</p>
      )}

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay productos aquí" subtitle={products.length ? 'Prueba con otro filtro.' : 'Crea el primero con el botón de arriba.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const index = products.findIndex((x) => x.id === p.id)
            const prev = products[index - 1]
            const next = products[index + 1]
            const inactive = p.status !== 'publicado'
            return (
              <div key={p.id} className={`panel flex gap-3 p-3 ${inactive ? 'opacity-60' : ''}`}>
                <ProductImage src={p.image_url} alt={p.name} category={p.category} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-400">{p.category || 'Sin categoría'}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-display font-bold text-ink-900">{money(p.price)}</span>
                    <span className={`text-xs ${p.stock === 0 ? 'font-semibold text-red-600' : 'text-ink-500'}`}>Stock: {p.stock}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.featured && <Tag tone="star"><Star className="h-3 w-3" aria-hidden="true" /> Destacado</Tag>}
                    {p.status === 'borrador' && <Tag tone="draft">Borrador</Tag>}
                    {p.status === 'archivado' && <Tag tone="muted">Archivado</Tag>}
                    {p.sold_out && p.status === 'publicado' && <Tag tone="out">Agotado{p.sold_out_manual && p.stock > 0 ? ' (manual)' : ''}</Tag>}
                    {p.low_stock && !p.sold_out && <Tag tone="warn">Por agotarse</Tag>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Editar ${p.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleFeatured(p)}
                    disabled={busyId === p.id}
                    className={`rounded-lg p-1.5 hover:bg-ink-100 ${p.featured ? 'text-brand-600' : 'text-ink-400 hover:text-ink-700'}`}
                    aria-label={p.featured ? `Quitar destacado a ${p.name}` : `Destacar ${p.name}`}
                    title={p.featured ? 'Quitar destacado' : 'Destacar'}
                  >
                    <Star className="h-4 w-4" fill={p.featured ? 'currentColor' : 'none'} />
                  </button>
                  {p.status !== 'archivado' && (
                    <button
                      onClick={() => handleArchive(p)}
                      disabled={busyId === p.id}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Archivar ${p.name}`}
                      title="Archivar"
                    >
                      {busyId === p.id ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {canReorder && (
                  <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-ink-100 pl-2">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={!prev || prev.featured !== p.featured}
                      className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25"
                      aria-label={`Subir ${p.name}`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={!next || next.featured !== p.featured}
                      className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25"
                      aria-label={`Bajar ${p.name}`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {categories.length === 0 && !loading && (
        <p className="mt-6 text-sm text-ink-500">
          Aún no tienes categorías. <Link to={`${ADMIN_BASE}/categories`} className="font-semibold text-brand-600 hover:underline">Crea la primera</Link> para ordenar el menú.
        </p>
      )}

      {editing !== null && (
        <ProductForm
          initial={editing.id ? editing : null}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={handleSaved}
          onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
        />
      )}
    </div>
  )
}
