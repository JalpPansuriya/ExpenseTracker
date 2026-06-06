import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { VendorService } from '../../domain/vendor'
import { ExpenditureService } from '../../domain/expenditure'
import { DuePaymentService } from '../../dues/duePayment'
import { CategoryService } from '../../domain/category'
import AmountDisplay from '../components/AmountDisplay'
import DuePaymentCard from '../components/DuePaymentCard'
import MarkAsPaidSheet from '../components/MarkAsPaidSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import CategoryPill from '../components/CategoryPill'
import EmptyState from '../components/EmptyState'

export default function VendorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [vendor, setVendor] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [dues, setDues] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Tab State: 'transactions' | 'dues' | 'profile'
  const [activeTab, setActiveTab] = useState('transactions')

  // Edit Vendor Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'supplier',
    phone: '',
    email: '',
    notes: ''
  })
  const [editErrors, setEditErrors] = useState({})
  const [editGeneralError, setEditGeneralError] = useState('')

  // Dues Mark-as-paid / Delete state
  const [paidSheetDue, setPaidSheetDue] = useState(null)
  const [deleteDueId, setDeleteDueId] = useState(null)

  // Transaction delete state
  const [deleteTxId, setDeleteTxId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const v = await VendorService.getVendor(id)
      if (!v) {
        setVendor(null)
        setLoading(false)
        return
      }
      setVendor(v)

      // Get transactions & dues
      const allTx = await ExpenditureService.listExpenditures()
      const filteredTx = allTx.filter(t => t.vendorId === id)
      setTransactions(filteredTx)

      const allDues = await DuePaymentService.listDuePayments()
      const filteredDues = allDues.filter(d => d.vendorId === id)
      setDues(filteredDues)

      const cats = await CategoryService.listCategories(true)
      setCategories(cats)

      // Initialize edit form
      setEditForm({
        name: v.name,
        type: v.type,
        phone: v.phone || '',
        email: v.email || '',
        notes: v.notes || ''
      })
    } catch (err) {
      console.error('Error loading vendor details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // Vendor Action: Archive
  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this vendor?')) {
      try {
        await VendorService.archiveVendor(id)
        loadData()
      } catch (err) {
        alert(err.message || 'Error archiving vendor')
      }
    }
  }

  // Vendor Action: Delete
  const handleDeleteVendor = async () => {
    if (window.confirm('Are you sure you want to delete this vendor? This action is soft-reversible if no constraints prevent it.')) {
      try {
        await VendorService.deleteVendor(id)
        navigate('/vendors')
      } catch (err) {
        alert(err.message || 'Error deleting vendor: check if vendor has active transactions/dues.')
      }
    }
  }

  // Vendor Action: Save Edit
  const handleSaveVendor = async (e) => {
    e.preventDefault()
    setEditErrors({})
    setEditGeneralError('')

    try {
      await VendorService.updateVendor(id, editForm)
      setShowEditModal(false)
      loadData()
    } catch (err) {
      try {
        const errors = JSON.parse(err.message)
        if (Array.isArray(errors)) {
          const mapped = {}
          errors.forEach((e) => {
            mapped[e.field] = e.message
          })
          setEditErrors(mapped)
        } else {
          setEditGeneralError(err.message)
        }
      } catch {
        setEditGeneralError(err.message || 'Error occurred while saving vendor')
      }
    }
  }

  // Due Record Actions
  const handleMarkAsPaidConfirm = async (overrides) => {
    if (paidSheetDue) {
      try {
        await DuePaymentService.markAsPaid(paidSheetDue.id, overrides)
        setPaidSheetDue(null)
        loadData()
      } catch (err) {
        alert('Failed to mark as paid: ' + err.message)
      }
    }
  }

  const handleDeleteDueConfirm = async () => {
    if (deleteDueId) {
      try {
        await DuePaymentService.deleteDuePayment(deleteDueId)
        setDeleteDueId(null)
        loadData()
      } catch (err) {
        alert('Failed to delete due: ' + err.message)
      }
    }
  }

  // Transaction delete action
  const handleDeleteTxConfirm = async () => {
    if (deleteTxId) {
      try {
        await ExpenditureService.deleteExpenditure(deleteTxId)
        setDeleteTxId(null)
        loadData()
      } catch (err) {
        alert('Failed to delete transaction: ' + err.message)
      }
    }
  }

  if (loading) {
    return (
      <div className="app-container text-center" style={{ padding: '3rem 0' }}>
        <h3>Loading vendor details...</h3>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="app-container text-center" style={{ padding: '3rem 0' }}>
        <h2>Vendor Not Found 🤝</h2>
        <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>
          The vendor record you are looking for does not exist or has been permanently deleted.
        </p>
        <Link to="/vendors" className="btn btn-primary">
          Back to Vendors list
        </Link>
      </div>
    )
  }

  // Stats Calculations
  // Total Spent (Expense)
  const totalSpent = transactions
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((sum, t) => sum + t.amount, 0)

  // Total Received (Income)
  const totalReceived = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  // Net Balance
  const netFlow = totalReceived - totalSpent

  // Pending Dues (Payable)
  const pendingPayable = dues
    .filter(d => !d.paidAt && d.type === 'payable')
    .reduce((sum, d) => sum + d.amount, 0)

  // Pending Dues (Receivable)
  const pendingReceivable = dues
    .filter(d => !d.paidAt && d.type === 'receivable')
    .reduce((sum, d) => sum + d.amount, 0)

  // Get initials for Avatar
  const getInitials = (name) => {
    if (!name) return 'V'
    const parts = name.split(' ')
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="app-container">
      {/* Back Button & Top Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/vendors" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ← Back to Vendors list
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>
            ⚙️ Edit Profile
          </button>
          {!vendor.archived && (
            <button className="btn btn-secondary btn-sm" onClick={handleArchive}>
              📦 Archive
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleDeleteVendor}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Vendor Profile Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          fontWeight: '800',
          fontFamily: 'var(--font-family-heading)'
        }}>
          {getInitials(vendor.name)}
        </div>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800', margin: 0 }}>{vendor.name}</h2>
            <span className={`vendor-type-badge ${vendor.type}`} style={{ display: 'inline-block' }}>{vendor.type}</span>
            {vendor.archived && <span className="badge" style={{ backgroundColor: '#eeeeee', color: '#666666' }}>Archived</span>}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {vendor.phone && <span>📞 {vendor.phone}</span>}
            {vendor.email && <span>✉️ {vendor.email}</span>}
          </div>
        </div>
      </div>

      {/* Financial Statistics Summary Grid */}
      <div className="vendor-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--color-income)' }}>
          <h4>Total Received (Inflow)</h4>
          <div className="value" style={{ color: 'var(--color-income)' }}>
            <AmountDisplay amount={totalReceived} />
          </div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--color-expense)' }}>
          <h4>Total Paid (Outflow)</h4>
          <div className="value" style={{ color: 'var(--color-expense)' }}>
            <AmountDisplay amount={totalSpent} />
          </div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: `4px solid ${netFlow >= 0 ? 'var(--color-profit-positive)' : 'var(--color-profit-negative)'}` }}>
          <h4>Net Cash Flow</h4>
          <div className="value" style={{ color: netFlow >= 0 ? 'var(--color-profit-positive)' : 'var(--color-profit-negative)' }}>
            <AmountDisplay amount={netFlow} />
          </div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--status-overdue)' }}>
          <h4>Pending Payable Dues</h4>
          <div className="value" style={{ color: 'var(--color-expense)' }}>
            <AmountDisplay amount={pendingPayable} />
          </div>
        </div>
        <div className="vendor-summary-card" style={{ borderLeft: '4px solid var(--color-income-bg)' }}>
          <h4>Pending Receivable Dues</h4>
          <div className="value" style={{ color: 'var(--color-income)' }}>
            <AmountDisplay amount={pendingReceivable} />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'transactions', label: `Transactions (${transactions.length})` },
          { key: 'dues', label: `Due Payments (${dues.length})` },
          { key: 'profile', label: 'Private Notes & Info' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontFamily: 'var(--font-family-heading)',
              fontWeight: '700',
              fontSize: '1rem',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'transactions' && (
        <div>
          {transactions.length === 0 ? (
            <EmptyState message="No transactions logged for this vendor." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th>Receipt ID</th>
                    <th>Notes</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const cat = categories.find(c => c.id === tx.categoryId)
                    const isIncome = tx.type === 'income'
                    return (
                      <tr key={tx.id} style={{ borderLeft: `3px solid ${isIncome ? 'var(--color-income)' : 'var(--color-expense)'}` }}>
                        <td style={{ fontWeight: '600' }}>{tx.date}</td>
                        <td>
                          <span className="badge" style={{
                            backgroundColor: isIncome ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                            color: isIncome ? 'var(--color-income)' : 'var(--color-expense)',
                            fontSize: '0.65rem',
                            fontWeight: '800'
                          }}>
                            {isIncome ? 'INFLOW' : 'OUTFLOW'}
                          </span>
                        </td>
                        <td>
                          <CategoryPill category={cat} />
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{tx.paymentMethod.replace('_', ' ')}</td>
                        <td><code>{tx.receiptId || '-'}</code></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.notes || '-'}
                        </td>
                        <td>
                          <AmountDisplay 
                            amount={tx.amount} 
                            className="bold" 
                            style={{ color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/expenses/${tx.id}/edit`)}>
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ backgroundColor: '#fdf2f2', color: 'var(--status-overdue)', border: '1px solid #ffccd2' }} 
                              onClick={() => setDeleteTxId(tx.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dues' && (
        <div>
          {dues.length === 0 ? (
            <EmptyState message="No due payments scheduled for this vendor." />
          ) : (
            <div className="dashboard-grid">
              {dues.map(due => (
                <DuePaymentCard
                  key={due.id}
                  duePayment={due}
                  categories={categories}
                  onMarkPaid={setPaidSheetDue}
                  onEdit={(id) => navigate(`/dues/${id}/edit`)}
                  onDelete={setDeleteDueId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: '600px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-family-heading)', fontWeight: '700' }}>Vendor Information 🤝</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', lineHeight: '1.6' }}>
            <div>
              <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Vendor Name</strong>
              <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{vendor.name}</span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Role/Type</strong>
              <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{vendor.type}</span>
            </div>
            {vendor.phone && (
              <div>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Phone Contact</strong>
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div>
                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Email Address</strong>
                <span>{vendor.email}</span>
              </div>
            )}
            <div>
              <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Private Notes</strong>
              <p style={{
                margin: '0.25rem 0',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-light)',
                fontStyle: vendor.notes ? 'normal' : 'italic',
                color: vendor.notes ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}>
                {vendor.notes || 'No private notes saved for this vendor.'}
              </p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Registration Date</strong>
              <span>{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vendor Dialog Modal Overlay */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-family-heading)' }}>
              Modify Vendor Profile 🤝
            </h3>

            {editGeneralError && (
              <div className="form-error" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>
                ⚠️ {editGeneralError}
              </div>
            )}

            <form onSubmit={handleSaveVendor}>
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                {editErrors.name && <div className="form-error">{editErrors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Vendor Role / Type *</label>
                <div className="type-toggle-group" style={{ marginBottom: '0.25rem' }}>
                  {['supplier', 'customer', 'both'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`type-toggle-btn ${editForm.type === t ? 'active' : ''}`}
                      onClick={() => setEditForm((p) => ({ ...p, type: t }))}
                      style={{ padding: '10px' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {editErrors.type && <div className="form-error">{editErrors.type}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Contact (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                />
                {editErrors.phone && <div className="form-error">{editErrors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
                {editErrors.email && <div className="form-error">{editErrors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Private Notes (Optional)</label>
                <textarea
                  rows="3"
                  className="form-control"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                />
                {editErrors.notes && <div className="form-error">{editErrors.notes}</div>}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Due Sheet & dialogs */}
      <MarkAsPaidSheet 
        isOpen={paidSheetDue !== null}
        duePayment={paidSheetDue}
        categories={categories}
        onConfirm={handleMarkAsPaidConfirm}
        onCancel={() => setPaidSheetDue(null)}
      />

      <ConfirmDialog 
        isOpen={deleteDueId !== null}
        title="Delete Due Record"
        message="Are you sure you want to delete this pending due record? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteDueConfirm}
        onCancel={() => setDeleteDueId(null)}
      />

      <ConfirmDialog 
        isOpen={deleteTxId !== null}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteTxConfirm}
        onCancel={() => setDeleteTxId(null)}
      />
    </div>
  )
}
