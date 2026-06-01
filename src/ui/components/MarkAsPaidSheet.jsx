import React, { useState, useEffect } from 'react'

export const MarkAsPaidSheet = ({ isOpen, duePayment, categories = [], onConfirm, onCancel }) => {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [receiptId, setReceiptId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (duePayment) {
      setAmount((duePayment.amount / 100).toFixed(2))
      setDate(new Date().toLocaleDateString('en-CA')) // default to today
      setPaymentMethod(duePayment.paymentMethod || 'upi')
      setNotes(duePayment.notes || '')
      setReceiptId('')
      setError('')
    }
  }, [duePayment])

  if (!isOpen || !duePayment) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive amount')
      return
    }
    if (!date) {
      setError('Date is required')
      return
    }

    onConfirm({
      amount: Number(amount), // float from form, domain will convert to paise
      date,
      paymentMethod,
      notes,
      receiptId: receiptId || null
    })
  }

  const selectedCategory = categories.find(c => c.id === duePayment.categoryId)

  return (
    <div className="modal-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
      <div className="bottom-sheet" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800' }}>Confirm Payment</h3>
          <button 
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Review and finalize details to log this due payment as an expenditure.
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error" style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Due Record</div>
            <div style={{ fontWeight: '700', fontSize: '1.05rem', margin: '0.25rem 0' }}>{duePayment.title}</div>
            <div style={{ fontSize: '0.85rem', color: '#555' }}>
              Vendor: <strong>{duePayment.vendor}</strong> | Category: <strong>{selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Unknown'}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount Paid (INR)</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-control" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select 
              className="form-control" 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash 💵</option>
              <option value="upi">UPI 📱</option>
              <option value="bank_transfer">Bank Transfer 🏦</option>
              <option value="card">Card 💳</option>
              <option value="other">Other 🏷️</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Receipt ID (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. REC-12345" 
              className="form-control" 
              value={receiptId} 
              onChange={e => setReceiptId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea 
              rows="3" 
              className="form-control" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              Log Expenditure
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default MarkAsPaidSheet
