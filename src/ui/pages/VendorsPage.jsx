import React, { useState, useEffect } from 'react'
import { VendorService } from '../../domain/vendor'
import AmountDisplay from '../components/AmountDisplay'

export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  // Vendor Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null) // null for create, vendor object for edit
  const [modalForm, setModalForm] = useState({
    name: '',
    type: 'supplier',
    phone: '',
    email: '',
    notes: ''
  })
  const [modalErrors, setModalErrors] = useState({})
  const [modalGeneralError, setModalGeneralError] = useState('')

  // Load vendors and calculate statistics
  const fetchVendors = async () => {
    setLoading(true)
    try {
      const list = await VendorService.listVendors(showArchived)
      const listWithStats = await Promise.all(
        list.map(async (v) => {
          const stats = await VendorService.getVendorStats(v.id)
          return { ...v, stats }
        })
      )
      setVendors(listWithStats)
    } catch (err) {
      console.error('Error fetching vendors with stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [showArchived])

  // Summary counts
  const summary = vendors.reduce(
    (acc, v) => {
      if (v.archived) return acc // do not count archived in summary statistics
      if (v.type === 'supplier') acc.suppliers++
      else if (v.type === 'customer') acc.customers++
      else if (v.type === 'both') acc.both++
      return acc
    },
    { suppliers: 0, customers: 0, both: 0 }
  )

  // Filters
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = typeFilter === 'all' || v.type === typeFilter || v.type === 'both'
    
    return matchesSearch && matchesType
  })

  // Open Modal
  const openCreateModal = () => {
    setEditingVendor(null)
    setModalForm({
      name: '',
      type: 'supplier',
      phone: '',
      email: '',
      notes: ''
    })
    setModalErrors({})
    setModalGeneralError('')
    setShowModal(true)
  }

  const openEditModal = (vendor) => {
    setEditingVendor(vendor)
    setModalForm({
      name: vendor.name,
      type: vendor.type,
      phone: vendor.phone || '',
      email: vendor.email || '',
      notes: vendor.notes || ''
    })
    setModalErrors({})
    setModalGeneralError('')
    setShowModal(true)
  }

  // Handle Save
  const handleSaveVendor = async (e) => {
    e.preventDefault()
    setModalErrors({})
    setModalGeneralError('')

    try {
      if (editingVendor) {
        await VendorService.updateVendor(editingVendor.id, modalForm)
      } else {
        await VendorService.createVendor(modalForm)
      }
      setShowModal(false)
      fetchVendors()
    } catch (err) {
      try {
        const errors = JSON.parse(err.message)
        if (Array.isArray(errors)) {
          const mapped = {}
          errors.forEach((e) => {
            mapped[e.field] = e.message
          })
          setModalErrors(mapped)
        } else {
          setModalGeneralError(err.message)
        }
      } catch {
        setModalGeneralError(err.message || 'Error occurred while saving vendor')
      }
    }
  }

  // Archive
  const handleArchiveVendor = async (id) => {
    try {
      await VendorService.archiveVendor(id)
      fetchVendors()
    } catch (err) {
      alert(err.message || 'Error archiving vendor')
    }
  }

  // Delete
  const handleDeleteVendor = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor? This action is soft-reversible if no constraints prevent it.')) {
      try {
        await VendorService.deleteVendor(id)
        fetchVendors()
      } catch (err) {
        alert(err.message || 'Error deleting vendor')
      }
    }
  }

  return (
    <div className="vendors-page">
      {/* Title & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800' }}>Vendors Control Panel 🤝</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add New Vendor
        </button>
      </div>

      {/* Summary statistics bar */}
      <div className="vendor-summary-grid">
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--primary-light)' }}>
          <h4>Suppliers</h4>
          <div className="value">{summary.suppliers}</div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--status-paid)' }}>
          <h4>Customers</h4>
          <div className="value">{summary.customers}</div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <h4>Dual-Role (Both)</h4>
          <div className="value">{summary.both}</div>
        </div>
      </div>

      {/* Search & Filters Controls Bar */}
      <div className="vendor-controls-bar">
        <div className="vendor-search-filter">
          <input
            type="text"
            className="form-control vendor-search-input"
            placeholder="Search vendor name or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="vendor-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="supplier">Suppliers Only</option>
            <option value="customer">Customers Only</option>
            <option value="both">Dual-Role Only</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          Show Archived Vendors
        </label>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="text-center" style={{ padding: '3rem 0' }}>Loading vendors...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <span style={{ fontSize: '3rem' }}>🔍</span>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>No vendors found matching criteria.</p>
        </div>
      ) : (
        <div className="vendor-cards-grid">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="card vendor-card" style={{ opacity: vendor.archived ? 0.6 : 1 }}>
              <div>
                <div className="vendor-card-header">
                  <div className="vendor-card-name-wrapper">
                    <span className="vendor-card-name">{vendor.name}</span>
                    {vendor.archived && <span className="badge" style={{ backgroundColor: '#eeeeee', color: '#666666', fontSize: '0.65rem' }}>Archived</span>}
                  </div>
                  <span className={`vendor-type-badge ${vendor.type}`}>{vendor.type}</span>
                </div>

                <div className="vendor-card-info">
                  {vendor.phone && (
                    <div className="vendor-card-info-item">
                      <span>📞</span> {vendor.phone}
                    </div>
                  )}
                  {vendor.email && (
                    <div className="vendor-card-info-item">
                      <span>✉️</span> {vendor.email}
                    </div>
                  )}
                  {vendor.notes && (
                    <div className="vendor-card-info-item" style={{ fontStyle: 'italic', display: 'block' }}>
                      <span>📝</span> "{vendor.notes}"
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="vendor-card-stats">
                  {(vendor.type === 'supplier' || vendor.type === 'both') && (
                    <div className="vendor-card-stat-item">
                      <span className="vendor-card-stat-label">Total Outflow</span>
                      <span className="vendor-card-stat-value" style={{ color: 'var(--color-expense)' }}>
                        <AmountDisplay amount={vendor.stats?.totalSpent || 0} />
                      </span>
                    </div>
                  )}
                  {(vendor.type === 'customer' || vendor.type === 'both') && (
                    <div className="vendor-card-stat-item">
                      <span className="vendor-card-stat-label">Total Inflow</span>
                      <span className="vendor-card-stat-value" style={{ color: 'var(--color-income)' }}>
                        <AmountDisplay amount={vendor.stats?.totalReceived || 0} />
                      </span>
                    </div>
                  )}
                  <div className="vendor-card-stat-item" style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px solid #eeeeee', paddingTop: '4px' }}>
                    <span className="vendor-card-stat-label">Transactions</span>
                    <span className="vendor-card-stat-value">{vendor.stats?.transactionCount || 0} bills</span>
                  </div>
                </div>

                <div className="vendor-card-footer">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(vendor)}>
                    Edit
                  </button>
                  {!vendor.archived && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleArchiveVendor(vendor.id)}>
                      Archive
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVendor(vendor.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add/Edit Dialog Modal Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-family-heading)' }}>
              {editingVendor ? 'Modify Vendor Profile 🤝' : 'Create Vendor Profile 🤝'}
            </h3>

            {modalGeneralError && (
              <div className="form-error" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>
                ⚠️ {modalGeneralError}
              </div>
            )}

            <form onSubmit={handleSaveVendor}>
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Yarn Bazaar Co."
                  value={modalForm.name}
                  onChange={(e) => setModalForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                {modalErrors.name && <div className="form-error">{modalErrors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Vendor Role / Type *</label>
                <div className="type-toggle-group" style={{ marginBottom: '0.25rem' }}>
                  {['supplier', 'customer', 'both'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`type-toggle-btn ${modalForm.type === t ? 'active' : ''}`}
                      onClick={() => setModalForm((p) => ({ ...p, type: t }))}
                      style={{ padding: '10px' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {modalErrors.type && <div className="form-error">{modalErrors.type}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Contact (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +91 98765 43210"
                  value={modalForm.phone}
                  onChange={(e) => setModalForm((p) => ({ ...p, phone: e.target.value }))}
                />
                {modalErrors.phone && <div className="form-error">{modalErrors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. sales@yarnbazaar.com"
                  value={modalForm.email}
                  onChange={(e) => setModalForm((p) => ({ ...p, email: e.target.value }))}
                />
                {modalErrors.email && <div className="form-error">{modalErrors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Private Notes (Optional)</label>
                <textarea
                  rows="3"
                  className="form-control"
                  placeholder="e.g. Standard billing terms, bulk discount agreements..."
                  value={modalForm.notes}
                  onChange={(e) => setModalForm((p) => ({ ...p, notes: e.target.value }))}
                />
                {modalErrors.notes && <div className="form-error">{modalErrors.notes}</div>}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editingVendor ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
