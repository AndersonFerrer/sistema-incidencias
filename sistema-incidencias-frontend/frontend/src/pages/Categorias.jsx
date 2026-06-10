import { useState, useEffect } from 'react'
import { categoriasService } from '../services/api'

const emptyForm = { nombre: '', descripcion: '' }

export default function Categorias() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    categoriasService.getAll()
      .then(r => setItems(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(() => setError('No se pudieron cargar las categorías'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (item) => {
    setEditing(item)
    setForm({ nombre: item.nombre || item.name || '', descripcion: item.descripcion || item.description || '' })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      if (editing) await categoriasService.update(editing.id, form)
      else await categoriasService.create(form)
      setModal(false)
      load()
    } catch { setError('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    try { await categoriasService.delete(id); load() }
    catch { setError('Error al eliminar — puede tener incidencias asociadas') }
  }

  // Colores fijos para las tarjetas de categorías
  const colors = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#a78bfa', '#34d399']

  return (
    <div>
      <div className="page-header">
        <h2>Categorías</h2>
        <p>{items.length} categorías definidas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={openCreate}>＋ Nueva categoría</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state card"><div className="empty-icon">◈</div><p>No hay categorías. Crea la primera.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map((cat, i) => (
            <div key={cat.id} className="card" style={{ borderTop: `3px solid ${colors[i % colors.length]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.nombre || cat.name}</div>
                  <div className="font-mono text-muted" style={{ marginTop: 2 }}>#{cat.id}</div>
                </div>
                <span style={{ color: colors[i % colors.length], fontSize: 20 }}>◈</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, minHeight: 36, marginBottom: 16 }}>
                {cat.descripcion || cat.description || 'Sin descripción'}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(cat)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-control" placeholder="Ej: Hardware, Software, Red..." value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-control" placeholder="Descripción de la categoría..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
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
