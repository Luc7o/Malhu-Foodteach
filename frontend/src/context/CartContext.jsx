import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'malhu_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  }) // [{ product, quantity }]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(product, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const maxQty = product.stock ?? Infinity
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, maxQty)
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: nextQty } : i))
      }
      return [...prev, { product, quantity: Math.min(quantity, maxQty) }]
    })
  }

  function setQuantity(productId, quantity) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i
        const maxQty = i.product.stock ?? Infinity
        const clamped = Math.max(1, Math.min(quantity, maxQty))
        return { ...i, quantity: clamped }
      })
    )
  }

  function incrementItem(productId, delta) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i
        const maxQty = i.product.stock ?? Infinity
        return { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, maxQty)) }
      })
    )
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function clearCart() {
    setItems([])
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, setQuantity, incrementItem, total, count }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
