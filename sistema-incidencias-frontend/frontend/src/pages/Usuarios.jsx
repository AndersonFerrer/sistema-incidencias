import { useState, useEffect } from 'react'
import { usuariosService } from '../services/api'

const ROLES = ['ADMIN', 'TECNICO', 'USUARIO']
const emptyForm = { nombre: '', email: '', password: '', rol: 'USUARIO' }

export default function Usuarios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    usuariosService.getAll()
      .then(r => setItems(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(() => setError('No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (item) => {
    setEditing(item)
    setForm({ nombre: item.nombre || item.name || '', email: item.email || '', password: '', rol: item.rol || 'USUARIO' })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      const data = { ...form }
      if (editing && !data.password) delete data.password
      if (editing) await usuariosService.update(editing.id, data)
      else await usuariosService.create(data)
      setModal(false)
      load()
    } catch { setError('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try { await usuariosService.delete(id); load() }
    catch { setError('Error al eliminar') }
  }

  const rolBadge = (r) => {
    const m = { ADMIN: 'badge-critical', TECNICO: 'badge-open', USUARIO: 'badge-closed' }
    return m[(r || '').toUpperCase()] || 'badge-closed'
  }

  const filtered = items.filter(u => {
    const q = search.toLowerCase()
    return (u.nombre || u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="page-header">
        <h2>Usuarios</h2>
        <p>{items.length} usuarios en el sistema</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="search-input-wrap" style={{ maxWidth: 300 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>＋ Nuevo usuario</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◎</div><p>No se encontraron usuarios</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td className="font-mono text-muted">#{u.id}</td>
                    <td style={{ fontWeight: 500 }}>{u.nombre || u.name}</td>
                    <td className="text-muted">{u.email}</td>
                    <td><span className={`badge ${rolBadge(u.rol)}`}>{u.rol || '—'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Editar usuario' : 'Nuevo usuario'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-control" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Contraseña {editing && '(dejar vacío para no cambiar)'}</label>
                <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-control" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
