import React from 'react'

export const PriorityBadge = ({ priority }) => {
  const normalized = (priority || 'medium').toLowerCase()
  
  return (
    <span className={`badge priority-${normalized}`}>
      {normalized}
    </span>
  )
}
export default PriorityBadge
