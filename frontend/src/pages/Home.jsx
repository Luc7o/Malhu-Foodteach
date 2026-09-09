import { useEffect, useState } from 'react'
import { api } from '../api'
import { useCart } from '../context/CartContext'

export default function Home() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const { addItem } = useCart()

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setError(e.message))
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>Catálogo</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {products.map((p) => (
          <div key={p.id} style={{ border: '1px solid #ccc', padding: 12 }}>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <p>S/. {p.price.toFixed(2)}</p>
            <p style={{ fontSize: 12, color: '#666' }}>Stock: {p.stock}</p>
            <button onClick={() => addItem(p)} disabled={p.stock === 0}>
              Agregar al carrito
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
