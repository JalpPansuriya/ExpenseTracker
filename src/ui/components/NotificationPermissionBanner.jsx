import React, { useState, useEffect } from 'react'
import { NotificationService } from '../../notifications/notificationService'

export const NotificationPermissionBanner = () => {
  const [permission, setPermission] = useState('default')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setPermission(NotificationService.getPermissionState())
  }, [])

  if (permission !== 'default' || !visible) return null

  const handleEnable = async () => {
    const result = await NotificationService.requestPermission()
    setPermission(result)
  }

  return (
    <div style={{
      backgroundColor: '#e5f1ff',
      color: '#0066cc',
      padding: '1rem 1.5rem',
      borderRadius: 'var(--radius-md)',
      border: '1px solid #cce3ff',
      marginBottom: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ color: '#004499', marginBottom: '0.25rem', fontFamily: 'var(--font-family-heading)' }}>
            🔔 Stay on Top of Upcoming Payments
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#0055b3', lineHeight: '1.4' }}>
            Enable browser notifications to receive friendly reminders 5 days before a payment is due, on the due date, and if a payment goes overdue.
          </p>
        </div>
        <button 
          style={{
            background: 'none',
            border: 'none',
            color: '#0066cc',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            lineHeight: '1'
          }}
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" onClick={handleEnable}>
          Enable Notifications
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setVisible(false)}>
          Later
        </button>
      </div>
    </div>
  )
}
export default NotificationPermissionBanner
