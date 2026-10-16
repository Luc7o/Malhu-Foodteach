// En desarrollo apunta al backend local. En producción define VITE_API_URL
// (por ejemplo https://api.tudominio.com/api) al construir el frontend.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

export async function request(path, { method = 'GET', body, token } = {}) {
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
  // `otp` solo se usa en el panel de administración (verificación en dos pasos)
  login: (email, password, otp) =>
    request('/auth/login', { method: 'POST', body: otp ? { email, password, otp } : { email, password } }),

  getProducts: () => request('/products'),
  getCategories: () => request('/categories'),
  getHealthTags: () => request('/health-tags'),
  getLockers: () => request('/lockers'),
  createOrder: (token, items, lockerId) =>
    request('/orders', { method: 'POST', body: { items, locker_id: lockerId }, token }),
  payOrder: (token, orderId, method) =>
    request(`/orders/${orderId}/pay`, { method: 'POST', body: { method }, token }),
  // Izipay: formToken para el formulario y confirmación firmada del pago
  izipayFormToken: (token, orderId) =>
    request(`/orders/${orderId}/izipay/form-token`, { method: 'POST', token }),
  izipayValidate: (token, orderId, krAnswer, krHash) =>
    request(`/orders/${orderId}/izipay/validate`, {
      method: 'POST',
      body: { kr_answer: krAnswer, kr_hash: krHash },
      token,
    }),
  cancelOrder: (token, orderId) =>
    request(`/orders/${orderId}/cancel`, { method: 'POST', token }),
  getOrder: (token, orderId) => request(`/orders/${orderId}`, { token }),
  getOrderQr: (token, orderId) => request(`/orders/${orderId}/qr`, { token }),
  getMyOrders: (token) => request('/orders/my', { token }),
}
