import React from 'react'
import { Link } from 'react-router-dom'
import AmountDisplay from './AmountDisplay'

export const DuePaymentWidget = ({ summary }) => {
  const { overdueCount = 0, overdueTotal = 0, dueSoonCount = 0, dueSoonTotal = 0 } = summary || {}

  const hasDues = overdueCount > 0 || dueSoonCount > 0

  return (
    <div className="card">
      <div className="card-title">
        <span>Due Payments Overview ⏳</span>
        <Link to="/dues" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
          View All Dues →
        </Link>
      </div>

      {!hasDues ? (
        <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>All caught up! No pending dues.</span>
        </div>
      ) : (
        <div className="summary-widget-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div className="summary-card overdue" style={{ cursor: 'pointer' }}>
            <Link to="/dues" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>🔴 Overdue</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0.25rem 0' }}>{overdueCount}</div>
              <AmountDisplay amount={overdueTotal} className="bold" />
            </Link>
          </div>

          <div className="summary-card due-soon" style={{ cursor: 'pointer' }}>
            <Link to="/dues" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>🟡 Due Soon</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0.25rem 0' }}>{dueSoonCount}</div>
              <AmountDisplay amount={dueSoonTotal} className="bold" />
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
        <Link to="/dues/new" className="btn btn-primary btn-sm" style={{ width: '100%', textDecoration: 'none' }}>
          + Add New Due Payment
        </Link>
      </div>
    </div>
  )
}
export default DuePaymentWidget
