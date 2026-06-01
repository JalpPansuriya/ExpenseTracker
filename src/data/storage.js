import { openDB } from 'idb'
import { DEFAULT_CATEGORIES, DEFAULT_NOTIFICATION_SETTINGS } from './schema'

const DB_NAME = 'hisab-tracker'
const DB_VERSION = 3

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  async upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 1) {
      // Expenditures store
      const expStore = db.createObjectStore('expenditures', { keyPath: 'id' })
      expStore.createIndex('by_date', 'date')
      expStore.createIndex('by_category', 'categoryId')
      expStore.createIndex('by_deleted', 'deleted')

      // Due payments store
      const dueStore = db.createObjectStore('duePayments', { keyPath: 'id' })
      dueStore.createIndex('by_dueDate', 'dueDate')
      dueStore.createIndex('by_deleted', 'deleted')

      // Categories store
      db.createObjectStore('categories', { keyPath: 'id' })

      // Notification settings store
      db.createObjectStore('notificationSettings', { keyPath: 'id' })

      // Seed initial data
      const catStore = transaction.objectStore('categories')
      DEFAULT_CATEGORIES.forEach(cat => catStore.put(cat))

      const settingsStore = transaction.objectStore('notificationSettings')
      settingsStore.put(DEFAULT_NOTIFICATION_SETTINGS)
    }

    if (oldVersion < 2) {
      const store = transaction.objectStore('expenditures')
      if (!store.indexNames.contains('by_type')) {
        store.createIndex('by_type', 'type')
      }
      
      // Migrate existing records: set type = 'expense' on all
      const allRecords = await store.getAll()
      for (const record of allRecords) {
        if (!record.type) {
          record.type = 'expense'
          await store.put(record)
        }
      }
    }

    if (oldVersion < 3) {
      const vendorStore = db.createObjectStore('vendors', { keyPath: 'id' })
      vendorStore.createIndex('by_name', 'name')
      vendorStore.createIndex('by_type', 'type')
      vendorStore.createIndex('by_deleted', 'deleted')

      const expStore = transaction.objectStore('expenditures')
      const dueStore = transaction.objectStore('duePayments')

      const expenditures = await expStore.getAll()
      const duePayments = await dueStore.getAll()

      const vendorMap = {}

      const ensureVendor = async (name, defaultType) => {
        if (!name) return null
        const key = name.trim().toLowerCase()
        if (vendorMap[key]) {
          const existing = vendorMap[key]
          if (existing.type !== 'both' && existing.type !== defaultType) {
            existing.type = 'both'
            existing.updatedAt = new Date().toISOString()
            await vendorStore.put(existing)
          }
          return existing.id
        }

        const vendorRecord = {
          id: crypto.randomUUID(),
          name: name.trim(),
          type: defaultType,
          phone: '',
          email: '',
          notes: '',
          archived: false,
          deleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        vendorMap[key] = vendorRecord
        await vendorStore.add(vendorRecord)
        return vendorRecord.id
      }

      // Migrate existing expenditures
      for (const exp of expenditures) {
        if (exp.vendor) {
          const defaultType = exp.type === 'income' ? 'customer' : 'supplier'
          const vId = await ensureVendor(exp.vendor, defaultType)
          exp.vendorId = vId
          exp.vendorName = exp.vendor
          await expStore.put(exp)
        }
      }

      // Migrate existing dues
      for (const due of duePayments) {
        if (due.vendor) {
          const vId = await ensureVendor(due.vendor, 'supplier')
          due.vendorId = vId
          due.vendorName = due.vendor
          await dueStore.put(due)
        }
      }
    }
  }
})

// Post-load self-healing backfill for categories and settings
dbPromise.then(async (db) => {
  try {
    const tx = db.transaction(['categories', 'notificationSettings'], 'readwrite')
    const store = tx.objectStore('categories')
    const existing = await store.getAll()
    
    // Check if any of the default categories are missing
    let missingAdded = false
    for (const cat of DEFAULT_CATEGORIES) {
      if (!existing.some(c => c.id === cat.id)) {
        await store.put(cat)
        missingAdded = true
      }
    }

    // Also ensure notificationSettings singleton exists
    const settingsStore = tx.objectStore('notificationSettings')
    const settings = await settingsStore.get('singleton')
    if (!settings) {
      await settingsStore.put(DEFAULT_NOTIFICATION_SETTINGS)
    }

    await tx.done
    if (missingAdded) {
      console.log('[StorageService] Successfully backfilled missing default categories.')
    }
  } catch (error) {
    console.error('[StorageService] Error during post-load backfill:', error)
  }
}).catch(() => {})

