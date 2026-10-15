// Llamadas al backend exclusivas del panel de administración.
// Solo las importan AdminApp y las páginas de src/pages/admin, así que el build
// de la tienda no las incluye.
import { request } from './api'

export const adminApi = {
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

  getAdminLockers: (token) => request('/admin/lockers', { token }),
  createLocker: (token, locker) =>
    request('/admin/lockers', { method: 'POST', body: locker, token }),
  updateLocker: (token, id, data) =>
    request(`/admin/lockers/${id}`, { method: 'PUT', body: data, token }),
  rotateLockerKey: (token, id) =>
    request(`/admin/lockers/${id}/rotate-key`, { method: 'POST', token }),
  setBoxStatus: (token, boxId, status) =>
    request(`/admin/boxes/${boxId}`, { method: 'PATCH', body: { status }, token }),

  // Botón "Abrir": el ESP32 recoge la orden y abre la caja en modo carga
  openBox: (token, lockerId, boxNumber) =>
    request(`/admin/lockers/${lockerId}/boxes/${boxNumber}/open`, { method: 'POST', token }),

  getAdminOrders: (token) => request('/admin/orders', { token }),
  cancelAdminOrder: (token, orderId) =>
    request(`/admin/orders/${orderId}/cancel`, { method: 'POST', token }),
  getAdminStats: (token) => request('/admin/stats', { token }),
}
