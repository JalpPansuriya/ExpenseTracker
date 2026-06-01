import React from 'react'

export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  isDanger = false 
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ position: 'fixed', zIndex: 1000 }}>
      <div className="modal-content">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>{title}</h3>
        <p style={{ marginBottom: '2rem', color: '#555', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
export default ConfirmDialog
