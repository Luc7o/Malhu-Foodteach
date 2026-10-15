import { NavLink } from 'react-router-dom'
import { ADMIN_BASE } from '../lib/appMode'

const TABS = [
  [ADMIN_BASE || '/', 'Resumen', true],
  [`${ADMIN_BASE}/lockers`, 'Lockers', false],
  [`${ADMIN_BASE}/orders`, 'Pedidos', false],
  [`${ADMIN_BASE}/products`, 'Productos', false],
]

export default function AdminNav() {
  return (
    <div className="mb-8 border-b border-ink-200">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Administración">
        {TABS.map(([to, label, end]) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-brand-600 text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
