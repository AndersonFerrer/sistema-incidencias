import { useState, useEffect } from 'react'
import { incidenciasService } from '../services/api'

function BarChart({ data, colorKey }) {
  const max = Math.max(...data.map(d => d.valor), 1)
  const colors = { ABIERTA: 'var(--accent)', EN_PROCESO: 'var(--warning)', RESUELTA: 'var(--success)', CERRADA: 'var(--text-dim)', CRITICA: 'var(--danger)', ALTA: '#f7964f', MEDIA: 'var(--warning)', BAJA: 'var(--success)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{d.valor}</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(d.valor / max) * 100}%`,
              background: colors[d.label.toUpperCase()] || 'var(--accent)',
              borderRadius: 4,
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reportes() {
  const [incidencias, setIncidencias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    incidenciasService.getAll()
      .then(r => setIncidencias(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .finally(() => setLoading(false))
  }, [])

  // Agrupar por estado
  const porEstado = ['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA'].map(e => ({
    label: e,
    valor: incidencias.filter(i => (i.estado || '').toUpperCase() === e).length
  })).filter(d => d.valor > 0)

  // Agrupar por prioridad
  const porPrioridad = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(p => ({
    label: p,
    valor: incidencias.filter(i => (i.prioridad || '').toUpperCase() === p).length
  })).filter(d => d.valor > 0)

  // Agrupar por categoría
  const catMap = {}
  incidencias.forEach(i => {
    const cat = i.categoria?.nombre || i.categoria || 'Sin categoría'
    catMap[cat] = (catMap[cat] || 0) + 1
  })
  const porCategoria = Object.entries(catMap).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor)

  const total = incidencias.length
  const resueltas = incidencias.filter(i => ['RESUELTA', 'CERRADA'].includes((i.estado || '').toUpperCase())).length
  const tasaResolucion = total ? Math.round((resueltas / total) * 100) : 0

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h2>Reportes</h2>
        <p>Análisis y estadísticas del sistema</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total incidencias</div>
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resueltas</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{resueltas}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tasa de resolución</div>
          <div className="stat-value" style={{ color: tasaResolucion >= 70 ? 'var(--success)' : 'var(--warning)' }}>{tasaResolucion}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Por estado</span></div>
          {porEstado.length > 0 ? <BarChart data={porEstado} /> : <div className="empty-state"><p>Sin datos</p></div>}
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Por prioridad</span></div>
          {porPrioridad.length > 0 ? <BarChart data={porPrioridad} /> : <div className="empty-state"><p>Sin datos</p></div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Por categoría</span></div>
        {porCategoria.length > 0 ? (
          <BarChart data={porCategoria} />
        ) : (
          <div className="empty-state"><div className="empty-icon">▦</div><p>No hay datos de categorías</p></div>
        )}
      </div>
    </div>
  )
}
