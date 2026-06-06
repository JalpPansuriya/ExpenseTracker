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
      type: input.type || 'payable',
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

    // Propagate changes to the linked expenditure if it exists
    if (existing.linkedExpenditureId) {
      const expChanges = {}
      if (input.amount !== undefined) {
        expChanges.amount = Math.round(input.amount * 100)
      }
      if (input.vendorId) {
        expChanges.vendorId = input.vendorId
        const vendor = await StorageService.getById('vendors', input.vendorId)
        expChanges.vendorName = vendor ? vendor.name : ''
      }
      if (input.categoryId) {
        expChanges.categoryId = input.categoryId
      }
      if (input.notes !== undefined) {
        expChanges.notes = input.notes
      }
      if (input.date) {
        expChanges.date = input.date
      }
      if (Object.keys(expChanges).length > 0) {
        await StorageService.update('expenditures', existing.linkedExpenditureId, expChanges)
      }
    }

    return await StorageService.update('duePayments', id, changes)
  },

  async deleteDuePayment(id) {
    const existing = await StorageService.getById('duePayments', id)
    if (!existing) {
      throw new Error(`Due payment with ID ${id} not found`)
    }

    // Soft delete linked expenditures
    if (existing.linkedExpenditureId) {
      await StorageService.softDelete('expenditures', existing.linkedExpenditureId)
    }
    const expenditures = await StorageService.getAll('expenditures')
    const linkedExps = expenditures.filter(exp => exp.duePaymentId === id)
    for (const exp of linkedExps) {
      await StorageService.softDelete('expenditures', exp.id)
    }

    return await StorageService.softDelete('duePayments', id)
  },

  async revertDuePayment(id) {
    const existing = await StorageService.getById('duePayments', id)
    if (!existing) {
      throw new Error(`Due payment with ID ${id} not found`)
    }

    // Delete linked expenditures
    if (existing.linkedExpenditureId) {
      await StorageService.softDelete('expenditures', existing.linkedExpenditureId)
    }
    const expenditures = await StorageService.getAll('expenditures')
    const linkedExps = expenditures.filter(exp => exp.duePaymentId === id)
    for (const exp of linkedExps) {
      await StorageService.softDelete('expenditures', exp.id)
    }

    // Reset due payment properties
    const changes = {
      paidAt: null,
      linkedExpenditureId: null,
      isPartial: null
    }
    if (existing.originalAmount) {
      changes.amount = existing.originalAmount
      changes.originalAmount = null
    }

    return await StorageService.update('duePayments', id, changes)
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
      duePaymentId: due.id,
      type: due.type === 'receivable' ? 'income' : 'expense'
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
      duePaymentChanges.originalAmount = due.originalAmount || due.amount
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

    let payable = { overdueCount: 0, overdueTotal: 0, dueSoonCount: 0, dueSoonTotal: 0, upcomingCount: 0 }
    let receivable = { overdueCount: 0, overdueTotal: 0, dueSoonCount: 0, dueSoonTotal: 0, upcomingCount: 0 }

    for (const due of active) {
      const status = computeStatus(due, today)
      const target = due.type === 'receivable' ? receivable : payable
      if (status === 'overdue') { target.overdueCount++; target.overdueTotal += due.amount }
      else if (status === 'due_soon') { target.dueSoonCount++; target.dueSoonTotal += due.amount }
      else if (status === 'upcoming') { target.upcomingCount++ }
    }

    return { payable, receivable }
  }
}
