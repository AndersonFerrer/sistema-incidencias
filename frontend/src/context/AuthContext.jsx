import { createContext, useContext, useState, useEffect } from 'react'
import { login as loginApi, loginDemo as loginDemoApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const stored = localStorage.getItem('usuario')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }, [token])

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('usuario', JSON.stringify(usuario))
    } else {
      localStorage.removeItem('usuario')
    }
  }, [usuario])

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await loginApi(email, password)
      setToken(data.token)
      setUsuario(data.usuario)
      return data.usuario
    } catch (err) {
      const message =
        err.response?.data?.mensaje ||
        err.response?.data?.error ||
        'Credenciales inválidas'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const loginDemo = async (rol) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await loginDemoApi(rol)
      setToken(data.token)
      setUsuario(data.usuario)
      return data.usuario
    } catch (err) {
      const message = err.response?.data?.mensaje || 'Error en login demo'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUsuario(null)
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{ usuario, token, login, loginDemo, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
