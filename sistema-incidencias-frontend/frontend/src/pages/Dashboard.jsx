import { useState, useEffect } from 'react'
import { incidenciasService, usuariosService, categoriasService } from '../services/api'

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState({ incidencias: 0, usuarios: 0, categorias: 0, abiertas: 0 })
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      incidenciasService.getAll(),
      usuariosService.getAll(),
      categoriasService.getAll(),
    ]).then(([inc, usr, cat]) => {
      const incData = Array.isArray(inc.data) ? inc.data : (inc.data?.content || [])
      const usrData = Array.isArray(usr.data) ? usr.data : (usr.data?.content || [])
      const catData = Array.isArray(cat.data) ? cat.data : (cat.data?.content || [])
      const abiertas = incData.filter(i =>
        ['ABIERTA', 'EN_PROCESO', 'PENDIENTE', 'OPEN', 'PENDING'].includes((i.estado || '').toUpperCase())
      ).length
      setStats({ incidencias: incData.length, usuarios: usrData.length, categorias: catData.length, abiertas })
      setRecientes(incData.slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const prioridadBadge = (p) => {
    const m = { ALTA: 'badge-alta', MEDIA: 'badge-media', BAJA: 'badge-baja', CRITICA: 'badge-critical' }
    return m[(p || '').toUpperCase()] || 'badge-media'
  }

  if (loading) return (
    <div className="loading"><div className="spinner" /><p>Cargando datos...</p></div>
  )

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Resumen general del sistema de incidencias</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total incidencias</div>
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{stats.incidencias}</div>
          <div className="stat-sub">Registradas en el sistema</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incidencias abiertas</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.abiertas}</div>
          <div className="stat-sub">Pendientes de resolución</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Usuarios</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.usuarios}</div>
          <div className="stat-sub">Usuarios registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categorías</div>
          <div className="stat-value" style={{ color: 'var(--text)' }}>{stats.categorias}</div>
          <div className="stat-sub">Tipos de incidencias</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Incidencias recientes</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('incidencias')}>Ver todas →</button>
        </div>
        {recientes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <p>No hay incidencias registradas</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Categoría</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map(inc => (
                  <tr key={inc.id}>
                    <td className="font-mono text-muted">#{inc.id}</td>
                    <td style={{ fontWeight: 500 }}>{inc.titulo || inc.title || '—'}</td>
                    <td><span className={`badge badge-${(inc.estado || 'open').toLowerCase()}`}>{inc.estado || '—'}</span></td>
                    <td><span className={`badge ${prioridadBadge(inc.prioridad)}`}>{inc.prioridad || '—'}</span></td>
                    <td className="text-muted">{inc.categoria?.nombre || inc.categoria || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
