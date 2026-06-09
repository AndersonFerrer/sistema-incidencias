import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  const { usuario, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500">
              Bienvenido, {usuario?.nombre || 'Usuario'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {usuario?.rol || 'Sin rol'}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">
            Sistema de Gestión de Incidencias
          </h2>
          <p className="mt-2 text-gray-500">
            Las demás vistas se implementarán progresivamente.
          </p>
        </div>
      </main>
    </div>
  )
}
