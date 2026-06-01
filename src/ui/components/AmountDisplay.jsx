import React from 'react'

export const AmountDisplay = ({ amount, className = '' }) => {
  // Amount is in paise, convert to float for display
  const rupees = amount / 100
  
  const formatted = rupees.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <span className={`amount-text ${className}`}>
      {formatted}
    </span>
  )
}
export default AmountDisplay
