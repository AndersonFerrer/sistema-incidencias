import api from './client'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const loginDemo = (rol = 'ADMINISTRADOR') =>
  api.post('/auth/demo', { rol })

export const getMe = () => api.get('/auth/me')
