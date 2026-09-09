import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-2 flex items-center gap-2 text-lg font-extrabold text-ink-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            🍱
          </span>
          <span className="hidden sm:inline">
            Malhu <span className="text-brand-600">Foodtech</span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          <NavItem to="/">Catálogo</NavItem>
          {user && <NavItem to="/orders">Mis pedidos</NavItem>}
          {user?.role === 'admin' && (
            <>
              <NavItem to="/admin">Dashboard</NavItem>
              <NavItem to="/admin/products">Productos</NavItem>
              <NavItem to="/admin/orders">Órdenes</NavItem>
            </>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            to="/cart"
            className="relative flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            🛒 Carrito
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-ink-800">{user.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink-400">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="btn-ghost !px-3 !py-2">
                Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link to="/login" className="btn-secondary">
                Iniciar sesión
              </Link>
              <Link to="/register" className="btn-primary">
                Registrarse
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 text-ink-600 md:hidden"
          aria-label="Abrir menú"
        >
          {open ? '✕' : '☰'}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-ink-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <NavItem to="/" onClick={() => setOpen(false)}>
              Catálogo
            </NavItem>
            <NavItem to="/cart" onClick={() => setOpen(false)}>
              Carrito {count > 0 && `(${count})`}
            </NavItem>
            {user && (
              <NavItem to="/orders" onClick={() => setOpen(false)}>
                Mis pedidos
              </NavItem>
            )}
            {user?.role === 'admin' && (
              <>
                <NavItem to="/admin" onClick={() => setOpen(false)}>
                  Dashboard
                </NavItem>
                <NavItem to="/admin/products" onClick={() => setOpen(false)}>
                  Productos
                </NavItem>
                <NavItem to="/admin/orders" onClick={() => setOpen(false)}>
                  Órdenes
                </NavItem>
              </>
            )}
            <div className="mt-2 border-t border-ink-100 pt-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{user.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-ink-400">{user.role}</p>
                  </div>
                  <button onClick={handleLogout} className="btn-secondary">
                    Salir
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                    Iniciar sesión
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
