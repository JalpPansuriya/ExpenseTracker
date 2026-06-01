import React from 'react'
import { getDaysUntilDue } from '../../dues/dueStatus'

export const DaysRemainingPill = ({ dueDate, status }) => {
  if (status === 'paid') {
    return <span className="status-badge status-paid">✓ Paid</span>
  }

  const today = new Date().toLocaleDateString('en-CA')
  const days = getDaysUntilDue(dueDate, today)

  if (days === 0) {
    return <span className="status-badge status-due-soon">⚠ Today</span>
  }
  
  if (days === 1) {
    return <span className="status-badge status-due-soon">Tomorrow</span>
  }
  
  if (days > 1) {
    return <span className="status-badge status-upcoming">in {days} days</span>
  }

  return (
    <span className="status-badge status-overdue">
      🚨 {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} overdue
    </span>
  )
}
export default DaysRemainingPill
