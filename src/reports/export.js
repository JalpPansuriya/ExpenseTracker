import { BackupService } from '../data/storage'

const downloadCSV = (headers, rows, filename) => {
  const csvString = [headers.join(",")].concat(rows.map(row => 
    row.map(value => {
      const stringValue = value === null || value === undefined ? '' : String(value)
      // Escape quotes and wrap in quotes if there are special characters
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  )).join('\n')

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToCSV = (expenditures, categories = [], filename = 'expenditures_report.csv') => {
  const headers = ['Type', 'Date', 'Amount (INR)', 'Category', 'Vendor', 'Payment Method', 'Notes', 'Receipt ID', 'Created At']
  
  const rows = expenditures.map(exp => {
    const category = categories.find(c => c.id === exp.categoryId)
    const categoryName = category ? category.name : 'Unknown'
    const formattedAmount = (exp.amount / 100).toFixed(2)
    const displayType = exp.type === 'income' ? 'Income' : 'Expense'
    
    return [
      displayType,
      exp.date,
      formattedAmount,
      categoryName,
      exp.vendorName || exp.vendor || '',
      exp.paymentMethod,
      exp.notes || '',
      exp.receiptId || '',
      exp.createdAt
    ]
  })

  downloadCSV(headers, rows, filename)
}

export const exportDuesToCSV = (duePayments, categories = [], filename = 'due_payments_report.csv') => {
  const headers = ['Title', 'Vendor', 'Amount (INR)', 'Due Date', 'Status', 'Priority', 'Category', 'Payment Method', 'Paid At', 'Notes', 'Days Overdue']
  
  const today = new Date().toLocaleDateString('en-CA')

  const rows = duePayments.map(due => {
    const category = categories.find(c => c.id === due.categoryId)
    const categoryName = category ? category.name : 'Unknown'
    const formattedAmount = (due.amount / 100).toFixed(2)

    // Calculate days overdue
    let daysOverdue = 0
    if (!due.paidAt) {
      const dueTime = new Date(`${due.dueDate}T00:00:00`).getTime()
      const todayTime = new Date(`${today}T00:00:00`).getTime()
      if (todayTime > dueTime) {
        daysOverdue = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24))
      }
    }
    
    return [
      due.title,
      due.vendorName || due.vendor || '',
      formattedAmount,
      due.dueDate,
      due.status || 'pending',
      due.priority,
      categoryName,
      due.paymentMethod || 'N/A',
      due.paidAt || '',
      due.notes || '',
      daysOverdue > 0 ? daysOverdue.toString() : '0'
    ]
  })

  downloadCSV(headers, rows, filename)
}

export const exportToJSON = (data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `hisab_tracker_backup_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('[Export] Error exporting JSON:', error)
  }
}
