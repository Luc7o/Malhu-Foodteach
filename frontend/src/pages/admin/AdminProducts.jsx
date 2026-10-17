import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { EmptyState, PageLoader, ProductImage, Spinner } from '../../components/ui'
import { money } from '../../lib/format'
import { CATEGORIES } from '../../lib/categories'

const MAX_IMAGE_MB = 5

const EMPTY_FORM = { name: '', description: '', category: '', price: '', stock: '', image_url: '', active: true }

function ProductForm({ initial, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const isEdit = Boolean(initial?.id)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const price = parseFloat(form.price)
    const stock = parseInt(form.stock, 10)
    if (!form.name.trim()) return setError('El nombre es obligatorio')
    if (Number.isNaN(price) || price < 0) return setError('Ingresa un precio válido')
    if (Number.isNaN(stock) || stock < 0) return setError('Ingresa un stock válido')

    setSaving(true)
    const payload = { ...form, price, stock }
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input className="input" list="categorias-malhu" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Nutracéuticos" />
            <datalist id="categorias-malhu">
              {CATEGORIES.map((c) => <option key={c.name} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Imagen</label>
            <div className="flex items-center gap-3">
              <ProductImage
                src={form.image_url}
                alt="Vista previa"
                category={form.category}
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFile}
                />
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
              <label className="label">Precio (S/.)</label>
              <input className="input" type="number" step="0.10" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} required />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Visible en el menú
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminProducts() {
  const { token } = useAuth()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null = cerrado, {} = nuevo, objeto = editar
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    api.getAdminProducts(token).then(setProducts).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
  }, [products, search])

  function handleSaved(saved) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id)
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
    })
    setEditing(null)
  }

  async function handleDelete(product) {
    if (!confirm(`¿Quitar "${product.name}" del menú?`)) return
    setBusyId(product.id)
    try {
      await api.deleteProduct(token, product.id)
      toast.success('Producto quitado del menú')
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: false } : p)))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Productos del menú.</p>
      <AdminNav />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input className="input !pl-9" placeholder="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setEditing({})} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay productos" subtitle="Crea el primero con el botón de arriba." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className={`panel flex gap-3 p-3 ${!p.active ? 'opacity-50' : ''}`}>
              <ProductImage src={p.image_url} alt={p.name} category={p.category} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-ink-400">{p.category || 'Sin categoría'}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-display font-bold text-ink-900">{money(p.price)}</span>
                  <span className={`text-xs ${p.stock === 0 ? 'text-red-600' : 'text-ink-500'}`}>Stock: {p.stock}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Editar ${p.name}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                {p.active && (
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={busyId === p.id}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Quitar ${p.name} del menú`}
                  >
                    {busyId === p.id ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ProductForm initial={editing.id ? editing : null} onCancel={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
