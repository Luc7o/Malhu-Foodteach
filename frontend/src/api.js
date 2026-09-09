const API_URL = 'http://localhost:5000/api'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`)
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
