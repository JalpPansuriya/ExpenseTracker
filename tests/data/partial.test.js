import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { DuePaymentService } from '../../src/dues/duePayment.js'
import { StorageService, dbPromise } from '../../src/data/storage.js'

describe('MarkAsPaidSheet Behavior', () => {
  beforeEach(async () => {
    const db = await dbPromise
    const tx = db.transaction(['duePayments', 'expenditures', 'categories', 'vendors'], 'readwrite')
    await tx.objectStore('duePayments').clear()
    await tx.objectStore('expenditures').clear()
    await tx.objectStore('categories').clear()
    await tx.objectStore('vendors').clear()
    await tx.done
  })

  it('should process UI float values correctly', async () => {
    await StorageService.create('categories', { id: 'test-cat', name: 'Test Cat' })
    await StorageService.create('vendors', { id: 'test-ven', name: 'Test Ven', type: 'both' })

    const due = await StorageService.create('duePayments', {
      amount: 43198, // 431.98 INR
      dueDate: '2026-06-10',
      title: 'Test Due',
      categoryId: 'test-cat',
      vendorId: 'test-ven',
      vendorName: 'test',
    })

    console.log("Original due amount:", due.amount)

    // User types "10.50" into the form
    const formInputValue = "10.50"
    
    // Simulate what MarkAsPaidSheet does
    const overrides = {
      amount: Number(formInputValue), // 10.5
      date: '2026-06-06',
      paymentMethod: 'upi',
      notes: '',
      receiptId: null
    }

    await DuePaymentService.markAsPaid(due.id, overrides)

    const updatedDue = await StorageService.getById('duePayments', due.id)
    console.log("Updated due amount:", updatedDue.amount)
    console.log("Updated due paidAt:", updatedDue.paidAt)
  })
})