export const StorageService = {
  async getAll(storeName) {
    try {
      const db = await dbPromise
      const items = await db.getAll(storeName)
      // Filter out soft-deleted items unless explicitly requested (e.g. settings don't have deleted property)
      return items.filter(item => item.deleted !== true)
    } catch (error) {
      console.error(`[StorageService] Error getting collection ${storeName}:`, error)
      return []
    }
  },

  async getAllWithDeleted(storeName) {
    try {
      const db = await dbPromise
      return await db.getAll(storeName)
    } catch (error) {
      console.error(`[StorageService] Error getting collection with deleted ${storeName}:`, error)
      return []
    }
  },

  async getById(storeName, id) {
    try {
      const db = await dbPromise
      const item = await db.get(storeName, id)
      return item || null
    } catch (error) {
      console.error(`[StorageService] Error getting ID ${id} in ${storeName}:`, error)
      return null
    }
  },

  async create(storeName, record) {
    try {
      const db = await dbPromise
      const newRecord = {
        ...record,
        id: record.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
      }
      await db.add(storeName, newRecord)
      return newRecord
    } catch (error) {
      console.error(`[StorageService] Error creating record in ${storeName}:`, error)
      throw error
    }
  },

  async update(storeName, id, changes) {
    try {
      const db = await dbPromise
      const existing = await db.get(storeName, id)
      
      if (!existing) {
        throw new Error(`Record with ID ${id} not found in store ${storeName}`)
      }
      
      const updatedRecord = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString()
      }
      
      await db.put(storeName, updatedRecord)
      return updatedRecord
    } catch (error) {
      console.error(`[StorageService] Error updating ID ${id} in ${storeName}:`, error)
      throw error
    }
  },

  async softDelete(storeName, id) {
    try {
      await this.update(storeName, id, { deleted: true })
    } catch (error) {
      console.error(`[StorageService] Error soft deleting ID ${id} in ${storeName}:`, error)
      throw error
    }
  },

  async restore(storeName, id) {
    try {
      await this.update(storeName, id, { deleted: false })
    } catch (error) {
      console.error(`[StorageService] Error restoring ID ${id} in ${storeName}:`, error)
      throw error
    }
  },

  async getSingleton(storeName) {
    try {
      const db = await dbPromise
      const res = await db.get(storeName, 'singleton')
      return res || null
    } catch (error) {
      console.error(`[StorageService] Error getting singleton ${storeName}:`, error)
      return null
    }
  },

  async setSingleton(storeName, data) {
    try {
      const db = await dbPromise
      const updated = { ...data, id: 'singleton' }
      await db.put(storeName, updated)
      return updated
    } catch (error) {
      console.error(`[StorageService] Error setting singleton ${storeName}:`, error)
      throw error
    }
  },

  async markAsPaidTransaction(duePaymentId, expenditureInput, duePaymentChanges) {
    const db = await dbPromise
    const tx = db.transaction(['expenditures', 'duePayments'], 'readwrite')
    
    try {
      // Prepare new expenditure
      const newExpenditure = {
        ...expenditureInput,
        id: expenditureInput.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
      }

      // Prepare updated due payment
      const dueStore = tx.objectStore('duePayments')
      const existingDue = await dueStore.get(duePaymentId)
      if (!existingDue) {
        throw new Error(`Due payment with ID ${duePaymentId} not found`)
      }

      const updatedDuePayment = {
        ...existingDue,
        ...duePaymentChanges,
        linkedExpenditureId: newExpenditure.id,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await tx.objectStore('expenditures').add(newExpenditure)
      await dueStore.put(updatedDuePayment)
      await tx.done

      return { duePayment: updatedDuePayment, expenditure: newExpenditure }
    } catch (error) {
      await tx.done.catch(() => {})
      throw error
    }
  }
}

export const BackupService = {
  async getLastBackupAt() {
    try {
      const db = await dbPromise
      const settings = await db.get('notificationSettings', 'singleton')
      return settings ? settings.lastBackupAt : null
    } catch (error) {
      console.error('[BackupService] Error reading lastBackupAt:', error)
      return null
    }
  },

  async updateLastBackupAt(dateStr) {
    try {
      const db = await dbPromise
      const settings = await db.get('notificationSettings', 'singleton') || { id: 'singleton', enabled: true, defaultLeadDays: 5, permissionState: 'default' }
      settings.lastBackupAt = dateStr
      await db.put('notificationSettings', settings)
    } catch (error) {
      console.error('[BackupService] Error writing lastBackupAt:', error)
      throw error
    }
  },

  async exportJSON() {
    try {
      const db = await dbPromise
      const backupData = {
        version: 3,
        expenditures: await db.getAll('expenditures'),
        categories: await db.getAll('categories'),
        duePayments: await db.getAll('duePayments'),
        notificationSettings: await db.get('notificationSettings', 'singleton'),
        vendors: await db.getAll('vendors')
      }
      const jsonString = JSON.stringify(backupData, null, 2)
      return new Blob([jsonString], { type: 'application/json' })
    } catch (error) {
      console.error('[BackupService] Error exporting JSON:', error)
      throw error
    }
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result)
          
          if (!imported.expenditures || !imported.categories || !imported.duePayments) {
            return reject(new Error('Invalid backup file format: missing collections.'))
          }
          
          const db = await dbPromise
          const tx = db.transaction(['expenditures', 'categories', 'duePayments', 'notificationSettings', 'vendors'], 'readwrite')
          
          try {
            // Clear all existing data
            await tx.objectStore('expenditures').clear()
            await tx.objectStore('categories').clear()
            await tx.objectStore('duePayments').clear()
            await tx.objectStore('notificationSettings').clear()
            await tx.objectStore('vendors').clear()
            
            // Put imported records
            for (const exp of imported.expenditures) {
              await tx.objectStore('expenditures').put(exp)
            }
            for (const cat of imported.categories) {
              await tx.objectStore('categories').put(cat)
            }
            for (const due of imported.duePayments) {
              await tx.objectStore('duePayments').put(due)
            }
            if (imported.notificationSettings) {
              await tx.objectStore('notificationSettings').put(imported.notificationSettings)
            }
            if (imported.vendors) {
              for (const vendor of imported.vendors) {
                await tx.objectStore('vendors').put(vendor)
              }
            }
            
            await tx.done
            resolve({ success: true, count: {
              expenditures: imported.expenditures.length,
              categories: imported.categories.length,
              duePayments: imported.duePayments.length
            }})
          } catch (err) {
            await tx.done.catch(() => {})
            reject(err)
          }
        } catch (error) {
          reject(new Error('Failed to parse or restore backup JSON: ' + error.message))
        }
      }
      reader.onerror = () => reject(new Error('File reading error.'))
      reader.readAsText(file)
    })
  }
}
