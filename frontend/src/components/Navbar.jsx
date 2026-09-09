import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { items } = useCart()

  return (
    <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #ccc' }}>
      <Link to="/">Malhu Foodtech</Link>
      <Link to="/">Catálogo</Link>
      <Link to="/cart">Carrito ({items.length})</Link>

      {user ? (
        <>
          <Link to="/orders">Mis pedidos</Link>
          {user.role === 'admin' && (
            <>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/products">Productos</Link>
              <Link to="/admin/orders">Órdenes</Link>
            </>
          )}
          <span style={{ marginLeft: 'auto' }}>
            {user.name} ({user.role})
          </span>
          <button onClick={logout}>Salir</button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ marginLeft: 'auto' }}>
            Iniciar sesión
          </Link>
          <Link to="/register">Registrarse</Link>
        </>
      )}
    </nav>
  )
}
