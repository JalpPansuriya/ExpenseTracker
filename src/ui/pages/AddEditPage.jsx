import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ExpenditureService } from '../../domain/expenditure'
import { CategoryService } from '../../domain/category'
import VendorDropdown from '../components/VendorDropdown'

export const AddEditPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [type, setType] = useState('expense')
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [receiptId, setReceiptId] = useState('')

  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await CategoryService.listCategories()
      setCategories(cats.filter(c => !c.archived))
    }
    loadCategories()
  }, [])

  // Load expenditure details if edit mode
  useEffect(() => {
    const loadExpenditure = async () => {
      if (isEdit) {
        const exp = await ExpenditureService.getExpenditure(id)
        if (exp) {
          setType(exp.type || 'expense')
          setDate(exp.date)
          setAmount((exp.amount / 100).toString()) // convert paise to float for form
          setCategoryId(exp.categoryId)
          setVendorId(exp.vendorId || '')
          setPaymentMethod(exp.paymentMethod)
          setNotes(exp.notes || '')
          setReceiptId(exp.receiptId || '')
        } else {
          setFormError('Expenditure not found')
        }
      }
    }
    loadExpenditure()
  }, [id, isEdit])

  // Filter categories depending on selected transaction type (Step 4)
  const visibleCategories = type === 'income'
    ? categories.filter(c => c.id.startsWith('cat-income'))
    : categories.filter(c => !c.id.startsWith('cat-income'))

  // Sync categoryId if type toggles and current category is no longer valid in the newly visible list
  useEffect(() => {
    if (visibleCategories.length > 0) {
      if (!visibleCategories.some(c => c.id === categoryId)) {
        setCategoryId(visibleCategories[0].id)
      }
    }
  }, [type, categories, visibleCategories, categoryId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setFormError('')

    const payload = {
      type,
      date,
      amount: amount ? Number(amount) : '', // float format
      categoryId,
      vendorId,
      paymentMethod,
      notes: notes || null,
      receiptId: receiptId || null
    }

    try {
      if (isEdit) {
        await ExpenditureService.updateExpenditure(id, payload)
      } else {
        await ExpenditureService.createExpenditure(payload)
      }
      navigate('/expenses')
    } catch (err) {
      try {
        const parsedErrors = JSON.parse(err.message)
        if (Array.isArray(parsedErrors)) {
          const newErrors = {}
          parsedErrors.forEach(e => {
            newErrors[e.field] = e.message
          })
          setErrors(newErrors)
        } else {
          setFormError(err.message)
        }
      } catch (_) {
        setFormError(err.message || 'An error occurred while saving the expenditure.')
      }
    }
  }

  const themeColor = type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'

  return (
    <div className="app-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/expenses" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600' }}>
          ← Back to Expenditures
        </Link>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800', marginTop: '0.5rem', color: themeColor, transition: 'color var(--transition-normal)' }}>
          {isEdit ? 'Edit Transaction 📝' : (type === 'income' ? 'Log New Income 💰' : 'Log New Expense 💸')}
        </h2>
      </div>

      <div className="card" style={{ borderTop: `4px solid ${themeColor}`, transition: 'border-color var(--transition-normal)' }}>
        {formError && (
          <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Toggle segment for Outgoing vs Incoming */}
          <div className="payment-type-toggle" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: type === 'expense' ? 'var(--color-expense)' : 'transparent',
                color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              💸 Outgoing Payment
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: type === 'income' ? 'var(--color-income)' : 'transparent',
                color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              💰 Incoming Payment
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input 
              type="date" 
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            {errors.date && <div className="form-error">{errors.date}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{type === 'income' ? 'Customer Name' : 'Vendor / Payee'}</label>
            <VendorDropdown
              value={vendorId}
              onChange={setVendorId}
              transactionType={type}
            />
            {errors.vendorId && <div className="form-error">{errors.vendorId}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Amount (INR)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              className="form-control"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            {errors.amount && <div className="form-error">{errors.amount}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-control"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {visibleCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <div className="form-error">{errors.categoryId}</div>}
            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
              <Link to="/categories" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                + Add or manage custom categories
              </Link>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select 
              className="form-control"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              required
            >
              <option value="cash">Cash 💵</option>
              <option value="upi">UPI 📱</option>
              <option value="bank_transfer">Bank Transfer 🏦</option>
              <option value="card">Card 💳</option>
              <option value="other">Other 🏷️</option>
            </select>
            {errors.paymentMethod && <div className="form-error">{errors.paymentMethod}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Receipt ID (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. REC-12345 (Alphanumeric + Hyphens)" 
              className="form-control"
              value={receiptId}
              onChange={e => setReceiptId(e.target.value)}
            />
            {errors.receiptId && <div className="form-error">{errors.receiptId}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea 
              rows="3" 
              placeholder={type === 'income' ? 'Add details about custom orders, payments, bulk details, etc.' : 'Add details about threads, maintenance done, etc.'} 
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            {errors.notes && <div className="form-error">{errors.notes}</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <Link to="/expenses" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
              Cancel
            </Link>
            <button type="submit" className="btn" style={{ flex: 2, backgroundColor: themeColor, color: '#ffffff', fontWeight: '700', cursor: 'pointer', transition: 'background-color var(--transition-normal)' }}>
              {isEdit ? 'Save Changes' : (type === 'income' ? 'Log Income 💰' : 'Log Expense 💸')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default AddEditPage
