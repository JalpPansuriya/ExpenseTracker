export const applyFilters = (expenditures, filters = {}) => {
  return expenditures.filter(exp => {
    // Soft deleted check
    if (exp.deleted) return false

    // Date From Filter
    if (filters.dateFrom && exp.date < filters.dateFrom) return false

    // Date To Filter
    if (filters.dateTo && exp.date > filters.dateTo) return false

    // Type Filter
    if (filters.type && filters.type !== 'all') {
      const expType = exp.type || 'expense'
      if (expType !== filters.type) return false
    }

    // Category Filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(exp.categoryId)) return false
    }

    // Payment Method Filter
    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      if (!filters.paymentMethods.includes(exp.paymentMethod)) return false
    }

    // Amount range filter (amountMin and amountMax are in decimal/float from UI, compare to exp.amount in paise)
    if (filters.amountMin !== undefined && filters.amountMin !== null && filters.amountMin !== '') {
      if (exp.amount < Math.round(Number(filters.amountMin) * 100)) return false
    }

    if (filters.amountMax !== undefined && filters.amountMax !== null && filters.amountMax !== '') {
      if (exp.amount > Math.round(Number(filters.amountMax) * 100)) return false
    }

    // Vendor Filter
    if (filters.vendorId && exp.vendorId !== filters.vendorId) return false

    return true
  })
}

export const applyDueFilters = (duePayments, filters = {}) => {
  return duePayments.filter(due => {
    // Soft deleted check
    if (due.deleted) return false

    // Category Filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(due.categoryId)) return false
    }

    // Priority Filter
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(due.priority)) return false
    }

    // Status Filter
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(due.status)) return false
    }

    // Date From Filter
    if (filters.dateFrom && due.dueDate < filters.dateFrom) return false

    // Date To Filter
    if (filters.dateTo && due.dueDate > filters.dateTo) return false

    // Vendor Filter
    if (filters.vendorId && due.vendorId !== filters.vendorId) return false

    return true
  })
}

export const searchExpenditures = (expenditures, query = '') => {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return expenditures

  return expenditures.filter(exp => {
    const vendorMatch = (exp.vendorName || exp.vendor || '').toLowerCase().includes(normalizedQuery)
    const notesMatch = exp.notes ? exp.notes.toLowerCase().includes(normalizedQuery) : false
    const receiptMatch = exp.receiptId ? exp.receiptId.toLowerCase().includes(normalizedQuery) : false
    return vendorMatch || notesMatch || receiptMatch
  })
}

export const searchDuePayments = (duePayments, query = '') => {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return duePayments

  return duePayments.filter(due => {
    const titleMatch = due.title ? due.title.toLowerCase().includes(normalizedQuery) : false
    const vendorMatch = (due.vendorName || due.vendor || '').toLowerCase().includes(normalizedQuery)
    const notesMatch = due.notes ? due.notes.toLowerCase().includes(normalizedQuery) : false
    return titleMatch || vendorMatch || notesMatch
  })
}
