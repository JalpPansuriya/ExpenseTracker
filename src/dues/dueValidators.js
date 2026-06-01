import { StorageService } from '../data/storage'

export const validateDuePayment = async (input) => {
  const errors = []
  
  // Title
  if (!input.title || typeof input.title !== 'string' || input.title.trim() === '') {
    errors.push({ field: 'title', message: 'Title is required' })
  } else if (input.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be less than 100 characters' })
  }

  // Amount
  if (input.amount === undefined || input.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' })
  } else {
    const amountNum = Number(input.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number' })
    } else {
      const parts = input.amount.toString().split('.')
      if (parts[1] && parts[1].length > 2) {
        errors.push({ field: 'amount', message: 'Amount cannot have more than 2 decimal places' })
      }
    }
  }

  // Due Date
  if (!input.dueDate || typeof input.dueDate !== 'string') {
    errors.push({ field: 'dueDate', message: 'Due date is required' })
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(input.dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be in YYYY-MM-DD format' })
    }
  }

  // Category
  if (!input.categoryId) {
    errors.push({ field: 'categoryId', message: 'Category is required' })
  } else {
    const category = await StorageService.getById('categories', input.categoryId)
    if (!category) {
      errors.push({ field: 'categoryId', message: 'Category does not exist' })
    } else if (category.archived) {
      errors.push({ field: 'categoryId', message: 'Category is archived' })
    }
  }

  // Vendor
  if (!input.vendorId) {
    errors.push({ field: 'vendorId', message: 'Vendor is required' })
  } else {
    const vendor = await StorageService.getById('vendors', input.vendorId)
    if (!vendor) {
      errors.push({ field: 'vendorId', message: 'Vendor does not exist' })
    }
  }

  // Priority
  const validPriorities = ['low', 'medium', 'high']
  if (input.priority && !validPriorities.includes(input.priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${validPriorities.join(', ')}` })
  }

  // Reminder Lead Days
  if (input.reminderLeadDays !== undefined && input.reminderLeadDays !== null) {
    const leadDays = Number(input.reminderLeadDays)
    if (isNaN(leadDays) || leadDays < 1 || leadDays > 30 || !Number.isInteger(leadDays)) {
      errors.push({ field: 'reminderLeadDays', message: 'Reminder lead days must be an integer between 1 and 30' })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
