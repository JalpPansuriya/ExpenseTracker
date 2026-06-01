import { StorageService } from '../data/storage'
import { NotificationSettingsService } from './settings'

export const NotificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser')
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      await NotificationSettingsService.updateSettings({ permissionState: permission })
      return permission
    } catch (error) {
      console.error('[NotificationService] Error requesting permission:', error)
      return 'default'
    }
  },

  async getPermissionState() {
    if (!('Notification' in window)) {
      return 'denied'
    }
    const permission = Notification.permission
    await NotificationSettingsService.updateSettings({ permissionState: permission })
    return permission
  },

  async sendNotification(payload) {
    const settings = await NotificationSettingsService.getSettings()
    const permissionState = await this.getPermissionState()
    if (!settings.enabled || permissionState !== 'granted') {
      return
    }

    // Try service worker notification first (supports standard actions and URL redirection)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        if (registration) {
          await registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/pwa-192x192.png',
            tag: payload.tag,
            data: payload.data
          })
          return
        }
      } catch (error) {
        console.warn('[NotificationService] SW ready failed, falling back to window Notification:', error)
      }
    }

    // Fallback standard notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        tag: payload.tag
      })
    }
  },

  async cancelNotifications(duePaymentId) {
    try {
      // Set all notified flags to true so scheduler won't trigger notifications for this paid/cancelled due payment
      await StorageService.update('duePayments', duePaymentId, {
        notifiedLeadDay: true,
        notifiedDueDay: true,
        notifiedOverdue: true
      })
    } catch (error) {
      console.error(`[NotificationService] Error cancelling notifications for ID ${duePaymentId}:`, error)
    }
  },

  async sendTestNotification() {
    await this.sendNotification({
      title: 'Test Notification 🧵',
      body: 'Notifications are working! You will receive reminders for embroidery dues.',
      tag: 'test-notification',
      data: { url: '/settings' }
    })
  }
}

