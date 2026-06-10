import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Incidencias from './pages/Incidencias'
import Usuarios from './pages/Usuarios'
import Categorias from './pages/Categorias'
import Reportes from './pages/Reportes'

export default function App() {
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: <Dashboard setPage={setPage} />,
    incidencias: <Incidencias />,
    usuarios: <Usuarios />,
    categorias: <Categorias />,
    reportes: <Reportes />,
  }

  return (
    <div className="layout">
      <Sidebar page={page} setPage={setPage} />
      <main className="main-content">
        {pages[page] || pages.dashboard}
      </main>
    </div>
  )
}
