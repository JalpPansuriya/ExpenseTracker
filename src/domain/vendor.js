import { StorageService } from '../data/storage'
import { validateVendor } from './validators'

export const VendorService = {
  // Get all active vendors
  async listVendors(includeArchived = false) {
    const vendors = await StorageService.getAll('vendors')
    if (includeArchived) {
      return vendors
    }
    return vendors.filter(v => !v.archived)
  },

  // Get vendors filtered by type
  async listByType(type) {
    const vendors = await this.listVendors(false)
    if (type === 'both') {
      return vendors
    }
    return vendors.filter(v => v.type === type || v.type === 'both')
  },

  // Get single vendor
  async getVendor(id) {
    return await StorageService.getById('vendors', id)
  },

  // Create new vendor
  async createVendor(input) {
    const validation = validateVendor(input)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    // Name uniqueness check (case-insensitive)
    const vendors = await StorageService.getAllWithDeleted('vendors')
    const cleanedName = input.name.trim().toLowerCase()
    const duplicate = vendors.find(v => !v.deleted && v.name.trim().toLowerCase() === cleanedName)
    if (duplicate) {
      throw new Error(JSON.stringify([{ field: 'name', message: 'Vendor name must be unique' }]))
    }

    const record = {
      name: input.name.trim(),
      type: input.type,
      phone: input.phone || '',
      email: input.email || '',
      notes: input.notes || '',
      archived: false,
      deleted: false
    }

    return await StorageService.create('vendors', record)
  },

  // Update vendor
  async updateVendor(id, changes) {
    const vendor = await StorageService.getById('vendors', id)
    if (!vendor) {
      throw new Error(`Vendor with ID ${id} not found`)
    }

    const merged = { ...vendor, ...changes }
    const validation = validateVendor(merged)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }

    if (changes.name && changes.name.trim().toLowerCase() !== vendor.name.trim().toLowerCase()) {
      const vendors = await StorageService.getAllWithDeleted('vendors')
      const cleanedName = changes.name.trim().toLowerCase()
      const duplicate = vendors.find(v => !v.deleted && v.name.trim().toLowerCase() === cleanedName)
      if (duplicate) {
        throw new Error(JSON.stringify([{ field: 'name', message: 'Vendor name must be unique' }]))
      }
    }

    const updateData = {
      ...changes
    }
    if (changes.name) updateData.name = changes.name.trim()

    return await StorageService.update('vendors', id, updateData)
  },

  // Soft delete — throws if vendor has linked expenditures or due payments
  async deleteVendor(id) {
    const vendor = await StorageService.getById('vendors', id)
    if (!vendor) {
      throw new Error(`Vendor with ID ${id} not found`)
    }

    // Check if used in expenditures or due payments
    const expenditures = await StorageService.getAll('expenditures')
    const duePayments = await StorageService.getAll('duePayments')

    const isUsedInExpenditures = expenditures.some(exp => exp.vendorId === id)
    const isUsedInDuePayments = duePayments.some(due => due.vendorId === id)

    if (isUsedInExpenditures || isUsedInDuePayments) {
      throw new Error('Cannot delete vendor: Vendor has linked transactions or dues')
    }

    return await StorageService.softDelete('vendors', id)
  },

  // Archive vendor
  async archiveVendor(id) {
    const vendor = await StorageService.getById('vendors', id)
    if (!vendor) {
      throw new Error(`Vendor with ID ${id} not found`)
    }
    return await StorageService.update('vendors', id, { archived: true })
  },

  // Get total spend for a vendor (sum of all linked expenditures)
  async getVendorStats(id) {
    const expenditures = await StorageService.getAll('expenditures')
    const vendorExps = expenditures.filter(exp => exp.vendorId === id)

    let totalSpent = 0
    let totalReceived = 0
    let transactionCount = 0

    for (const exp of vendorExps) {
      transactionCount++
      if (exp.type === 'income') {
        totalReceived += exp.amount
      } else {
        totalSpent += exp.amount
      }
    }

    return {
      totalSpent,
      totalReceived,
      transactionCount
    }
  }
}
