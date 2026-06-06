import { StorageService } from '../data/storage'
import { validateDuePayment } from './dueValidators'
import { computeStatus } from './dueStatus'
import { validateExpenditure } from '../domain/validators'

const getTodayStr = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

let _createExpenditureFromDue = null
let _cancelNotifications = null

export const injectDependencies = ({ createExpenditureFromDue, cancelNotifications }) => {
  _createExpenditureFromDue = createExpenditureFromDue
  _cancelNotifications = cancelNotifications
}

export const DuePaymentService = {
  async createDuePayment(input) {
    const settings = await StorageService.getSingleton('notificationSettings')
    const defaultLeadDays = settings ? settings.defaultLeadDays : 5

    const enrichedInput = {
      priority: 'medium',
      reminderLeadDays: defaultLeadDays,
      ...input
    }

    const validation = await validateDuePayment(enrichedInput)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    const vendor = await StorageService.getById('vendors', enrichedInput.vendorId)
    const vendorName = vendor ? vendor.name : ''

    const storedRecord = {
      ...enrichedInput,
      vendorName,
      amount: Math.round(enrichedInput.amount * 100), // convert to paise
      paidAt: null,
      linkedExpenditureId: null,
      notifiedLeadDay: false,
      notifiedDueDay: false,
      notifiedOverdue: false
    }

    return await StorageService.create('duePayments', storedRecord)
  },

  async updateDuePayment(id, input) {
    const existing = await StorageService.getById('duePayments', id)
    if (!existing) {
      throw new Error(`Due payment with ID ${id} not found`)
    }

    const today = getTodayStr()
    const status = computeStatus(existing, today)
    if (status === 'paid') {
      throw new Error('Cannot edit a paid due payment')
    }

    const mergedForValidation = {
      ...existing,
      ...input,
      amount: input.amount !== undefined ? input.amount : (existing.amount / 100)
    }

    const validation = await validateDuePayment(mergedForValidation)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    const changes = {
      ...input
    }
    if (input.amount !== undefined) {
      changes.amount = Math.round(input.amount * 100) // convert to paise
    }
    if (input.vendorId) {
      const vendor = await StorageService.getById('vendors', input.vendorId)
      changes.vendorName = vendor ? vendor.name : ''
    }

    return await StorageService.update('duePayments', id, changes)
  },

  async deleteDuePayment(id) {
    const existing = await StorageService.getById('duePayments', id)
    if (!existing) {
      throw new Error(`Due payment with ID ${id} not found`)
    }

    const today = getTodayStr()
    const status = computeStatus(existing, today)
    if (status === 'paid') {
      throw new Error('Cannot delete a paid due payment')
    }

    return await StorageService.softDelete('duePayments', id)
  },

  async listDuePayments(filters = {}) {
    const list = await StorageService.getAll('duePayments')
    const today = getTodayStr()
    
    // Add derived status property
    return list
      .filter(item => !item.deleted)
      .map(item => ({
        ...item,
        status: computeStatus(item, today)
      }))
  },

  async getDuePayment(id) {
    const item = await StorageService.getById('duePayments', id)
    if (!item || item.deleted) return null
    
    const today = getTodayStr()
    return {
      ...item,
      status: computeStatus(item, today)
    }
  },

  async markAsPaid(id, expenditureOverrides = {}) {
    const due = await this.getDuePayment(id)
    if (!due) {
      throw new Error(`Due payment with ID ${id} not found`)
    }
    if (due.status === 'paid') {
      throw new Error('Due payment is already paid')
    }

    // 1. Prepare and validate expenditure record
    const amount = expenditureOverrides.amount !== undefined 
      ? Math.round(expenditureOverrides.amount * 100)
      : due.amount // already stored in paise

    const vendorId = expenditureOverrides.vendorId || due.vendorId
    const vendor = await StorageService.getById('vendors', vendorId)
    const vendorName = vendor ? vendor.name : ''

    const rawExpenditureInputForValidation = {
      date: expenditureOverrides.date || getTodayStr(),
      amount: expenditureOverrides.amount !== undefined ? expenditureOverrides.amount : (due.amount / 100), // for validation, pass float
      categoryId: expenditureOverrides.categoryId || due.categoryId,
      vendorId,
      paymentMethod: expenditureOverrides.paymentMethod || due.paymentMethod || 'cash',
      notes: expenditureOverrides.notes !== undefined ? expenditureOverrides.notes : due.notes,
      receiptId: expenditureOverrides.receiptId || null,
      duePaymentId: due.id
    }

    const validation = await validateExpenditure(rawExpenditureInputForValidation)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    // 2. Prepare transaction payloads
    const expenditureInput = {
      ...rawExpenditureInputForValidation,
      vendorName,
      amount // store in paise
    }

    const isPartialPayment = amount < due.amount

    const duePaymentChanges = {}
    
    if (isPartialPayment) {
      duePaymentChanges.amount = due.amount - amount
      duePaymentChanges.isPartial = true
    } else {
      duePaymentChanges.paidAt = new Date().toISOString()
      duePaymentChanges.linkedExpenditureId = null // will be injected by atomic transaction
    }

    // 3. Call single atomic IndexedDB transaction in storage
    const { duePayment, expenditure } = await StorageService.markAsPaidTransaction(id, expenditureInput, duePaymentChanges)

    // 4. Cancel pending notification flags if scheduler requires it
    if (_cancelNotifications) {
      _cancelNotifications(id)
    }

    return { duePayment, expenditure }
  },

  async getDueSummary() {
    const today = new Date().toISOString().split('T')[0]
    const all = await StorageService.getAll('duePayments')
    const active = all.filter(d => !d.deleted && !d.paidAt)

    let overdueCount = 0, overdueTotal = 0
    let dueSoonCount = 0, dueSoonTotal = 0
    let upcomingCount = 0

    for (const due of active) {
      const status = computeStatus(due, today)
      if (status === 'overdue') { overdueCount++; overdueTotal += due.amount }
      else if (status === 'due_soon') { dueSoonCount++; dueSoonTotal += due.amount }
      else if (status === 'upcoming') { upcomingCount++ }
    }

    return { overdueCount, overdueTotal, dueSoonCount, dueSoonTotal, upcomingCount }
  }
}
