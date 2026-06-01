import { StorageService } from '../data/storage'
import { validateCategory } from './validators'

export const CategoryService = {
  async listCategories(includeArchived = false) {
    const categories = await StorageService.getAll('categories')
    if (includeArchived) {
      return categories
    }
    return categories.filter(cat => !cat.archived)
  },

  async createCategory(name, icon) {
    const input = { name, icon, isCustom: true, archived: false }
    const validation = await validateCategory(input)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }
    return await StorageService.create('categories', input)
  },

  async updateCategory(id, changes) {
    const category = await StorageService.getById('categories', id)
    if (!category) {
      throw new Error(`Category with ID ${id} not found`)
    }
    
    const updatedInput = { ...category, ...changes }
    const validation = await validateCategory(updatedInput)
    if (!validation.valid) {
      throw new Error(JSON.stringify(validation.errors))
    }
    
    return await StorageService.update('categories', id, changes)
  },

  async archiveCategory(id) {
    const category = await StorageService.getById('categories', id)
    if (!category) {
      throw new Error(`Category with ID ${id} not found`)
    }
    
    // Archive category
    return await StorageService.update('categories', id, { archived: true })
  },

  async deleteCategory(id) {
    const category = await StorageService.getById('categories', id)
    if (!category) {
      throw new Error(`Category with ID ${id} not found`)
    }

    // Check if category is used in any expenditures or due payments
    const expenditures = await StorageService.getAll('expenditures')
    const duePayments = await StorageService.getAll('duePayments')

    const isUsedInExpenditures = expenditures.some(exp => exp.categoryId === id)
    const isUsedInDuePayments = duePayments.some(due => due.categoryId === id)

    if (isUsedInExpenditures || isUsedInDuePayments) {
      throw new Error('Cannot delete category: Category is currently in use')
    }

    return await StorageService.softDelete('categories', id)
  }
}
