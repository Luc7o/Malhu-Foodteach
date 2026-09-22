import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, ShoppingBag, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Logo } from './ui'

function NavItem({ to, end, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function CartLink({ count, onClick }) {
  return (
    <Link
      to="/cart"
      onClick={onClick}
      className="relative flex items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:border-ink-300"
      aria-label={`Carrito, ${count} productos`}
    >
      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const close = () => setOpen(false)

  function handleLogout() {
    logout()
    close()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-ink-50/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-3" onClick={close} aria-label="MALHÚ, ir al inicio">
          <Logo />
        </Link>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          <NavItem to="/" end>Menú</NavItem>
          {user && <NavItem to="/orders">Mis pedidos</NavItem>}
          {user?.role === 'admin' && <NavItem to="/admin">Administración</NavItem>}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <CartLink count={count} />
          {user ? (
            <div className="flex items-center gap-1 pl-2">
              <span className="max-w-[10rem] truncate text-sm font-semibold text-ink-800">{user.name}</span>
              <button onClick={handleLogout} className="btn-ghost !px-2.5 !py-2" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link to="/login" className="btn-secondary">Iniciar sesión</Link>
              <Link to="/register" className="btn-primary">Crear cuenta</Link>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <CartLink count={count} onClick={close} />
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ink-200 bg-white text-ink-600"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-ink-200 bg-ink-50 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <NavItem to="/" end onClick={close}>Menú</NavItem>
            {user && <NavItem to="/orders" onClick={close}>Mis pedidos</NavItem>}
            {user?.role === 'admin' && <NavItem to="/admin" onClick={close}>Administración</NavItem>}
            <div className="mt-2 border-t border-ink-200 pt-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">{user.name}</p>
                  <button onClick={handleLogout} className="btn-secondary">Cerrar sesión</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={close} className="btn-secondary flex-1">Iniciar sesión</Link>
                  <Link to="/register" onClick={close} className="btn-primary flex-1">Crear cuenta</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
