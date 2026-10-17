import { createContext, useContext, useEffect, useState } from 'react'
import { lineKey, unitPrice } from '../lib/dish'

const CartContext = createContext(null)
const STORAGE_KEY = 'malhu_cart'

// Cada línea: { key, product, quantity, options: [opción elegida con su nutrición y extra_price] }.
// Un mismo plato con opciones distintas ocupa líneas distintas.
function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    // Carritos guardados antes de existir los platos personalizables no tienen key ni options
    return stored
      .filter((i) => i?.product?.id)
      .map((i) => {
        const options = i.options || []
        return { ...i, options, key: i.key || lineKey(i.product.id, options.map((o) => o.id)) }
      })
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* sin almacenamiento: el carrito vive solo en memoria */
    }
  }, [items])

  function addItem(product, quantity = 1, options = []) {
    const key = lineKey(product.id, options.map((o) => o.id))
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key)
      const maxQty = product.stock ?? Infinity
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, maxQty)
        return prev.map((i) => (i.key === key ? { ...i, product, quantity: nextQty } : i))
      }
      return [...prev, { key, product, options, quantity: Math.min(quantity, maxQty) }]
    })
  }

  function incrementItem(key, delta) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const maxQty = i.product.stock ?? Infinity
        return { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, maxQty)) }
      })
    )
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + unitPrice(i.product, i.options) * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, incrementItem, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
