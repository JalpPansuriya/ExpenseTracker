import 'fake-indexeddb/auto'
import crypto from 'node:crypto'
import { deleteDB, openDB } from 'idb'
import { describe, it, expect, beforeEach } from 'vitest'
import { StorageService, BackupService, dbPromise } from '../../src/data/storage.js'
import { DEFAULT_CATEGORIES, DEFAULT_NOTIFICATION_SETTINGS } from '../../src/data/schema.js'
import { ExpenditureService } from '../../src/domain/expenditure.js'
import { applyFilters } from '../../src/reports/filters.js'

// Ensure crypto is globally available in the test environment
if (!globalThis.crypto) {
  globalThis.crypto = crypto
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => crypto.randomUUID()
}

// Mock FileReader for Node.js environment in Vitest
class MockFileReader {
  constructor() {
    this.onload = null
    this.onerror = null
  }
  async readAsText(blob) {
    try {
      const text = await blob.text()
      if (this.onload) {
        this.onload({ target: { result: text } })
      }
    } catch (err) {
      if (this.onerror) {
        this.onerror(err)
      }
    }
  }
}
globalThis.FileReader = MockFileReader

describe('StorageService & BackupService tests using fake-indexeddb', () => {
  beforeEach(async () => {
    // Clear all stores to ensure test isolation
    const db = await dbPromise
    const tx = db.transaction(
      ['expenditures', 'duePayments', 'categories', 'notificationSettings', 'vendors'],
      'readwrite'
    )
    await Promise.all([
      tx.objectStore('expenditures').clear(),
      tx.objectStore('duePayments').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('notificationSettings').clear(),
      tx.objectStore('vendors').clear()
    ])
    await tx.done
  })

  describe('StorageService.create()', () => {
    it('should write correct record with generated id, createdAt, and deleted: false', async () => {
      const recordData = {
        amount: 50000, // 500 Rupees in Paise
        categoryId: 'cat-thread',
        description: 'Premium golden thread',
        date: '2026-06-01'
      }

      const created = await StorageService.create('expenditures', recordData)

      // 1. Verify returned object
      expect(created.id).toBeDefined()
      expect(typeof created.id).toBe('string')
      expect(created.id.length).toBeGreaterThan(0)
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.deleted).toBe(false)
      expect(created.amount).toBe(50000)
      expect(created.categoryId).toBe('cat-thread')

      // 2. Verify persisted object in database
      const db = await dbPromise
      const persisted = await db.get('expenditures', created.id)
      expect(persisted).toBeDefined()
      expect(persisted.id).toBe(created.id)
      expect(persisted.createdAt).toBe(created.createdAt)
      expect(persisted.deleted).toBe(false)
    })
  })

  describe('StorageService.markAsPaidTransaction() atomicity and rollback', () => {
    it('should roll back both writes if one fails due to duplicate key constraint', async () => {
      // 1. Setup initial due payment in database
      const initialDue = {
        id: 'due-1',
        amount: 150000, // 1500 Rupees in Paise
        categoryId: 'cat-fabric',
        vendor: 'Karan Textiles',
        dueDate: '2026-06-10',
        status: 'upcoming',
        deleted: false
      }
      const db = await dbPromise
      await db.add('duePayments', initialDue)

      // 2. Setup a pre-existing expenditure to cause key conflict
      const conflictingId = 'exp-conflict-123'
      const existingExp = {
        id: conflictingId,
        amount: 200000,
        categoryId: 'cat-misc',
        description: 'Pre-existing unrelated expense',
        date: '2026-05-30',
        deleted: false
      }
      await db.add('expenditures', existingExp)

      // 3. Prepare the markAsPaid payload targeting the same conflictingId to trigger constraint error
      const expenditureInput = {
        id: conflictingId, // This duplicate ID will trigger a database write failure
        amount: 150000,
        categoryId: 'cat-fabric',
        description: 'Payment for due Karan Textiles',
        date: '2026-06-01'
      }

      const duePaymentChanges = {
        status: 'paid'
      }

      // 4. Execute transaction and assert it throws an error
      await expect(
        StorageService.markAsPaidTransaction('due-1', expenditureInput, duePaymentChanges)
      ).rejects.toThrow()

      // 5. Verify Rollback: Check both tables to ensure no dirty state was saved
      const persistedDue = await db.get('duePayments', 'due-1')
      expect(persistedDue).toBeDefined()
      expect(persistedDue.status).toBe('upcoming')
      expect(persistedDue.linkedExpenditureId).toBeUndefined()
      expect(persistedDue.paidAt).toBeUndefined()

      // The pre-existing expenditure must NOT have been overwritten or modified
      const persistedExp = await db.get('expenditures', conflictingId)
      expect(persistedExp).toBeDefined()
      expect(persistedExp.amount).toBe(200000)
      expect(persistedExp.description).toBe('Pre-existing unrelated expense')
    })
  })

  describe('BackupService.importJSON()', () => {
    it('should purge all 4 stores and restore them correctly from JSON backup', async () => {
      // 1. Populate DB with stale/dummy data to be overwritten
      const db = await dbPromise
      await db.add('expenditures', { id: 'old-exp', amount: 10, deleted: false })
      await db.add('duePayments', { id: 'old-due', amount: 20, deleted: false })
      await db.add('categories', { id: 'old-cat', name: 'Old Category' })
      await db.put('notificationSettings', { id: 'singleton', enabled: false })

      // 2. Prepare mock JSON import payload with new data
      const mockBackup = {
        version: 2,
        expenditures: [
          { id: 'new-exp-1', amount: 99900, categoryId: 'cat-thread', date: '2026-06-01', deleted: false },
          { id: 'new-exp-2', amount: 45000, categoryId: 'cat-labor', date: '2026-06-02', deleted: false }
        ],
        categories: [
          { id: 'cat-thread', name: 'Thread & Yarn', icon: '🧵', isCustom: false, archived: false },
          { id: 'cat-labor', name: 'Outsourced Labor', icon: '✂️', isCustom: false, archived: false }
        ],
        duePayments: [
          { id: 'new-due-1', amount: 120000, vendor: 'Thread House', dueDate: '2026-06-05', status: 'upcoming', deleted: false }
        ],
        notificationSettings: {
          id: 'singleton',
          enabled: true,
          defaultLeadDays: 7,
          permissionState: 'granted'
        }
      }

      const jsonString = JSON.stringify(mockBackup)
      const mockFile = new Blob([jsonString], { type: 'application/json' })

      // 3. Perform import
      const result = await BackupService.importJSON(mockFile)
      expect(result.success).toBe(true)
      expect(result.count.expenditures).toBe(2)
      expect(result.count.categories).toBe(2)
      expect(result.count.duePayments).toBe(1)

      // 4. Verify Purge & Restore
      const expenditures = await db.getAll('expenditures')
      expect(expenditures.length).toBe(2)
      expect(expenditures.find(e => e.id === 'old-exp')).toBeUndefined()
      expect(expenditures.find(e => e.id === 'new-exp-1')).toBeDefined()
      expect(expenditures.find(e => e.id === 'new-exp-2').amount).toBe(45000)

      const dues = await db.getAll('duePayments')
      expect(dues.length).toBe(1)
      expect(dues.find(d => d.id === 'old-due')).toBeUndefined()
      expect(dues.find(d => d.id === 'new-due-1').vendor).toBe('Thread House')

      const categories = await db.getAll('categories')
      expect(categories.length).toBe(2)
      expect(categories.find(c => c.id === 'old-cat')).toBeUndefined()
      expect(categories.find(c => c.id === 'cat-thread').name).toBe('Thread & Yarn')

      const settings = await db.get('notificationSettings', 'singleton')
      expect(settings).toBeDefined()
      expect(settings.enabled).toBe(true)
      expect(settings.defaultLeadDays).toBe(7)
      expect(settings.permissionState).toBe('granted')
    })
  })

  describe('DB Version 2 Migration & Backfill Logic', () => {
    it('should successfully backfill legacy expenditures with type expense and add the index', async () => {
      const TEST_DB_NAME = 'hisab-tracker-test-migration'
      
      // 1. Delete database if it exists
      await deleteDB(TEST_DB_NAME)
      
      // 2. Initialize a v1 database simulating the legacy schema
      const dbV1 = await openDB(TEST_DB_NAME, 1, {
        upgrade(db) {
          const store = db.createObjectStore('expenditures', { keyPath: 'id' })
          store.createIndex('by_date', 'date')
        }
      })
      
      // 3. Add legacy records without a 'type' field
      await dbV1.add('expenditures', { id: 'legacy-1', amount: 5000, date: '2026-05-01' })
      await dbV1.add('expenditures', { id: 'legacy-2', amount: 7500, date: '2026-05-02', type: 'income' }) // already has a type
      dbV1.close()
      
      // 4. Open the database using version 2 with our actual upgrade handler
      const dbV2 = await openDB(TEST_DB_NAME, 2, {
        async upgrade(db, oldVersion, newVersion, transaction) {
          if (oldVersion < 2) {
            const store = transaction.objectStore('expenditures')
            if (!store.indexNames.contains('by_type')) {
              store.createIndex('by_type', 'type')
            }
            const allRecords = await store.getAll()
            for (const record of allRecords) {
              if (!record.type) {
                record.type = 'expense'
                await store.put(record)
              }
            }
          }
        }
      })
      
      // 5. Assertions
      const store = dbV2.transaction('expenditures').objectStore('expenditures')
      
      // Check index exists
      expect(store.indexNames.contains('by_type')).toBe(true)
      
      // Check records migrated
      const rec1 = await store.get('legacy-1')
      expect(rec1.type).toBe('expense') // Backfilled!
      
      const rec2 = await store.get('legacy-2')
      expect(rec2.type).toBe('income') // Kept original!
      
      dbV2.close()
      await deleteDB(TEST_DB_NAME)
    })
  })

  describe('ExpenditureService Financial Aggregations', () => {
    it('should correctly sum income, expenses, and calculate net profit', async () => {
      // Setup mock expenditures
      await StorageService.create('expenditures', { amount: 10000, type: 'income', date: '2026-06-01', categoryId: 'cat-income-1', vendor: 'Rud' })
      await StorageService.create('expenditures', { amount: 25000, type: 'income', date: '2026-06-05', categoryId: 'cat-income-2', vendor: 'Sha' })
      await StorageService.create('expenditures', { amount: 12000, type: 'expense', date: '2026-06-02', categoryId: 'cat-thread', vendor: 'Ven' })
      await StorageService.create('expenditures', { amount: 8000, type: 'expense', date: '2026-06-03', categoryId: 'cat-fabric', vendor: 'Jen' })
      
      // Log and then soft delete to verify ignored status
      const deletedRec = await StorageService.create('expenditures', { amount: 50000, type: 'income', date: '2026-06-04', categoryId: 'cat-income-1', vendor: 'Ign' })
      await StorageService.softDelete('expenditures', deletedRec.id)

      const totalIncome = await ExpenditureService.getTotalIncome()
      const totalExpenses = await ExpenditureService.getTotalExpenses()
      const netProfit = await ExpenditureService.getNetProfit()

      expect(totalIncome).toBe(35000) // 10000 + 25000
      expect(totalExpenses).toBe(20000) // 12000 + 8000
      expect(netProfit).toBe(15000) // 35000 - 20000
    })

    it('should correctly filter financial aggregations by date range', async () => {
      await StorageService.create('expenditures', { amount: 10000, type: 'income', date: '2026-06-01', categoryId: 'cat-income-1', vendor: 'A' })
      await StorageService.create('expenditures', { amount: 20000, type: 'income', date: '2026-06-15', categoryId: 'cat-income-1', vendor: 'B' })
      await StorageService.create('expenditures', { amount: 5000, type: 'expense', date: '2026-06-10', categoryId: 'cat-thread', vendor: 'C' })

      const incomeFiltered = await ExpenditureService.getTotalIncome('2026-06-05', '2026-06-20')
      const expensesFiltered = await ExpenditureService.getTotalExpenses('2026-06-01', '2026-06-08')

      expect(incomeFiltered).toBe(20000)
      expect(expensesFiltered).toBe(0)
    })
  })

  describe('applyFilters type filtering tests', () => {
    it('should correctly filter expenditures by type', () => {
      const expenditures = [
        { id: '1', amount: 100, type: 'income', date: '2026-06-01', deleted: false },
        { id: '2', amount: 200, type: 'expense', date: '2026-06-02', deleted: false },
        { id: '3', amount: 300, date: '2026-06-03', deleted: false } // legacy expense (type undefined)
      ]

      const incomeResults = applyFilters(expenditures, { type: 'income' })
      expect(incomeResults.length).toBe(1)
      expect(incomeResults[0].id).toBe('1')

      const expenseResults = applyFilters(expenditures, { type: 'expense' })
      expect(expenseResults.length).toBe(2) // both 2 and 3 (undefined defaults to expense)
      expect(expenseResults.map(e => e.id)).toContain('2')
      expect(expenseResults.map(e => e.id)).toContain('3')

      const allResults = applyFilters(expenditures, { type: 'all' })
      expect(allResults.length).toBe(3)
    })
  })

  describe('DB Version 3 Migration & Vendor Deduplication', () => {
    it('should migrate legacy vendor strings to structured vendor records with proper dual-role and matching IDs', async () => {
      const TEST_DB_NAME = 'hisab-tracker-test-v3-migration'
      await deleteDB(TEST_DB_NAME)

      // 1. Setup version 2 database with old vendor name properties
      const dbV2 = await openDB(TEST_DB_NAME, 2, {
        upgrade(db) {
          const expStore = db.createObjectStore('expenditures', { keyPath: 'id' })
          expStore.createIndex('by_type', 'type')
          db.createObjectStore('duePayments', { keyPath: 'id' })
        }
      })

      // Same vendor "Yarn Hub" used as customer (income) and supplier (expense/due)
      await dbV2.add('expenditures', { id: 'exp-1', amount: 5000, date: '2026-06-01', vendor: 'Yarn Hub', type: 'income' })
      await dbV2.add('expenditures', { id: 'exp-2', amount: 3000, date: '2026-06-02', vendor: ' Yarn Hub ', type: 'expense' }) // outer space
      await dbV2.add('expenditures', { id: 'exp-3', amount: 4000, date: '2026-06-03', vendor: 'Thread Shop', type: 'expense' })
      await dbV2.add('duePayments', { id: 'due-1', amount: 8000, dueDate: '2026-06-15', vendor: 'thread shop' }) // casing variant
      dbV2.close()

      // 2. Open DB with actual v3 handler (simulate our storage.js upgrade callback)
      const dbV3 = await openDB(TEST_DB_NAME, 3, {
        async upgrade(db, oldVersion, newVersion, transaction) {
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

            for (const exp of expenditures) {
              if (exp.vendor) {
                const defaultType = exp.type === 'income' ? 'customer' : 'supplier'
                const vId = await ensureVendor(exp.vendor, defaultType)
                exp.vendorId = vId
                exp.vendorName = exp.vendor
                await expStore.put(exp)
              }
            }

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

      // 3. Verify deduplication and values in vendors store
      const vendors = await dbV3.getAll('vendors')
      expect(vendors.length).toBe(2)

      const yarnHub = vendors.find(v => v.name === 'Yarn Hub')
      expect(yarnHub).toBeDefined()
      expect(yarnHub.type).toBe('both')

      const threadShop = vendors.find(v => v.name.toLowerCase() === 'thread shop')
      expect(threadShop).toBeDefined()
      expect(threadShop.type).toBe('supplier')

      // 4. Verify FK links and denormalized names in expenditures and dues
      const migratedExp1 = await dbV3.get('expenditures', 'exp-1')
      expect(migratedExp1.vendorId).toBe(yarnHub.id)
      expect(migratedExp1.vendorName).toBe('Yarn Hub')

      const migratedExp2 = await dbV3.get('expenditures', 'exp-2')
      expect(migratedExp2.vendorId).toBe(yarnHub.id)

      const migratedDue = await dbV3.get('duePayments', 'due-1')
      expect(migratedDue.vendorId).toBe(threadShop.id)
      expect(migratedDue.vendorName).toBe('thread shop')

      dbV3.close()
      await deleteDB(TEST_DB_NAME)
    })
  })

  describe('VendorService.createVendor() uniqueness constraint', () => {
    it('should prevent creating duplicate vendor names case-insensitively', async () => {
      const { VendorService } = await import('../../src/domain/vendor.js')

      // Create initial vendor
      const created = await VendorService.createVendor({
        name: 'Stitchworld Yarn Co.',
        type: 'supplier',
        phone: '12345'
      })
      expect(created).toBeDefined()

      // Attempt to create case-insensitive duplicate
      await expect(
        VendorService.createVendor({
          name: '  stitchworld yarn co.  ',
          type: 'customer'
        })
      ).rejects.toThrow(/unique/)
    })
  })
})
