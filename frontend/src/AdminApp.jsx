import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { RequireAdmin } from './components/PrivateRoute'
import { ConfirmProvider } from './components/ConfirmDialog'
import { Logo } from './components/ui'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLockers from './pages/admin/AdminLockers'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCategories from './pages/admin/AdminCategories'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminHealthTags from './pages/admin/AdminHealthTags'
import AdminSecurity from './pages/admin/AdminSecurity'

function AdminHeader() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-50 bg-brand-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" aria-label="Panel de administración">
          <Logo tone="light" tagline={false} />
        </Link>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-100">
          Admin
        </span>
        {user && (
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-white sm:inline">{user.name}</span>
            <NavLink
              to="/security"
              className={({ isActive }) =>
                `rounded-[10px] p-2.5 hover:bg-white/10 hover:text-white ${isActive ? 'bg-white/10 text-white' : 'text-brand-200'}`
              }
              aria-label="Seguridad de la cuenta"
              title="Seguridad de la cuenta"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </NavLink>
            <button
              onClick={logout}
              className="rounded-[10px] p-2.5 text-brand-200 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

/** App que se sirve en admin.tudominio.com: solo panel de administración, sin tienda. */
export default function AdminApp() {
  return (
    <ConfirmProvider>
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
            <Route path="/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
            <Route path="/categories" element={<RequireAdmin><AdminCategories /></RequireAdmin>} />
            <Route path="/health-tags" element={<RequireAdmin><AdminHealthTags /></RequireAdmin>} />
            <Route path="/customers" element={<RequireAdmin><AdminCustomers /></RequireAdmin>} />
            <Route path="/lockers" element={<RequireAdmin><AdminLockers /></RequireAdmin>} />
            <Route path="/security" element={<RequireAdmin><AdminSecurity /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ConfirmProvider>
  )
}
