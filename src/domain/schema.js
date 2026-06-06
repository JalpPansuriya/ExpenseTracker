/**
 * @typedef {Object} Expenditure
 * @property {string} id - Unique identifier
 * @property {number} amount - Stored in integer paise (e.g. 10000 for ₹100.00)
 * @property {string} categoryId - Reference to Category ID
 * @property {string} vendorId - Reference to Vendor ID (foreign key)
 * @property {string} vendorName - Computed/denormalized vendor name for display
 * @property {string} date - Date of transaction in YYYY-MM-DD format
 * @property {string} paymentMethod - 'cash' | 'upi' | 'bank_transfer' | 'card' | 'other'
 * @property {string} [notes] - Additional transaction details (max 500 chars)
 * @property {string} [receiptId] - Optional receipt alphanumeric identifier
 * @property {string} [duePaymentId] - Optional linked due payment ID
 * @property {'income' | 'expense'} type - Direction of payment (default: 'expense')
 * @property {string} createdAt - ISO timestamp of record creation
 * @property {string} updatedAt - ISO timestamp of last update
 * @property {boolean} deleted - Soft deletion flag
 */

/**
 * @typedef {Object} Vendor
 * @property {string} id - Unique identifier
 * @property {string} name - Vendor name (max 100 chars, unique)
 * @property {'supplier' | 'customer' | 'both'} type - Role of the vendor
 * @property {string} [phone] - Optional phone contact (max 15 chars)
 * @property {string} [email] - Optional email address
 * @property {string} [notes] - Optional description (max 500 chars)
 * @property {boolean} archived - Archival status (default false)
 * @property {string} createdAt - ISO timestamp of vendor record creation
 * @property {string} updatedAt - ISO timestamp of last update
 * @property {boolean} deleted - Soft deletion flag
 */

/**
 * @typedef {Object} FilterState
 * @property {string} [dateFrom] - Start date bounds (YYYY-MM-DD)
 * @property {string} [dateTo] - End date bounds (YYYY-MM-DD)
 * @property {string[]} [categoryIds] - List of filtered Category IDs
 * @property {string[]} [paymentMethods] - List of filtered payment method keys
 * @property {number} [amountMin] - Minimum amount in decimal rupees
 * @property {number} [amountMax] - Maximum amount in decimal rupees
 * @property {'income' | 'expense' | 'all'} [type] - Filter by income, expense, or all (default: 'all')
 * @property {string} [vendorId] - Filter by specific Vendor ID
 */

/**
 * @typedef {Object} DuePayment
 * @property {string} id - Unique identifier
 * @property {string} title - Description
 * @property {number} amount - Stored in paise
 * @property {number} [originalAmount] - Stored in paise
 * @property {string} categoryId - Reference to Category ID
 * @property {string} vendorId - Reference to Vendor ID
 * @property {string} vendorName - Denormalized vendor name
 * @property {string} dueDate - YYYY-MM-DD
 * @property {string} priority - 'low' | 'medium' | 'high'
 * @property {number} reminderLeadDays - Days before due date to remind
 * @property {string} [notes] - Additional details
 * @property {'payable' | 'receivable'} type - Direction of due payment
 * @property {string} [paidAt] - ISO timestamp when paid
 * @property {string} [linkedExpenditureId] - ID of generated expenditure
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {boolean} deleted - Soft deletion flag
 */
