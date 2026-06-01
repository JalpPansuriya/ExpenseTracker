import React, { useState, useEffect } from 'react'
import '../styles/toast.css'

let toastListener = null

/**
 * Triggers a global toast notification.
 * @param {string} message - Message to display inside toast
 * @param {number} duration - Duration in milliseconds (default 5000)
 */
export const showToast = (message, duration = 5000) => {
  if (toastListener) {
    toastListener(message, duration)
  } else {
    console.warn('[Toast] showToast called before ToastContainer was mounted:', message)
  }
}

export const ToastContainer = () => {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    toastListener = (message, duration) => {
      setToast({ message, id: Date.now() })
      
      // Auto-dismiss the toast
      setTimeout(() => {
        setToast(prev => {
          if (prev && prev.message === message) {
            return null
          }
          return prev
        })
      }, duration)
    }

    return () => {
      toastListener = null
    }
  }, [])

  if (!toast) return null

  return (
    <div className="toast-container-root">
      <div className="toast-message-card">
        <span className="toast-message-icon">💾</span>
        <span>{toast.message}</span>
      </div>
    </div>
  )
}

export default ToastContainer
