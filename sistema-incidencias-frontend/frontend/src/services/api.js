import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

// ── Incidencias ──────────────────────────────────────────────
export const incidenciasService = {
  getAll: (params) => api.get('/incidencias', { params }),
  getById: (id) => api.get(`/incidencias/${id}`),
  create: (data) => api.post('/incidencias', data),
  update: (id, data) => api.put(`/incidencias/${id}`, data),
  delete: (id) => api.delete(`/incidencias/${id}`),
  updateEstado: (id, estado) => api.patch(`/incidencias/${id}/estado`, { estado }),
}

// ── Usuarios ─────────────────────────────────────────────────
export const usuariosService = {
  getAll: (params) => api.get('/usuarios', { params }),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
}

// ── Categorías ───────────────────────────────────────────────
export const categoriasService = {
  getAll: () => api.get('/categorias'),
  getById: (id) => api.get(`/categorias/${id}`),
  create: (data) => api.post('/categorias', data),
  update: (id, data) => api.put(`/categorias/${id}`, data),
  delete: (id) => api.delete(`/categorias/${id}`),
}

// ── Reportes ─────────────────────────────────────────────────
export const reportesService = {
  getResumen: () => api.get('/reportes/resumen'),
  getByEstado: () => api.get('/reportes/por-estado'),
  getByCategoria: () => api.get('/reportes/por-categoria'),
  getByPrioridad: () => api.get('/reportes/por-prioridad'),
}

export default api
