import React from 'react'

export const EmptyState = ({ icon = '🔍', message, children }) => {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <p style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '1rem' }}>{message}</p>
      {children}
    </div>
  )
}
export default EmptyState
