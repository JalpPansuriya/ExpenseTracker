import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { DuePaymentService } from '../../dues/duePayment'
import { CategoryService } from '../../domain/category'
import { NotificationSettingsService } from '../../notifications/settings'
import VendorDropdown from '../components/VendorDropdown'

export const AddEditDuePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [reminderLeadDays, setReminderLeadDays] = useState('')
  const [notes, setNotes] = useState('')

  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      // Load categories
      const cats = await CategoryService.listCategories(false)
      setCategories(cats)
      if (cats.length > 0) {
        setCategoryId(cats[0].id)
      }

      // Default due date to 7 days from now
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 7)
      setDueDate(defaultDate.toLocaleDateString('en-CA'))

      // Load global default lead days
      const settings = await NotificationSettingsService.getSettings()
      if (settings) {
        setReminderLeadDays(settings.defaultLeadDays.toString())
      }

      if (isEdit) {
        const due = await DuePaymentService.getDuePayment(id)
        if (due) {
          if (due.status === 'paid') {
            setFormError('Cannot edit a paid due payment')
            return
          }
          setTitle(due.title)
          setVendorId(due.vendorId || '')
          setAmount((due.amount / 100).toString()) // convert paise to float
          setDueDate(due.dueDate)
          setCategoryId(due.categoryId)
          setPriority(due.priority)
          setReminderLeadDays(due.reminderLeadDays.toString())
          setNotes(due.notes || '')
        } else {
          setFormError('Due record not found')
        }
      }
    }
    loadData()
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setFormError('')

    const payload = {
      title,
      vendorId,
      amount: amount ? Number(amount) : '', // float format
      dueDate,
      categoryId,
      priority,
      reminderLeadDays: reminderLeadDays ? Number(reminderLeadDays) : undefined,
      notes: notes || null
    }

    try {
      if (isEdit) {
        await DuePaymentService.updateDuePayment(id, payload)
      } else {
        await DuePaymentService.createDuePayment(payload)
      }
      navigate('/dues')
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
        setFormError(err.message || 'An error occurred while saving the due payment.')
      }
    }
  }

  return (
    <div className="app-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/dues" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600' }}>
          ← Back to Dues
        </Link>
        <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800', marginTop: '0.5rem' }}>
          {isEdit ? 'Edit Due Record 📝' : 'Add New Due Record ⏳'}
        </h2>
      </div>

      <div className="card">
        {formError && (
          <div className="form-error" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title / Description</label>
            <input 
              type="text" 
              placeholder="e.g. Thread supplier invoice #42" 
              className="form-control"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={formError.includes('paid')}
              required
            />
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Vendor</label>
            <VendorDropdown
              value={vendorId}
              onChange={setVendorId}
              transactionType="expense"
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
              disabled={formError.includes('paid')}
              required
            />
            {errors.amount && <div className="form-error">{errors.amount}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input 
              type="date" 
              className="form-control"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={formError.includes('paid')}
              required
            />
            {errors.dueDate && <div className="form-error">{errors.dueDate}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-control"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={formError.includes('paid')}
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <div className="form-error">{errors.categoryId}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select 
              className="form-control"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              disabled={formError.includes('paid')}
              required
            >
              <option value="low">Low 🟢</option>
              <option value="medium">Medium 🔵</option>
              <option value="high">High 🔴</option>
            </select>
            {errors.priority && <div className="form-error">{errors.priority}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Reminder Lead Days</label>
            <input 
              type="number" 
              min="1" 
              max="30" 
              className="form-control"
              value={reminderLeadDays}
              onChange={e => setReminderLeadDays(e.target.value)}
              disabled={formError.includes('paid')}
              required
            />
            {errors.reminderLeadDays && <div className="form-error">{errors.reminderLeadDays}</div>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Number of days before the due date to trigger the first browser reminder.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea 
              rows="3" 
              placeholder="e.g. Terms: 30 days net, machine credit payment, etc." 
              className="form-control"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={formError.includes('paid')}
            />
            {errors.notes && <div className="form-error">{errors.notes}</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <Link to="/dues" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={formError.includes('paid')}>
              {isEdit ? 'Save Changes' : 'Schedule Due Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default AddEditDuePage
