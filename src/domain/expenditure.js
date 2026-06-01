import { StorageService } from '../data/storage'
import { validateExpenditure } from './validators'

export const ExpenditureService = {
  async createExpenditure(input) {
    const enrichedInput = {
      type: 'expense',
      ...input
    }

    const validation = await validateExpenditure(enrichedInput)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    const vendor = await StorageService.getById('vendors', enrichedInput.vendorId)
    const vendorName = vendor ? vendor.name : ''

    const storedRecord = {
      ...enrichedInput,
      vendorName,
      amount: Math.round(enrichedInput.amount * 100), // convert to paise
      duePaymentId: enrichedInput.duePaymentId || null
    }

    return await StorageService.create('expenditures', storedRecord)
  },

  async createExpenditureFromDue(duePayment, overrides = {}) {
    const amount = overrides.amount !== undefined 
      ? Math.round(overrides.amount * 100)
      : duePayment.amount // already in paise

    const vendorId = overrides.vendorId || duePayment.vendorId
    const vendor = await StorageService.getById('vendors', vendorId)
    const vendorName = vendor ? vendor.name : ''

    const rawInput = {
      type: 'expense',
      date: overrides.date || new Date().toLocaleDateString('en-CA'),
      amount: overrides.amount !== undefined ? overrides.amount : (duePayment.amount / 100), // for validation, pass float
      categoryId: overrides.categoryId || duePayment.categoryId,
      vendorId,
      paymentMethod: overrides.paymentMethod || duePayment.paymentMethod || 'cash',
      notes: overrides.notes !== undefined ? overrides.notes : duePayment.notes,
      receiptId: overrides.receiptId || null,
      duePaymentId: duePayment.id
    }

    const validation = await validateExpenditure(rawInput)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    const storedRecord = {
      ...rawInput,
      vendorName,
      amount, // store in paise
      duePaymentId: duePayment.id
    }

    return await StorageService.create('expenditures', storedRecord)
  },

  async updateExpenditure(id, input) {
    const existing = await StorageService.getById('expenditures', id)
    if (!existing) {
      throw new Error(`Expenditure with ID ${id} not found`)
    }

    const mergedForValidation = {
      ...existing,
      ...input,
      amount: input.amount !== undefined ? input.amount : (existing.amount / 100)
    }

    const validation = await validateExpenditure(mergedForValidation)
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

    return await StorageService.update('expenditures', id, changes)
  },

  async deleteExpenditure(id) {
    return await StorageService.softDelete('expenditures', id)
  },

  async listExpenditures(filters = {}) {
    let list = await StorageService.getAll('expenditures')
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      list = list.filter(e => e.type === filters.type)
    }
    if (filters.dateFrom) {
      list = list.filter(e => e.date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      list = list.filter(e => e.date <= filters.dateTo)
    }
    
    // Sort by date descending, then createdAt descending
    return list.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date)
      if (dateDiff !== 0) return dateDiff
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  },

  async getExpenditure(id) {
    return await StorageService.getById('expenditures', id)
  },

  async getTotalIncome(dateFrom, dateTo) {
    const list = await StorageService.getAll('expenditures')
    return list
      .filter(e => !e.deleted && e.type === 'income' && (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo))
      .reduce((sum, e) => sum + e.amount, 0)
  },

  async getTotalExpenses(dateFrom, dateTo) {
    const list = await StorageService.getAll('expenditures')
    return list
      .filter(e => !e.deleted && (e.type === 'expense' || !e.type) && (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo))
      .reduce((sum, e) => sum + e.amount, 0)
  },

  async getNetProfit(dateFrom, dateTo) {
    const income = await this.getTotalIncome(dateFrom, dateTo)
    const expenses = await this.getTotalExpenses(dateFrom, dateTo)
    return income - expenses
  }
}
