import { StorageService } from '../data/storage'
import { DEFAULT_NOTIFICATION_SETTINGS } from '../data/schema'

export const NotificationSettingsService = {
  async getSettings() {
    let settings = await StorageService.getSingleton('notificationSettings')
    if (!settings) {
      await this.initSettings()
      settings = await StorageService.getSingleton('notificationSettings')
    }
    return settings
  },

  async updateSettings(changes) {
    const current = await this.getSettings()
    const updated = {
      ...current,
      ...changes
    }
    return await StorageService.setSingleton('notificationSettings', updated)
  },

  async initSettings() {
    const existing = await StorageService.getSingleton('notificationSettings')
    if (!existing) {
      await StorageService.setSingleton('notificationSettings', DEFAULT_NOTIFICATION_SETTINGS)
    }
  }
}
