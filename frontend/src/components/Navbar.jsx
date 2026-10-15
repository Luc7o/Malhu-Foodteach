import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { House, LogOut, Menu, ShoppingBag, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Logo } from './ui'
import { ADMIN_URL } from '../lib/appMode'

const LINKS = [
  ['/nosotros', 'Nosotros'],
  ['/menu', 'Productos'],
  ['/contacto', 'Contáctanos'],
  ['/faqs', 'FAQs'],
]

function NavItem({ to, end, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-2.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white'
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
      className="relative flex items-center gap-2 rounded-[10px] border border-white/25 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      aria-label={`Carrito, ${count} productos`}
    >
      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1 text-[11px] font-bold text-brand-900">
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
    <header className="sticky top-0 z-50 bg-brand-900/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-3" onClick={close} aria-label="MALHÚ, ir al inicio">
          <Logo tone="light" tagline={false} />
        </Link>

        <div className="hidden flex-1 items-center gap-0.5 lg:flex">
          <NavItem to="/" end>
            <House className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Inicio</span>
          </NavItem>
          {LINKS.map(([to, label]) => (
            <NavItem key={to} to={to}>{label}</NavItem>
          ))}
          {user && <NavItem to="/orders">Mis pedidos</NavItem>}
          {user?.role === 'admin' && (ADMIN_URL
            ? <a href={ADMIN_URL} className="rounded-lg px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-brand-200 hover:bg-white/10 hover:text-white">Administración</a>
            : <NavItem to="/admin">Administración</NavItem>)}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <CartLink count={count} />
          {user ? (
            <div className="flex items-center gap-1 pl-2">
              <span className="max-w-[10rem] truncate text-sm font-semibold text-white">{user.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-[10px] p-2.5 text-brand-200 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link to="/login" className="btn border border-white/25 text-white hover:bg-white/10">Iniciar sesión</Link>
              <Link to="/register" className="btn bg-brand-100 text-brand-900 hover:bg-white">Crear cuenta</Link>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <CartLink count={count} onClick={close} />
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/25 text-white"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-white/10 px-4 pb-4 lg:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <NavItem to="/" end onClick={close}>Inicio</NavItem>
            {LINKS.map(([to, label]) => (
              <NavItem key={to} to={to} onClick={close}>{label}</NavItem>
            ))}
            {user && <NavItem to="/orders" onClick={close}>Mis pedidos</NavItem>}
            {user?.role === 'admin' && (ADMIN_URL
              ? <a href={ADMIN_URL} onClick={close} className="rounded-lg px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-brand-200 hover:bg-white/10 hover:text-white">Administración</a>
              : <NavItem to="/admin" onClick={close}>Administración</NavItem>)}
            <div className="mt-2 border-t border-white/10 pt-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <button onClick={handleLogout} className="btn border border-white/25 text-white hover:bg-white/10">Cerrar sesión</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={close} className="btn flex-1 border border-white/25 text-white hover:bg-white/10">Iniciar sesión</Link>
                  <Link to="/register" onClick={close} className="btn flex-1 bg-brand-100 text-brand-900 hover:bg-white">Crear cuenta</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
