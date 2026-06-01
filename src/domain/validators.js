import { StorageService } from '../data/storage'

export const validateCategory = async (input) => {
  const errors = []
  
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push({ field: 'name', message: 'Category name is required' })
  } else if (input.name.length > 50) {
    errors.push({ field: 'name', message: 'Category name must be less than 50 characters' })
  }
  
  if (!input.icon || typeof input.icon !== 'string' || input.icon.trim() === '') {
    errors.push({ field: 'icon', message: 'Icon is required' })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export const validateExpenditure = async (input) => {
  const errors = []
  
  // Type validation
  const type = input.type || 'expense'
  const validTypes = ['income', 'expense']
  if (!validTypes.includes(type)) {
    errors.push({ field: 'type', message: 'Type must be income or expense' })
  }

  // Date validation
  if (!input.date || typeof input.date !== 'string') {
    errors.push({ field: 'date', message: 'Date is required' })
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(input.date)) {
      errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' })
    }
  }

  // Amount validation (in floating point / decimal from user input)
  if (input.amount === undefined || input.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' })
  } else {
    const amountNum = Number(input.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number' })
    } else {
      // Check decimal places (max 2)
      const parts = input.amount.toString().split('.')
      if (parts[1] && parts[1].length > 2) {
        errors.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' })
      }
    }
  }

  // Category validation
  if (!input.categoryId) {
    errors.push({ field: 'categoryId', message: 'Category is required' })
  } else {
    const category = await StorageService.getById('categories', input.categoryId)
    if (!category) {
      errors.push({ field: 'categoryId', message: 'Category does not exist' })
    } else if (category.archived) {
      errors.push({ field: 'categoryId', message: 'Category is archived and cannot be used for new expenses' })
    }
  }

  // Vendor validation
  if (!input.vendorId) {
    errors.push({ field: 'vendorId', message: 'Vendor is required' })
  } else {
    const vendor = await StorageService.getById('vendors', input.vendorId)
    if (!vendor) {
      errors.push({ field: 'vendorId', message: 'Vendor does not exist' })
    }
  }

  // Payment Method validation
  const validMethods = ['cash', 'upi', 'bank_transfer', 'card', 'other']
  if (!input.paymentMethod) {
    errors.push({ field: 'paymentMethod', message: 'Payment method is required' })
  } else if (!validMethods.includes(input.paymentMethod)) {
    errors.push({ field: 'paymentMethod', message: `Payment method must be one of: ${validMethods.join(', ')}` })
  }

  // Notes validation
  if (input.notes && input.notes.length > 500) {
    errors.push({ field: 'notes', message: 'Notes must be less than 500 characters' })
  }

  // Receipt ID validation
  if (input.receiptId) {
    if (input.receiptId.length > 50) {
      errors.push({ field: 'receiptId', message: 'Receipt ID must be less than 50 characters' })
    }
    const receiptRegex = /^[a-zA-Z0-9-]+$/
    if (!receiptRegex.test(input.receiptId)) {
      errors.push({ field: 'receiptId', message: 'Receipt ID must be alphanumeric and hyphens only' })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export const validateVendor = (input) => {
  const errors = []
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push({ field: 'name', message: 'Vendor name is required' })
  } else if (input.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Max 100 characters' })
  }
  if (!['supplier', 'customer', 'both'].includes(input.type)) {
    errors.push({ field: 'type', message: 'Invalid vendor type' })
  }
  if (input.phone && !/^[0-9+\-\s]{1,15}$/.test(input.phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone number' })
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push({ field: 'email', message: 'Invalid email' })
  }
  return { valid: errors.length === 0, errors }
}
