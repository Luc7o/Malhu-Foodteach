// Llamadas al backend exclusivas del panel de administración.
// Solo las importan AdminApp y las páginas de src/pages/admin, así que el build
// de la tienda no las incluye.
import { API_URL, AUTH_EXPIRED_EVENT, request } from './api'

/** Arma ?a=1&b=2 omitiendo los valores vacíos. */
export function buildQuery(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'todos') q.set(key, value)
  })
  const text = q.toString()
  return text ? `?${text}` : ''
}

/** Descarga un archivo (CSV) que el backend protege con el token del admin. */
async function download(path, token, fallbackName) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `No se pudo descargar (error ${res.status})`)
  }
  const match = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = match ? match[1] : fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const adminApi = {
  // ---------- resumen
  getAdminStats: (token, range = 7) => request(`/admin/stats?range=${range}`, { token }),

  // ---------- productos
  getAdminProducts: (token) => request('/admin/products', { token }),
  createProduct: (token, product) =>
    request('/admin/products', { method: 'POST', body: product, token }),
  updateProduct: (token, id, product) =>
    request(`/admin/products/${id}`, { method: 'PUT', body: product, token }),
  deleteProduct: (token, id) =>
    request(`/admin/products/${id}`, { method: 'DELETE', token }),
  reorderProducts: (token, ids) =>
    request('/admin/products/reorder', { method: 'POST', body: { ids }, token }),
  uploadProductImage: (token, file) => {
    const form = new FormData()
    form.append('image', file)
    return request('/admin/products/image', { method: 'POST', body: form, token })
  },

  // ---------- categorías
  getAdminCategories: (token) => request('/admin/categories', { token }),
  createCategory: (token, name) =>
    request('/admin/categories', { method: 'POST', body: { name }, token }),
  updateCategory: (token, id, name) =>
    request(`/admin/categories/${id}`, { method: 'PUT', body: { name }, token }),
  deleteCategory: (token, id, moveTo) =>
    request(`/admin/categories/${id}${moveTo ? `?move_to=${encodeURIComponent(moveTo)}` : ''}`, { method: 'DELETE', token }),
  reorderCategories: (token, ids) =>
    request('/admin/categories/reorder', { method: 'POST', body: { ids }, token }),

  // ---------- etiquetas de salud
  getAdminHealthTags: (token) => request('/admin/health-tags', { token }),
  createHealthTag: (token, name) =>
    request('/admin/health-tags', { method: 'POST', body: { name }, token }),
  updateHealthTag: (token, id, name) =>
    request(`/admin/health-tags/${id}`, { method: 'PUT', body: { name }, token }),
  deleteHealthTag: (token, id) =>
    request(`/admin/health-tags/${id}`, { method: 'DELETE', token }),
  reorderHealthTags: (token, ids) =>
    request('/admin/health-tags/reorder', { method: 'POST', body: { ids }, token }),

  // ---------- pedidos
  getAdminOrders: (token, params) => request(`/admin/orders${buildQuery(params)}`, { token }),
  cancelAdminOrder: (token, orderId) =>
    request(`/admin/orders/${orderId}/cancel`, { method: 'POST', token }),

  // ---------- clientes
  getCustomers: (token, params) => request(`/admin/customers${buildQuery(params)}`, { token }),
  getCustomer: (token, id) => request(`/admin/customers/${id}`, { token }),
  setCustomerActive: (token, id, active) =>
    request(`/admin/customers/${id}`, { method: 'PATCH', body: { active }, token }),

  // ---------- exportar a CSV
  exportOrders: (token, params) => download(`/admin/export/orders${buildQuery(params)}`, token, 'pedidos.csv'),
  exportProducts: (token) => download('/admin/export/products', token, 'productos.csv'),
  exportCustomers: (token, params) => download(`/admin/export/customers${buildQuery(params)}`, token, 'clientes.csv'),

  // ---------- lockers
  getAdminLockers: (token) => request('/admin/lockers', { token }),
  createLocker: (token, locker) =>
    request('/admin/lockers', { method: 'POST', body: locker, token }),
  updateLocker: (token, id, data) =>
    request(`/admin/lockers/${id}`, { method: 'PUT', body: data, token }),
  rotateLockerKey: (token, id) =>
    request(`/admin/lockers/${id}/rotate-key`, { method: 'POST', token }),
  setBoxStatus: (token, boxId, status) =>
    request(`/admin/boxes/${boxId}`, { method: 'PATCH', body: { status }, token }),
  getLockerEvents: (token, id, params) =>
    request(`/admin/lockers/${id}/events${buildQuery(params)}`, { token }),

  // Botón "Abrir": el ESP32 recoge la orden y abre la caja en modo carga
  openBox: (token, lockerId, boxNumber) =>
    request(`/admin/lockers/${lockerId}/boxes/${boxNumber}/open`, { method: 'POST', token }),

  // ---------- seguridad
  getSecurity: (token) => request('/admin/security', { token }),
  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST', body: { current_password: currentPassword, new_password: newPassword }, token,
    }),
  twofaSetup: (token) => request('/admin/security/2fa/setup', { method: 'POST', token }),
  twofaEnable: (token, code) =>
    request('/admin/security/2fa/enable', { method: 'POST', body: { code }, token }),
  twofaDisable: (token, password, code) =>
    request('/admin/security/2fa/disable', { method: 'POST', body: { password, code }, token }),
}
