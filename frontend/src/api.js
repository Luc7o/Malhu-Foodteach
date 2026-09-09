const API_URL = 'http://localhost:5000/api'

// Nombre del evento global que se dispara cuando el backend responde 401
// (token vencido o inválido). AuthContext escucha este evento para cerrar
// sesión automáticamente y redirigir al login.
export const AUTH_EXPIRED_EVENT = 'malhu:auth-expired'

const ERROR_MESSAGES = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permisos para hacer esto.',
  404: 'No se encontró el recurso solicitado.',
  500: 'Ocurrió un error en el servidor. Intenta de nuevo.',
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  getProducts: () => request('/products'),
  createProduct: (token, product) =>
    request('/admin/products', { method: 'POST', body: product, token }),
  updateProduct: (token, id, product) =>
    request(`/admin/products/${id}`, { method: 'PUT', body: product, token }),
  deleteProduct: (token, id) =>
    request(`/admin/products/${id}`, { method: 'DELETE', token }),

  getLockers: () => request('/lockers'),
  createLocker: (token, locker) =>
    request('/admin/lockers', { method: 'POST', body: locker, token }),

  createOrder: (token, items, lockerId) =>
    request('/orders', { method: 'POST', body: { items, locker_id: lockerId }, token }),
  payOrder: (token, orderId) =>
    request(`/orders/${orderId}/pay`, { method: 'POST', token }),
  getOrderQr: (token, orderId) => request(`/orders/${orderId}/qr`, { token }),
  getMyOrders: (token) => request('/orders/my', { token }),

  getAdminOrders: (token) => request('/admin/orders', { token }),
  getAdminStats: (token) => request('/admin/stats', { token }),
}
