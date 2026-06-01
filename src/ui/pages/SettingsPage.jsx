import React, { useState, useEffect } from 'react'
import { BackupService } from '../../data/storage'
import { NotificationSettingsService } from '../../notifications/settings'
import { NotificationService } from '../../notifications/notificationService'
import { showToast } from '../components/Toast'

export const SettingsPage = () => {
  const [settings, setSettings] = useState({ enabled: true, defaultLeadDays: 5, permissionState: 'default' })
  const [permission, setPermission] = useState('default')
  const [leadDays, setLeadDays] = useState('5')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const current = await NotificationSettingsService.getSettings()
      setSettings(current)
      setLeadDays(current.defaultLeadDays.toString())
      setPermission(await NotificationService.getPermissionState())
    }
    loadData()
  }, [])

  const handleSettingsSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const days = Number(leadDays)
    if (isNaN(days) || days < 1 || days > 30 || !Number.isInteger(days)) {
      setError('Lead days must be a whole number between 1 and 30')
      return
    }

    try {
      const updated = await NotificationSettingsService.updateSettings({
        enabled: settings.enabled,
        defaultLeadDays: days
      })
      setSettings(updated)
      setSuccess('Notification settings saved!')
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    }
  }

  const handleToggleNotifications = async () => {
    const nextState = !settings.enabled
    setSettings({ ...settings, enabled: nextState })
    await NotificationSettingsService.updateSettings({ enabled: nextState })
  }

  const handleRequestPermission = async () => {
    const res = await NotificationService.requestPermission()
    setPermission(res)
    setSettings(prev => ({ ...prev, permissionState: res }))
  }

  const handleSendTestNotification = async () => {
    setError('')
    setSuccess('')
    if (permission !== 'granted') {
      setError('Please enable browser notification permissions first.')
      return
    }
    await NotificationService.sendTestNotification()
    setSuccess('Test notification dispatched!')
  }

  // Backup actions
  const handleExportBackup = async () => {
    try {
      const d = new Date()
      const YYYY = d.getFullYear()
      const MM = String(d.getMonth() + 1).padStart(2, '0')
      const DD = String(d.getDate()).padStart(2, '0')
      const HH = String(d.getHours()).padStart(2, '0')
      const Min = String(d.getMinutes()).padStart(2, '0')
      const timestamp = `${YYYY}-${MM}-${DD}-${HH}-${Min}`

      const blob = await BackupService.exportJSON()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `HisabTracker-Backup-${timestamp}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Update last backup timestamp to synchronize weekly check
      await BackupService.updateLastBackupAt(d.toISOString())

      showToast(`Weekly backup downloaded — HisabTracker-Backup-${timestamp}.json`, 6000)
      setSuccess('Backup exported successfully!')
    } catch (err) {
      setError('Backup export failed: ' + err.message)
    }
  }

  const handleImportBackup = async (e) => {
    setError('')
    setSuccess('')
    const file = e.target.files[0]
    if (!file) return

    try {
      const res = await BackupService.importJSON(file)
      if (res.success) {
        setSuccess(`Backup restored successfully! Imported ${res.count.expenditures} expenditures, ${res.count.categories} categories, and ${res.count.duePayments} due records.`)
        // Re-load settings page states
        const current = await NotificationSettingsService.getSettings()
        setSettings(current)
        setLeadDays(current.defaultLeadDays.toString())
      }
    } catch (err) {
      setError('Failed to restore backup: ' + err.message)
    }
    // Reset file input
    e.target.value = ''
  }

  return (
    <div className="app-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-family-heading)', fontWeight: '800', marginBottom: '1.5rem' }}>
        Settings & Controls ⚙️
      </h2>

      {error && <div className="form-error" style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#ffeef0', borderRadius: 'var(--radius-sm)' }}>⚠️ {error}</div>}
      {success && <div style={{ color: 'var(--status-paid)', fontSize: '0.85rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#e2f4f2', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>✓ {success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Notification Settings */}
        <div className="card">
          <h3 className="card-title">Browser Notification Rules 🔔</h3>
          
          {/* Permission status indicator */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1rem', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-light)',
            marginBottom: '1.25rem' 
          }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>System Permission:</span>
              <div style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '1rem', marginTop: '0.15rem' }}>
                {permission === 'granted' ? '🟢 Granted' : permission === 'denied' ? '🔴 Blocked' : '🟡 Unconfigured'}
              </div>
            </div>
            
            {permission !== 'granted' && (
              <button className="btn btn-primary btn-sm" onClick={handleRequestPermission}>
                Enable Permission
              </button>
            )}
          </div>

          <form onSubmit={handleSettingsSave}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.15rem' }}>Enable Notifications</label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Receive periodic upcoming payment alerts
                </span>
              </div>
              <input 
                type="checkbox" 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                checked={settings.enabled}
                onChange={handleToggleNotifications}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Global Default Lead Days</label>
              <input 
                type="number" 
                min="1" 
                max="30"
                className="form-control"
                value={leadDays}
                onChange={e => setLeadDays(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                How many days in advance to send notifications for standard dues (1 to 30 days, default is 5).
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Save Settings
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ flex: 1 }}
                onClick={handleSendTestNotification}
                disabled={permission !== 'granted'}
              >
                Send Test Alert
              </button>
            </div>
          </form>
        </div>

        {/* Database backup */}
        <div className="card">
          <h3 className="card-title">Database Storage & Backups 💾</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>📥 Import / Restore Backup</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Restore all categories, expenditures, and dues from a previously downloaded <code>.json</code> file.
              </p>
              <input 
                type="file" 
                accept=".json"
                className="form-control"
                onChange={handleImportBackup}
                style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>📤 Export Backup File</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Download all local data as a secure backup JSON file to store safely on your computer.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleExportBackup} style={{ width: '100%' }}>
                Download Backup Now
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
export default SettingsPage
