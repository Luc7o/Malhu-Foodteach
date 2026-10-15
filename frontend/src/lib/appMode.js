// Modo de la app según la variable VITE_APP_MODE (se define en Vercel al construir):
//   - sin definir: tienda pública (malhu-foodteach)
//   - "admin": panel de administración, servido solo en el subdominio admin
export const IS_ADMIN_APP = import.meta.env.VITE_APP_MODE === 'admin'

// En la app de admin las rutas cuelgan de "/" (admin.tudominio.com/orders).
export const ADMIN_BASE = ''
