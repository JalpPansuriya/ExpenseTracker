import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CategoryService } from '../../domain/category'
import ConfirmDialog from '../components/ConfirmDialog'

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧵')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal / Confirm States
  const [archiveId, setArchiveId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setCategories(await CategoryService.listCategories(true)) // include archived
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await CategoryService.createCategory(name, icon)
      setName('')
      setIcon('🧵')
      setSuccess('Category created successfully!')
      await loadCategories()
    } catch (err) {
      try {
        const parsed = JSON.parse(err.message)
        if (Array.isArray(parsed)) {
          setError(parsed.map(e => e.message).join(', '))
        } else {
          setError(err.message)
        }
      } catch (_) {
        setError(err.message || 'Failed to create category')
      }
    }
  }

  const handleArchiveConfirm = async () => {
    if (archiveId) {
      try {
        await CategoryService.archiveCategory(archiveId)
        setArchiveId(null)
        setSuccess('Category archived successfully.')
        await loadCategories()
      } catch (err) {
        setError(err.message)
        setArchiveId(null)
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      try {
        await CategoryService.deleteCategory(deleteId)
        setDeleteId(null)
        setSuccess('Category deleted successfully.')
        await loadCategories()
      } catch (err) {
        setError(err.message)
        setDeleteId(null)
      }
    }
  }

  // Predefined Emojis for embroidery/business
  const emojis = ['🧵', '👗', '✂️', '🔧', '💻', '📦', '⚡', '🖥️', '📢', '🏷️', '🧶', '🎨', '👜', '🎖️', '💼', '🚚', '💡', '💰', '📅']

  const activeCategories = categories.filter(c => !c.archived)
  const archivedCategories = categories.filter(c => c.archived)

  return (
    <div className="app-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/expenses" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600' }}>
          ← Back to Expenses
        </Link>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800', marginTop: '0.5rem' }}>
          Manage Categories 🧵
        </h2>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
        {/* Create Category form */}
        <div className="card">
          <h3 className="card-title">Create Custom Category</h3>
          
          {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>⚠️ {error}</div>}
          {success && <div style={{ color: 'var(--status-paid)', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e2f4f2', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>✓ {success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: '200px', marginBottom: '0' }}>
              <label className="form-label">Category Name</label>
              <input 
                type="text" 
                placeholder="e.g. Ribbons & Laces" 
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: '0' }}>
              <label className="form-label">Icon</label>
              <select 
                className="form-control"
                value={icon}
                onChange={e => setIcon(e.target.value)}
              >
                {emojis.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
              Create
            </button>
          </form>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
        {/* Active categories list */}
        <div className="card">
          <h3 className="card-title">Active Categories ({activeCategories.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeCategories.map(cat => (
              <div 
                key={cat.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <span style={{ fontWeight: '700' }}>
                  {cat.icon} {cat.name} {!cat.isCustom && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Default)</span>}
                </span>
                
                {cat.isCustom && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setArchiveId(cat.id)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Archive
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteId(cat.id)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#fdf2f2', color: 'var(--status-overdue)', border: '1px solid #ffccd2' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Archived categories list */}
        <div className="card">
          <h3 className="card-title">Archived Categories ({archivedCategories.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {archivedCategories.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No archived categories.
              </p>
            ) : (
              archivedCategories.map(cat => (
                <div 
                  key={cat.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#f9f9f9',
                    border: '1px dashed #ccc',
                    opacity: 0.7
                  }}
                >
                  <span style={{ textDecoration: 'line-through', color: '#666' }}>
                    {cat.icon} {cat.name}
                  </span>
                  
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      await CategoryService.updateCategory(cat.id, { archived: false })
                      await loadCategories()
                      setSuccess('Category unarchived successfully.')
                    }}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Activate
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Archive Confirm Dialog */}
      <ConfirmDialog 
        isOpen={archiveId !== null}
        title="Archive Category"
        message="Are you sure you want to archive this category? It will no longer be available for new expenditures or dues, but historical records will still display it."
        confirmText="Archive"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveId(null)}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog 
        isOpen={deleteId !== null}
        title="Delete Category"
        message="Are you sure you want to delete this custom category? If it is currently used by any logged expense or due record, this operation will fail."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
export default CategoriesPage
