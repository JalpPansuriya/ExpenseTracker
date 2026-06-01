const parseLocalDate = (dateStr) => {
  return new Date(`${dateStr}T00:00:00`)
}

export const getDaysUntilDue = (dueDate, today) => {
  const due = parseLocalDate(dueDate)
  const current = parseLocalDate(today)
  const diffTime = due.getTime() - current.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function computeStatus(duePayment, today) {
  if (duePayment.paidAt) return 'paid'
  const due = duePayment.dueDate   // 'YYYY-MM-DD'
  const lead = duePayment.reminderLeadDays ?? 5

  if (due < today) return 'overdue'

  const leadDate = new Date(today)
  leadDate.setDate(leadDate.getDate() + lead)
  const leadStr = leadDate.toISOString().split('T')[0]

  if (due <= leadStr) return 'due_soon'
  return 'upcoming'
}

export const shouldNotifyLeadDay = (duePayment, today) => {
  if (duePayment.paidAt || duePayment.deleted) return false
  const daysUntil = getDaysUntilDue(duePayment.dueDate, today)
  return daysUntil === duePayment.reminderLeadDays && !duePayment.notifiedLeadDay
}

export const shouldNotifyDueDay = (duePayment, today) => {
  if (duePayment.paidAt || duePayment.deleted) return false
  const daysUntil = getDaysUntilDue(duePayment.dueDate, today)
  return daysUntil === 0 && !duePayment.notifiedDueDay
}

export const shouldNotifyOverdue = (duePayment, today) => {
  if (duePayment.paidAt || duePayment.deleted) return false
  const daysUntil = getDaysUntilDue(duePayment.dueDate, today)
  // PRD: "if payment is overdue by 1 day, send one overdue notification"
  return daysUntil === -1 && !duePayment.notifiedOverdue
}
