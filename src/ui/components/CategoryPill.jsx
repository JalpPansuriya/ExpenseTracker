import React from 'react'

export const CategoryPill = ({ category }) => {
  if (!category) {
    return <span className="badge priority-low">🏷️ Uncategorized</span>
  }

  return (
    <span 
      className="badge priority-medium" 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.25rem',
        textTransform: 'none',
        fontWeight: '600'
      }}
    >
      <span>{category.icon || '🏷️'}</span>
      <span>{category.name}</span>
    </span>
  )
}
export default CategoryPill
