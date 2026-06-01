import { StorageService } from '../data/storage'
import { shouldNotifyLeadDay, shouldNotifyDueDay, shouldNotifyOverdue } from '../dues/dueStatus'
import { NotificationService } from './notificationService'
import { NotificationSettingsService } from './settings'

export const runDailyCheck = async () => {
  try {
    const settings = await NotificationSettingsService.getSettings()
    if (!settings.enabled) {
      console.log('[Scheduler] Notifications are disabled in settings.')
      return
    }

    const permission = await NotificationService.getPermissionState()
    if (permission !== 'granted') {
      console.log('[Scheduler] Notification permission not granted.')
      return
    }

    const today = new Date().toLocaleDateString('en-CA')
    const allDues = await StorageService.getAll('duePayments')
    const duePayments = allDues.filter(d => !d.paidAt && !d.deleted)
    const categories = await StorageService.getAll('categories')

    for (const due of duePayments) {
      const category = categories.find(c => c.id === due.categoryId)
      const categoryName = category ? category.name : 'Uncategorized'
      const formattedAmount = (due.amount / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      
      const basePayload = {
        icon: '/pwa-192x192.png',
        data: { url: '/dues', duePaymentId: due.id }
      }

      if (shouldNotifyLeadDay(due, today)) {
        await NotificationService.sendNotification({
          ...basePayload,
          title: `Payment Due in ${due.reminderLeadDays} Days ⏳`,
          body: `${due.vendor} — ₹${formattedAmount} — ${categoryName}`,
          tag: `due-${due.id}-lead`
        })
        await StorageService.update('duePayments', due.id, { notifiedLeadDay: true })
      } 
      else if (shouldNotifyDueDay(due, today)) {
        await NotificationService.sendNotification({
          ...basePayload,
          title: `Payment Due Today! 🚨`,
          body: `${due.vendor} — ₹${formattedAmount} — ${categoryName}`,
          tag: `due-${due.id}-today`
        })
        await StorageService.update('duePayments', due.id, { notifiedDueDay: true })
      } 
      else if (shouldNotifyOverdue(due, today)) {
        await NotificationService.sendNotification({
          ...basePayload,
          title: `Payment Overdue! 🔴`,
          body: `${due.vendor} — ₹${formattedAmount} — ${categoryName}`,
          tag: `due-${due.id}-overdue`
        })
        await StorageService.update('duePayments', due.id, { notifiedOverdue: true })
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error running daily sync check:', error)
  }
}

// Wire SW Periodic Sync listener
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PERIODIC_SYNC_TRIGGER') {
      console.log('[Scheduler] Triggered from Service Worker periodic sync!')
      runDailyCheck()
    }
  })
}
