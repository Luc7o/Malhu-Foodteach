import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, HeartPulse, Info, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { adminApi as api } from '../../adminApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import AdminNav from '../../components/AdminNav'
import { useConfirm } from '../../components/ConfirmDialog'
import Modal from '../../components/Modal'
import { EmptyState, PageLoader, Spinner } from '../../components/ui'

// Nombradas por objetivo ("para cuidar..."), no por enfermedad: así no se promete ningún efecto médico
const SUGGESTED = [
  'Para cuidar tu corazón',
  'Control de azúcar',
  'Presión arterial',
  'Digestión',
  'Hierro y energía',
  'Huesos fuertes',
  'Defensas',
  'Control de peso',
]

function NameForm({ tag, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(tag?.name || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Escribe un nombre')
    setSaving(true)
    try {
      const saved = tag ? await api.updateHealthTag(token, tag.id, name) : await api.createHealthTag(token, name)
      toast.success(tag ? 'Etiqueta actualizada' : 'Etiqueta creada')
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={tag ? 'Renombrar etiqueta' : 'Nueva etiqueta de salud'}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button type="submit" form="tag-form" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="tag-form" onSubmit={handleSubmit}>
        <label className="label" htmlFor="t-name">Nombre</label>
        <input id="t-name" className="input" autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Para cuidar tu corazón" />
        <p className="mt-1.5 text-xs text-ink-400">Es el texto que ven tus clientes en la tienda.</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default function AdminHealthTags() {
  const { token } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = cerrado, {} = nueva, objeto = renombrar
  const [seeding, setSeeding] = useState(false)

  function load() {
    setLoading(true)
    api.getAdminHealthTags(token).then(setTags).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [token])

  async function move(index, delta) {
    const target = index + delta
    const next = [...tags]
    ;[next[index], next[target]] = [next[target], next[index]]
    setTags(next)
    try {
      await api.reorderHealthTags(token, next.map((t) => t.id))
    } catch (e) {
      toast.error(e.message)
      load()
    }
  }

  async function handleDelete(tag) {
    const ok = await confirm({
      title: `¿Eliminar «${tag.name}»?`,
      message: tag.product_count > 0
        ? `Se le quitará a ${tag.product_count} ${tag.product_count === 1 ? 'producto' : 'productos'}. Los productos no se eliminan.`
        : 'No tiene productos, así que no se afecta nada más.',
      confirmText: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteHealthTag(token, tag.id)
      toast.success('Etiqueta eliminada')
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function createSuggested() {
    setSeeding(true)
    let created = 0
    for (const name of SUGGESTED) {
      try {
        await api.createHealthTag(token, name)
        created += 1
      } catch {
        // si alguna ya existe, se omite
      }
    }
    setSeeding(false)
    toast.success(`${created} etiquetas creadas`)
    load()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold text-ink-900">Administración</h1>
      <p className="mb-6 text-ink-500">Etiquetas de salud. Tus clientes filtran el menú por ellas y cada producto puede llevar varias.</p>
      <AdminNav />

      <div className="mb-4 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Nombra las etiquetas por <strong>objetivo</strong> («Para cuidar tu corazón»), no por enfermedad, y evita palabras como «cura», «previene» o «trata»: son afirmaciones de salud que suelen estar reguladas.
          No etiquetes embutidos ni productos con mucha azúcar, sal o grasa.
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing({})} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Nueva etiqueta
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : tags.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="Aún no hay etiquetas de salud"
          subtitle="Crea las tuyas o empieza con una lista sugerida y edítala a tu gusto."
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button onClick={createSuggested} disabled={seeding} className="btn-primary">
                {seeding ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} Crear etiquetas sugeridas
              </button>
              <button onClick={() => setEditing({})} className="btn-secondary">Crear la primera</button>
            </div>
          }
        />
      ) : (
        <ul className="panel divide-y divide-ink-100">
          {tags.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex shrink-0 flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25" aria-label={`Subir ${t.name}`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === tags.length - 1} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-25" aria-label={`Bajar ${t.name}`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-400">
                  {t.product_count} {t.product_count === 1 ? 'producto' : 'productos'}
                  {t.product_count > 0 && ` · ${t.published_count} publicados`}
                  {t.published_count === 0 && ' · no se muestra en la tienda hasta que tenga un producto publicado'}
                </p>
              </div>
              <button onClick={() => setEditing(t)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Renombrar ${t.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(t)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${t.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <NameForm tag={editing.id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}
