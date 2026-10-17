// Modo de la app según la variable VITE_APP_MODE (se define en Vercel al construir):
//   - sin definir: tienda pública (malhu-foodteach)
//   - "admin": panel de administración, servido solo en el subdominio admin
export const IS_ADMIN_APP = import.meta.env.VITE_APP_MODE === 'admin'

// En la app de admin las rutas cuelgan de "/" (admin.tudominio.com/orders).
export const ADMIN_BASE = ''

// Dirección de la tienda, para el botón "Ver tienda" del panel. Se toma de VITE_STORE_URL;
// si no está definida y el panel corre en admin.tudominio.com, se deduce quitando "admin.".
// Si no se puede saber (por ejemplo en una vista previa de Vercel), el botón no se muestra.
function resolveStoreUrl() {
  const explicit = (import.meta.env.VITE_STORE_URL || '').trim().replace(/\/$/, '')
  if (explicit) return explicit
  const { protocol, hostname } = window.location
  return hostname.startsWith('admin.') ? `${protocol}//${hostname.slice('admin.'.length)}` : ''
}

export const STORE_URL = IS_ADMIN_APP ? resolveStoreUrl() : ''
