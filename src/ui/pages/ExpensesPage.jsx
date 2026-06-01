import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExpenditureService } from '../../domain/expenditure'
import { CategoryService } from '../../domain/category'
import { applyFilters, searchExpenditures } from '../../reports/filters'
import { exportToCSV } from '../../reports/export'
import AmountDisplay from '../components/AmountDisplay'
import CategoryPill from '../components/CategoryPill'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'

export const ExpensesPage = () => {
  const navigate = useNavigate()
  const [expenditures, setExpenditures] = useState([])
  const [categories, setCategories] = useState([])
  
  // Tab State: 'all' | 'income' | 'expense'
  const [activeTab, setActiveTab] = useState('all')

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedMethods, setSelectedMethods] = useState([])
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Dialog State
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setExpenditures(await ExpenditureService.listExpenditures())
    setCategories(await CategoryService.listCategories(true))
  }

  // Predefined Date Presets
  const applyPreset = (preset) => {
    const today = new Date()
    const todayStr = today.toLocaleDateString('en-CA')
    
    if (preset === 'today') {
      setDateFrom(todayStr)
      setDateTo(todayStr)
    } else if (preset === 'week') {
      const first = today.getDate() - today.getDay()
      const firstday = new Date(today.setDate(first)).toLocaleDateString('en-CA')
      setDateFrom(firstday)
      setDateTo(todayStr)
    } else if (preset === 'month') {
      const firstday = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA')
      setDateFrom(firstday)
      setDateTo(todayStr)
    } else if (preset === 'last_month') {
      const firstday = new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA')
      const lastday = new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA')
      setDateFrom(firstday)
      setDateTo(lastday)
    } else if (preset === 'year') {
      const firstday = new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA')
      setDateFrom(firstday)
      setDateTo(todayStr)
    } else if (preset === 'clear') {
      setDateFrom('')
      setDateTo('')
    }
  }

  const handleCategoryToggle = (id) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter(catId => catId !== id))
    } else {
      setSelectedCategories([...selectedCategories, id])
    }
  }

  const handleMethodToggle = (method) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter(m => m !== method))
    } else {
      setSelectedMethods([...selectedMethods, method])
    }
  }

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await ExpenditureService.deleteExpenditure(deleteId)
      setDeleteId(null)
      loadData()
    }
  }

  // Compute counts based on all active filters except type
  const baseFilters = {
    dateFrom,
    dateTo,
    categoryIds: selectedCategories,
    paymentMethods: selectedMethods,
    amountMin,
    amountMax
  }
  const baseFiltered = applyFilters(expenditures, baseFilters)
  const allCount = baseFiltered.length
  const incomeCount = baseFiltered.filter(e => e.type === 'income').length
  const expenseCount = baseFiltered.filter(e => e.type === 'expense' || !e.type).length

  // Filter & Search processing
  const filters = {
    type: activeTab,
    dateFrom,
    dateTo,
    categoryIds: selectedCategories,
    paymentMethods: selectedMethods,
    amountMin,
    amountMax
  }

  const filteredExpenses = applyFilters(expenditures, filters)
  const displayedExpenses = searchExpenditures(filteredExpenses, searchQuery)

  const handleExport = () => {
    exportToCSV(displayedExpenses, categories)
  }

  const totalAmount = displayedExpenses.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800' }}>Transactions & Hisab 💸</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={displayedExpenses.length === 0}>
            📤 Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            🖨️ Print Report
          </button>
          <Link to="/expenses/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            + Log Transaction
          </Link>
        </div>
      </div>

      {/* 3-way segment tab */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.6rem',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'all' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          📄 All
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px', backgroundColor: activeTab === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--border-light)', color: activeTab === 'all' ? '#ffffff' : 'var(--text-primary)' }}>
            {allCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.6rem',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'income' ? 'var(--color-income)' : 'transparent',
            color: activeTab === 'income' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          💰 Incoming
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px', backgroundColor: activeTab === 'income' ? 'rgba(255,255,255,0.2)' : 'var(--color-income-bg)', color: activeTab === 'income' ? '#ffffff' : 'var(--color-income)' }}>
            {incomeCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.6rem',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'expense' ? 'var(--color-expense)' : 'transparent',
            color: activeTab === 'expense' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          💸 Outgoing
          <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px', backgroundColor: activeTab === 'expense' ? 'rgba(255,255,255,0.2)' : 'var(--color-expense-bg)', color: activeTab === 'expense' ? '#ffffff' : 'var(--color-expense)' }}>
            {expenseCount}
          </span>
        </button>
      </div>

      {/* Search and Toggle Filter Panel */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder={activeTab === 'income' ? "Search customer name, notes, receipt ID..." : "Search vendor, notes, receipt ID..."}
            className="form-control"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
            style={{ minWidth: '100px' }}
          >
            {showFilters ? 'Hide Filters ▴' : 'Filters ▾'}
          </button>
        </div>

        {showFilters && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            {/* Presets */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Presets:</span>
              {['today', 'week', 'month', 'last_month', 'year', 'clear'].map(p => (
                <button 
                  key={p} 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => applyPreset(p)}
                  style={{ textTransform: 'capitalize', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {/* Date Inputs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
                  <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
                  <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>

              {/* Amount Ranges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Min Amount (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={amountMin} onChange={e => setAmountMin(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Max Amount (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={amountMax} onChange={e => setAmountMax(e.target.value)} />
                </div>
              </div>

              {/* Category selector */}
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

              {/* Payment Methods */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Method</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['cash', 'upi', 'bank_transfer', 'card', 'other'].map(method => {
                    const isSelected = selectedMethods.includes(method)
                    return (
                      <button 
                        key={method} 
                        type="button" 
                        onClick={() => handleMethodToggle(method)}
                        className={`badge`}
                        style={{ 
                          cursor: 'pointer',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          border: isSelected ? '1px solid var(--primary-light)' : '1px solid var(--border-light)',
                          backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          textTransform: 'none'
                        }}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print-only Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Embroidery Business Expenditure Tracker</h1>
        <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#555' }}>
          Transaction Report ({dateFrom || 'Start'} to {dateTo || 'Today'})
        </h3>
      </div>

      {/* Summary Row */}
      {displayedExpenses.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Showing {displayedExpenses.length} transactions
          </span>
          <span style={{ fontSize: '1rem', fontWeight: '700' }}>
            Total Filtered Amount: <AmountDisplay amount={totalAmount} className="bold" style={{ fontSize: '1.25rem', color: 'var(--primary)' }} />
          </span>
        </div>
      )}

      {/* Results View */}
      {displayedExpenses.length === 0 ? (
        <EmptyState message="No matching transaction records found.">
          <Link to="/expenses/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            Log A New Transaction
          </Link>
        </EmptyState>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container" style={{ display: 'block' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{activeTab === 'income' ? 'Customer' : 'Vendor / Customer'}</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Receipt ID</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedExpenses.map(exp => {
                  const cat = categories.find(c => c.id === exp.categoryId)
                  const isIncome = exp.type === 'income'
                  return (
                    <tr key={exp.id} style={{ borderLeft: `3px solid ${isIncome ? 'var(--color-income)' : 'var(--color-expense)'}` }}>
                      <td style={{ fontWeight: '600' }}>{exp.date}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="badge" style={{
                            backgroundColor: isIncome ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                            color: isIncome ? 'var(--color-income)' : 'var(--color-expense)',
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.4rem',
                            marginRight: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '800'
                          }}>
                            {isIncome ? 'IN' : 'OUT'}
                          </span>
                          <span style={{ fontWeight: '700' }}>{exp.vendor}</span>
                        </div>
                        {exp.notes && <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem', paddingLeft: '2.5rem' }}>{exp.notes}</div>}
                      </td>
                      <td>
                        <CategoryPill category={cat} />
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{exp.paymentMethod.replace('_', ' ')}</td>
                      <td><code>{exp.receiptId || '-'}</code></td>
                      <td>
                        <AmountDisplay 
                          amount={exp.amount} 
                          className="bold" 
                          style={{ color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/expenses/${exp.id}/edit`)}>
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ backgroundColor: '#fdf2f2', color: 'var(--status-overdue)', border: '1px solid #ffccd2' }} 
                            onClick={() => setDeleteId(exp.id)}
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
        </>
      )}

      <ConfirmDialog 
        isOpen={deleteId !== null}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
export default ExpensesPage
