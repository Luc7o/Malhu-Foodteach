import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'

const emptyForm = { name: '', description: '', price: '', stock: '' }

export default function AdminProducts() {
  const { token } = useAuth()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  function loadProducts() {
    api.getProducts().then(setProducts)
  }

  useEffect(loadProducts, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) }
      if (editingId) {
        await api.updateProduct(token, editingId, payload)
      } else {
        await api.createProduct(token, payload)
      }
      setForm(emptyForm)
      setEditingId(null)
      loadProducts()
    } catch (e) {
      setError(e.message)
    }
  }

  function handleEdit(p) {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock })
    setEditingId(p.id)
  }

  async function handleDelete(id) {
    await api.deleteProduct(token, id)
    loadProducts()
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Productos (admin)</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          placeholder="Precio"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          placeholder="Stock"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear producto'}</button>
        {editingId && (
          <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null) }}>
            Cancelar
          </button>
        )}
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>S/. {p.price.toFixed(2)}</td>
              <td>{p.stock}</td>
              <td>
                <button onClick={() => handleEdit(p)}>Editar</button>
                <button onClick={() => handleDelete(p.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
