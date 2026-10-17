import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import { EmptyState, PageLoader, Spinner } from '../../components/ui'

function NameForm({ category, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(category?.name || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Escribe un nombre')
    setSaving(true)
    try {
      const saved = category
        ? await api.updateCategory(token, category.id, name)
        : await api.createCategory(token, name)
      toast.success(category ? 'Categoría actualizada' : 'Categoría creada')
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={category ? 'Renombrar categoría' : 'Nueva categoría'}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" form="category-form" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit}>
        <label className="label" htmlFor="c-name">Nombre</label>
        <input id="c-name" className="input" autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sándwiches" />
        {category && <p className="mt-1.5 text-xs text-ink-400">El nombre nuevo se verá en todos sus productos.</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

function DeleteForm({ category, others, onCancel, onDeleted }) {
  const { token } = useAuth()
  const toast = useToast()
  const [moveTo, setMoveTo] = useState('none')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const hasProducts = category.product_count > 0

  async function handleDelete() {
    setSaving(true)
    setError('')
    try {
      await api.deleteCategory(token, category.id, hasProducts ? moveTo : undefined)
      toast.success('Categoría eliminada')
      onDeleted(category)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Eliminar «${category.name}»`}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button onClick={onCancel} className="btn-secondary">Volver</button>
          <button onClick={handleDelete} disabled={saving} className="btn border border-red-600 bg-red-600 text-white hover:bg-red-700">
            {saving ? <Spinner className="h-4 w-4" /> : 'Eliminar categoría'}
          </button>
        </>
      }
    >
      {hasProducts ? (
        <div>
          <p className="mb-3 text-sm text-ink-600">
            Esta categoría tiene <strong>{category.product_count}</strong> {category.product_count === 1 ? 'producto' : 'productos'}. ¿Qué hacemos con {category.product_count === 1 ? 'él' : 'ellos'}?
          </p>
          <label className="label" htmlFor="move-to">Moverlos a</label>
          <select id="move-to" className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="none">Dejarlos sin categoría</option>
            {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      ) : (
        <p className="text-sm text-ink-600">Esta categoría no tiene productos. Se eliminará sin afectar nada más.</p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
    </Modal>
  )
}

export default function AdminCategories() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = cerrado, {} = nueva, objeto = renombrar
  const [deleting, setDeleting] = useState(null)

  function load() {
    setLoading(true)
    api.getAdminCategories(token).then(setCategories).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [token])

  async function move(index, delta) {
    const target = index + delta
    const next = [...categories]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCategories(next)
    try {
      await api.reorderCategories(token, next.map((c) => c.id))
    } catch (e) {
      toast.error(e.message)
      load()
    }
  }

  function startDelete(category) {
    if (category.product_count > 0) {
      setDeleting(category)
      return
    }
    confirm({
      title: `¿Eliminar «${category.name}»?`,
      message: 'No tiene productos, así que no se afecta nada más.',
      confirmText: 'Eliminar',
      tone: 'danger',
    }).then(async (ok) => {
      if (!ok) return
      try {
        await api.deleteCategory(token, category.id)
        toast.success('Categoría eliminada')
        setCategories((prev) => prev.filter((c) => c.id !== category.id))
      } catch (e) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Categorías del menú. El orden de aquí es el que ven tus clientes.</p>
      <AdminNav />

      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing({})} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aún no hay categorías"
          subtitle="Crea categorías como Sándwiches, Bebidas o Postres para que tus clientes encuentren todo más rápido."
          action={<button onClick={() => setEditing({})} className="btn-primary mt-2"><Plus className="h-4 w-4" aria-hidden="true" /> Crear la primera</button>}
        />
      ) : (
        <ul className="panel divide-y divide-ink-100">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex shrink-0 flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25" aria-label={`Subir ${c.name}`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25" aria-label={`Bajar ${c.name}`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-400">
                  {c.product_count} {c.product_count === 1 ? 'producto' : 'productos'}
                  {c.product_count > 0 && ` · ${c.published_count} publicados`}
                  {c.product_count > 0 && c.published_count === 0 && ' (no se muestra en la tienda)'}
                </p>
              </div>
              <button onClick={() => setEditing(c)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Renombrar ${c.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => startDelete(c)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${c.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <NameForm
          category={editing.id ? editing : null}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
      {deleting && (
        <DeleteForm
          category={deleting}
          others={categories.filter((c) => c.id !== deleting.id)}
          onCancel={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); load() }}
        />
      )}
    </div>
  )
}
