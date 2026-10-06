// En desarrollo apunta al backend local. En producción define VITE_API_URL
// (por ejemplo https://api.tudominio.com/api) al construir el frontend.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Origen del backend (sin /api). Sirve para armar la URL de las imágenes subidas,
// que el backend guarda como ruta relativa (/uploads/products/xxxx.jpg).
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

export function assetUrl(path) {
  if (!path) return path
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

// Nombre del evento global que se dispara cuando el backend responde 401
// (token vencido o inválido). AuthContext escucha este evento para cerrar
// sesión automáticamente y redirigir al login.
export const AUTH_EXPIRED_EVENT = 'malhu:auth-expired'

const ERROR_MESSAGES = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permisos para hacer esto.',
  404: 'No se encontró lo que buscas.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo.',
}

async function request(path, { method = 'GET', body, token } = {}) {
  // Con FormData (subida de archivos) el navegador pone solo el Content-Type correcto
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const headers = isForm ? {} : { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
  } catch (networkErr) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    const message = data.error || data.msg || ERROR_MESSAGES[res.status] || `Error ${res.status}`
    throw new Error(message)
  }
  return data
}

export const api = {
  getConfig: () => request('/config'),

  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getProducts: () => request('/products'),
  getAdminProducts: (token) => request('/admin/products', { token }),
  createProduct: (token, product) =>
    request('/admin/products', { method: 'POST', body: product, token }),
  updateProduct: (token, id, product) =>
    request(`/admin/products/${id}`, { method: 'PUT', body: product, token }),
  deleteProduct: (token, id) =>
    request(`/admin/products/${id}`, { method: 'DELETE', token }),
  uploadProductImage: (token, file) => {
    const form = new FormData()
    form.append('image', file)
    return request('/admin/products/image', { method: 'POST', body: form, token })
  },

  getLockers: () => request('/lockers'),
  getAdminLockers: (token) => request('/admin/lockers', { token }),
  createLocker: (token, locker) =>
    request('/admin/lockers', { method: 'POST', body: locker, token }),
  updateLocker: (token, id, data) =>
    request(`/admin/lockers/${id}`, { method: 'PUT', body: data, token }),
  rotateLockerKey: (token, id) =>
    request(`/admin/lockers/${id}/rotate-key`, { method: 'POST', token }),
  setBoxStatus: (token, boxId, status) =>
    request(`/admin/boxes/${boxId}`, { method: 'PATCH', body: { status }, token }),

  // Llave digital del admin (QR para abrir una caja y cargar productos)
  createAdminKey: (token, lockerId, data) =>
    request(`/admin/lockers/${lockerId}/keys`, { method: 'POST', body: data, token }),
  getAdminKeyQr: (token, keyId) => request(`/admin/keys/${keyId}/qr`, { token }),
  revokeAdminKey: (token, keyId) =>
    request(`/admin/keys/${keyId}`, { method: 'DELETE', token }),

  createOrder: (token, items, lockerId) =>
    request('/orders', { method: 'POST', body: { items, locker_id: lockerId }, token }),
  payOrder: (token, orderId, method) =>
    request(`/orders/${orderId}/pay`, { method: 'POST', body: { method }, token }),
  cancelOrder: (token, orderId) =>
    request(`/orders/${orderId}/cancel`, { method: 'POST', token }),
  getOrder: (token, orderId) => request(`/orders/${orderId}`, { token }),
  getOrderQr: (token, orderId) => request(`/orders/${orderId}/qr`, { token }),
  getMyOrders: (token) => request('/orders/my', { token }),

  getAdminOrders: (token) => request('/admin/orders', { token }),
  cancelAdminOrder: (token, orderId) =>
    request(`/admin/orders/${orderId}/cancel`, { method: 'POST', token }),
  getAdminStats: (token) => request('/admin/stats', { token }),
}
