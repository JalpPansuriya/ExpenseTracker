import React from 'react'
import AmountDisplay from './AmountDisplay'
import CategoryPill from './CategoryPill'
import PriorityBadge from './PriorityBadge'
import DaysRemainingPill from './DaysRemainingPill'

export const DuePaymentCard = ({ 
  duePayment, 
  categories = [], 
  onMarkPaid, 
  onEdit, 
  onDelete 
}) => {
  const category = categories.find(c => c.id === duePayment.categoryId)
  
  return (
    <div className={`card`} style={{ borderLeft: `5px solid ${
      duePayment.status === 'paid' ? 'var(--status-paid)' :
      duePayment.status === 'overdue' ? 'var(--status-overdue)' :
      duePayment.status === 'due_soon' ? 'var(--status-due-soon)' :
      'var(--text-secondary)'
    }` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            {duePayment.title}
          </h4>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Vendor: <strong>{duePayment.vendor}</strong>
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {duePayment.originalAmount && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'line-through', marginBottom: '0.1rem' }}>
              <AmountDisplay amount={duePayment.originalAmount} />
            </div>
          )}
          <AmountDisplay amount={duePayment.amount} className="bold" style={{ fontSize: '1.1rem' }} />
          {duePayment.originalAmount && (
            <div style={{ fontSize: '0.75rem', color: 'var(--status-paid)', marginTop: '0.2rem', fontWeight: '600' }}>
              Partially Paid
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <CategoryPill category={category} />
        <PriorityBadge priority={duePayment.priority} />
        <DaysRemainingPill dueDate={duePayment.dueDate} status={duePayment.status} />
      </div>

      {duePayment.notes && (
        <p style={{ 
          fontSize: '0.85rem', 
          color: '#555', 
          backgroundColor: 'var(--bg-primary)', 
          padding: '0.5rem 0.75rem', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1rem',
          lineHeight: '1.4',
          border: '1px dashed var(--border-light)'
        }}>
          📝 {duePayment.notes}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>Due: {duePayment.dueDate}</span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {duePayment.status !== 'paid' && (
            <>
              {onEdit && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => onEdit(duePayment.id)}
                  style={{ padding: '0.25rem 0.6rem' }}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => onDelete(duePayment.id)}
                  style={{ padding: '0.25rem 0.6rem', backgroundColor: '#fdf2f2', color: 'var(--status-overdue)', border: '1px solid #ffccd2' }}
                >
                  Delete
                </button>
              )}
              {onMarkPaid && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => onMarkPaid(duePayment)}
                  style={{ padding: '0.25rem 0.65rem' }}
                >
                  ✓ Mark as Paid
                </button>
              )}
            </>
          )}
          {duePayment.status === 'paid' && (
            <span style={{ color: 'var(--status-paid)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              ✓ Paid on {duePayment.paidAt ? duePayment.paidAt.split('T')[0] : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
export default DuePaymentCard
