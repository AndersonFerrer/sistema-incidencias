import { useState, useEffect } from 'react'
import { incidenciasService, categoriasService, usuariosService } from '../services/api'

const ESTADOS = ['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA']
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

function badgeEstado(e) {
  const m = { ABIERTA: 'badge-open', EN_PROCESO: 'badge-pending', RESUELTA: 'badge-resolved', CERRADA: 'badge-closed' }
  return m[(e || '').toUpperCase()] || 'badge-open'
}
function badgePrioridad(p) {
  const m = { ALTA: 'badge-alta', MEDIA: 'badge-media', BAJA: 'badge-baja', CRITICA: 'badge-critical' }
  return m[(p || '').toUpperCase()] || 'badge-media'
}

const emptyForm = { titulo: '', descripcion: '', estado: 'ABIERTA', prioridad: 'MEDIA', categoriaId: '', usuarioId: '' }

export default function Incidencias() {
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      incidenciasService.getAll(),
      categoriasService.getAll(),
      usuariosService.getAll()
    ]).then(([inc, cat, usr]) => {
      setItems(Array.isArray(inc.data) ? inc.data : (inc.data?.content || []))
      setCategorias(Array.isArray(cat.data) ? cat.data : (cat.data?.content || []))
      setUsuarios(Array.isArray(usr.data) ? usr.data : (usr.data?.content || []))
    }).catch(() => setError('No se pudieron cargar las incidencias'))
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      titulo: item.titulo || item.title || '',
      descripcion: item.descripcion || item.description || '',
      estado: item.estado || 'ABIERTA',
      prioridad: item.prioridad || 'MEDIA',
      categoriaId: item.categoria?.id || item.categoriaId || '',
      usuarioId: item.usuario?.id || item.usuarioId || '',
    })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      if (editing) await incidenciasService.update(editing.id, form)
      else await incidenciasService.create(form)
      setModal(false)
      load()
    } catch { setError('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta incidencia?')) return
    try { await incidenciasService.delete(id); load() }
    catch { setError('Error al eliminar') }
  }

  const filtered = items.filter(i => {
    const txt = (i.titulo || i.title || '').toLowerCase()
    const matchSearch = txt.includes(search.toLowerCase())
    const matchEstado = !filtroEstado || (i.estado || '').toUpperCase() === filtroEstado
    return matchSearch && matchEstado
  })

  return (
    <div>
      <div className="page-header">
        <h2>Incidencias</h2>
        <p>{items.length} incidencias registradas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="search-input-wrap" style={{ minWidth: 240 }}>
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Buscar incidencia..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 140 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>＋ Nueva incidencia</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">⚡</div><p>No se encontraron incidencias</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Categoría</th><th>Usuario</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.map(inc => (
                  <tr key={inc.id}>
                    <td className="font-mono text-muted">#{inc.id}</td>
                    <td style={{ fontWeight: 500, maxWidth: 240 }}>{inc.titulo || inc.title}</td>
                    <td><span className={`badge ${badgeEstado(inc.estado)}`}>{inc.estado || '—'}</span></td>
                    <td><span className={`badge ${badgePrioridad(inc.prioridad)}`}>{inc.prioridad || '—'}</span></td>
                    <td className="text-muted">{inc.categoria?.nombre || inc.categoria || '—'}</td>
                    <td className="text-muted">{inc.usuario?.nombre || inc.usuario?.name || inc.usuario || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(inc)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inc.id)}>Eliminar</button>
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
              <span className="modal-title">{editing ? 'Editar incidencia' : 'Nueva incidencia'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-control" placeholder="Describe el problema..." value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-control" placeholder="Detalles adicionales..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-control" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-control" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={form.categoriaId} onChange={e => setForm({...form, categoriaId: e.target.value})}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre || c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Usuario asignado</label>
                <select className="form-control" value={form.usuarioId} onChange={e => setForm({...form, usuarioId: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre || u.name || u.email}</option>)}
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
