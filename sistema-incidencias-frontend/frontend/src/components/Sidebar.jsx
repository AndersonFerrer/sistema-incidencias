export default function Sidebar({ page, setPage }) {
  const nav = [
    { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
    { id: 'incidencias', icon: '⚡', label: 'Incidencias' },
    { id: 'usuarios', icon: '◎', label: 'Usuarios' },
    { id: 'categorias', icon: '◈', label: 'Categorías' },
    { id: 'reportes', icon: '▦', label: 'Reportes' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>⬡ Incidencias</h1>
        <span>Sistema de gestión</span>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Backend: localhost:8080</div>
      </div>
    </aside>
  )
}
