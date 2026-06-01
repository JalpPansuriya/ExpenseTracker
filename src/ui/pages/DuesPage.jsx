import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DuePaymentService } from '../../dues/duePayment'
import { CategoryService } from '../../domain/category'
import { applyDueFilters, searchDuePayments } from '../../reports/filters'
import { exportDuesToCSV } from '../../reports/export'
import DuePaymentCard from '../components/DuePaymentCard'
import MarkAsPaidSheet from '../components/MarkAsPaidSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import AmountDisplay from '../components/AmountDisplay'

export const DuesPage = () => {
  const navigate = useNavigate()
  
  const [dues, setDues] = useState([])
  const [categories, setCategories] = useState([])
  
  // Tabs: pending | paid | all
  const [activeTab, setActiveTab] = useState('pending')
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedPriorities, setSelectedPriorities] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Interaction Sheets
  const [paidSheetDue, setPaidSheetDue] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setDues(await DuePaymentService.listDuePayments())
    setCategories(await CategoryService.listCategories(true))
  }

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await DuePaymentService.deleteDuePayment(deleteId)
      setDeleteId(null)
      loadData()
    }
  }

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

  const handleCategoryToggle = (id) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter(catId => catId !== id))
    } else {
      setSelectedCategories([...selectedCategories, id])
    }
  }

  const handlePriorityToggle = (priority) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== priority))
    } else {
      setSelectedPriorities([...selectedPriorities, priority])
    }
  }

  const handleStatusToggle = (status) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status))
    } else {
      setSelectedStatuses([...selectedStatuses, status])
    }
  }

  // Pre-filter dues based on tab selection before applying advanced filters
  const getTabFilteredDues = () => {
    if (activeTab === 'pending') {
      return dues.filter(d => !d.paidAt && d.status !== 'paid')
    } else if (activeTab === 'paid') {
      return dues.filter(d => !!d.paidAt || d.status === 'paid')
    }
    return dues // all
  }

  const tabFilteredDues = getTabFilteredDues()

  // Advanced Filters
  const filters = {
    categoryIds: selectedCategories,
    priorities: selectedPriorities,
    statuses: selectedStatuses,
    dateFrom,
    dateTo
  }

  const advancedFilteredDues = applyDueFilters(tabFilteredDues, filters)
  const finalDues = searchDuePayments(advancedFilteredDues, searchQuery)

  // Export
  const handleExport = () => {
    exportDuesToCSV(finalDues, categories)
  }

  // Render pending split sections
  const renderPendingSections = (items) => {
    const overdue = items.filter(d => d.status === 'overdue')
    const dueSoon = items.filter(d => d.status === 'due_soon')
    const upcoming = items.filter(d => d.status === 'upcoming')

    if (items.length === 0) {
      return <EmptyState message="No pending dues found." />
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {overdue.length > 0 && (
          <div>
            <h3 style={{ color: 'var(--status-overdue)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #ffccd2', paddingBottom: '0.4rem' }}>
              🔴 Overdue Dues ({overdue.length})
            </h3>
            <div className="dashboard-grid">
              {overdue.map(due => (
                <DuePaymentCard 
                  key={due.id} 
                  duePayment={due} 
                  categories={categories}
                  onMarkPaid={setPaidSheetDue}
                  onEdit={(id) => navigate(`/dues/${id}/edit`)}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          </div>
        )}

        {dueSoon.length > 0 && (
          <div>
            <h3 style={{ color: 'var(--status-due-soon)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #ffe8cc', paddingBottom: '0.4rem' }}>
              🟡 Due Soon ({dueSoon.length})
            </h3>
            <div className="dashboard-grid">
              {dueSoon.map(due => (
                <DuePaymentCard 
                  key={due.id} 
                  duePayment={due} 
                  categories={categories}
                  onMarkPaid={setPaidSheetDue}
                  onEdit={(id) => navigate(`/dues/${id}/edit`)}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.4rem' }}>
              🔵 Upcoming Dues ({upcoming.length})
            </h3>
            <div className="dashboard-grid">
              {upcoming.map(due => (
                <DuePaymentCard 
                  key={due.id} 
                  duePayment={due} 
                  categories={categories}
                  onMarkPaid={setPaidSheetDue}
                  onEdit={(id) => navigate(`/dues/${id}/edit`)}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Totals calculations
  const totalAmount = finalDues.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800' }}>Due Payments 📅</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={finalDues.length === 0}>
            📤 Export CSV
          </button>
          <Link to="/dues/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            + Log Due Record
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', marginBottom: '1.5rem', gap: '1rem' }}>
        {['pending', 'paid', 'all'].map(tab => (
          <button
            key={tab}
            className={`navbar-link ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontFamily: 'var(--font-family-heading)',
              fontWeight: '700',
              fontSize: '1rem',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '3px solid var(--primary)' : 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Dues
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Search vendor, title, notes..." 
            className="form-control"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters ▴' : 'Filters ▾'}
          </button>
        </div>

        {showFilters && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {/* Date Pickers */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>From Due Date</label>
                  <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>To Due Date</label>
                  <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>

              {/* Priorities */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Priorities</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['low', 'medium', 'high'].map(p => {
                    const isSelected = selectedPriorities.includes(p)
                    return (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => handlePriorityToggle(p)}
                        className={`badge`}
                        style={{ 
                          cursor: 'pointer',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                          backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Statuses (Only in 'all' or 'paid' tab) */}
              {activeTab === 'all' && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {['upcoming', 'due_soon', 'overdue', 'paid'].map(s => {
                      const isSelected = selectedStatuses.includes(s)
                      return (
                        <button 
                          key={s} 
                          type="button" 
                          onClick={() => handleStatusToggle(s)}
                          className={`badge`}
                          style={{ 
                            cursor: 'pointer',
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.75rem',
                            border: isSelected ? '1px solid var(--primary-light)' : '1px solid var(--border-light)',
                            backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            textTransform: 'capitalize'
                          }}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {categories.map(cat => {
                    const isSelected = selectedCategories.includes(cat.id)
                    return (
                      <button 
                        key={cat.id} 
                        type="button" 
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`badge`}
                        style={{ 
                          cursor: 'pointer',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                          backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          textTransform: 'none'
                        }}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Totals */}
      {finalDues.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff9e6', border: '1px solid #ffe8cc' }}>
          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>
            Showing {finalDues.length} dues
          </span>
          <span style={{ fontSize: '1rem', fontWeight: '700' }}>
            Total Filtered Amount: <AmountDisplay amount={totalAmount} className="bold" style={{ fontSize: '1.25rem', color: '#ef6c00' }} />
          </span>
        </div>
      )}

      {/* Main Dues Rendering */}
      {finalDues.length === 0 ? (
        <EmptyState message="No matching due records found.">
          <Link to="/dues/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            Log New Due Record
          </Link>
        </EmptyState>
      ) : activeTab === 'pending' ? (
        renderPendingSections(finalDues)
      ) : (
        <div className="dashboard-grid">
          {finalDues.map(due => (
            <DuePaymentCard 
              key={due.id} 
              duePayment={due} 
              categories={categories}
              onMarkPaid={setPaidSheetDue}
              onEdit={(id) => navigate(`/dues/${id}/edit`)}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Confirm Payment Sheet */}
      <MarkAsPaidSheet 
        isOpen={paidSheetDue !== null}
        duePayment={paidSheetDue}
        categories={categories}
        onConfirm={handleMarkAsPaidConfirm}
        onCancel={() => setPaidSheetDue(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={deleteId !== null}
        title="Delete Due Record"
        message="Are you sure you want to delete this pending due record? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
export default DuesPage
