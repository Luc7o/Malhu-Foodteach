// Modo de la app según la variable VITE_APP_MODE (se define en Vercel al construir):
//   - sin definir / "store": tienda pública (malhu-foodteach)
//   - "admin": panel de administración, pensado para admin.tudominio.com
export const IS_ADMIN_APP = import.meta.env.VITE_APP_MODE === 'admin'

// En la app de admin las rutas cuelgan de "/" (admin.tudominio.com/orders).
// En la tienda siguen bajo "/admin" (tudominio.com/admin/orders).
export const ADMIN_BASE = IS_ADMIN_APP ? '' : '/admin'

// URL del subdominio de admin (opcional). Si existe, el enlace "Administración"
// de la tienda apunta allí. Ej: https://admin.xn--malh-tra.com
export const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || '').replace(/\/$/, '')
