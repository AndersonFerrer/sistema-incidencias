import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, AlertCircle, Loader2, Shield } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('admin@sistema.com')
  const [password, setPassword] = useState('admin123')
  const [demoRol, setDemoRol] = useState('ADMINISTRADOR')
  const [modoDemo, setModoDemo] = useState(false)

  const { login, loginDemo, loading, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      // error ya manejado por el context
    }
  }

  const handleDemoLogin = async () => {
    try {
      await loginDemo(demoRol)
      navigate('/dashboard')
    } catch {
      // error ya manejado por el context
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo - Formulario */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo / Título */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Sistema de Incidencias
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Switching tabs: Login normal / Demo */}
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setModoDemo(false)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !modoDemo
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setModoDemo(true)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                modoDemo
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Demo
            </button>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!modoDemo ? (
            /* Formulario de login normal */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="admin@sistema.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          ) : (
            /* Formulario de login demo */
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="rol"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Rol para demo
                </label>
                <select
                  id="rol"
                  value={demoRol}
                  onChange={(e) => setDemoRol(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="AGENTE">Agente</option>
                  <option value="USUARIO">Usuario</option>
                </select>
              </div>

              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {loading ? 'Ingresando...' : 'Entrar en modo Demo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Decorativo */}
      <div className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:bg-gradient-to-br lg:from-indigo-600 lg:to-indigo-800">
        <div className="px-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Gestión Inteligente de Incidencias
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-indigo-100">
            Administra, da seguimiento y resuelve incidencias de tus aplicativos
            en un solo lugar. Optimiza tu flujo de trabajo con herramientas
            diseñadas para equipos de soporte.
          </p>
        </div>
      </div>
    </div>
  )
}
