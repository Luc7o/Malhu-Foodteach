import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { EmptyState, PageLoader, ProductImage, Spinner } from '../../components/ui'

const emptyForm = { name: '', description: '', price: '', stock: '', image_url: '', active: true }

function ProductModal({ open, onClose, form, setForm, onSubmit, editing, saving, error }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 backdrop-blur-sm">
      <div className="card w-full max-w-lg animate-fade-in p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">
            {editing ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio (S/.)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Stock</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">URL de imagen (opcional)</label>
            <input
              className="input"
              placeholder="https://..."
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>
          {form.image_url && (
            <ProductImage src={form.image_url} alt="preview" className="h-28 w-28 rounded-xl object-cover" />
          )}
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-brand-600"
            />
            Producto activo (visible en catálogo)
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Spinner className="h-4 w-4 text-white" /> : editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminProducts() {
  const { token } = useAuth()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  function loadProducts() {
    setLoading(true)
    api.getProducts().then(setProducts).finally(() => setLoading(false))
  }

  useEffect(loadProducts, [])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setModalOpen(true)
  }

  function handleEdit(p) {
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      image_url: p.image_url || '',
      active: p.active !== false,
    })
    setEditingId(p.id)
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        image_url: form.image_url || null,
      }
      if (editingId) {
        await api.updateProduct(token, editingId, payload)
        toast.success('Producto actualizado')
      } else {
        await api.createProduct(token, payload)
        toast.success('Producto creado')
      }
      setModalOpen(false)
      loadProducts()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Desactivar este producto? Dejará de verse en el catálogo.')) return
    setDeletingId(id)
    try {
      await api.deleteProduct(token, id)
      toast.success('Producto desactivado')
      loadProducts()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-ink-900">Productos</h2>
        <button onClick={openCreate} className="btn-primary">
          + Nuevo producto
        </button>
      </div>

      <input
        className="input mb-4 sm:w-72"
        placeholder="Buscar producto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <PageLoader label="Cargando productos..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🍽️" title="No hay productos" subtitle="Crea tu primer producto para empezar a vender." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="flex items-center gap-3 px-4 py-3">
                    <ProductImage src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                    <div>
                      <p className="font-medium text-ink-800">{p.name}</p>
                      {p.description && (
                        <p className="max-w-xs truncate text-xs text-ink-400">{p.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-700">S/. {p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock === 0 ? 'font-semibold text-red-500' : 'text-ink-700'}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>
                      {p.active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="btn-secondary !px-3 !py-1.5 text-xs">
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="btn-danger !px-3 !py-1.5 text-xs"
                      >
                        {deletingId === p.id ? <Spinner className="h-3 w-3" /> : 'Desactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        editing={!!editingId}
        saving={saving}
        error={error}
      />
    </div>
  )
}
