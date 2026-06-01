import React from 'react'

export const getSpendByCategory = (expenditures, categories = []) => {
  const categoryMap = {}
  
  // Initialize map
  categories.forEach(cat => {
    categoryMap[cat.id] = {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      value: 0 // stored in paise, we'll convert to float for charting
    }
  })

  // Aggregate
  expenditures.forEach(exp => {
    if (exp.deleted) return
    if (!categoryMap[exp.categoryId]) {
      categoryMap[exp.categoryId] = {
        categoryId: exp.categoryId,
        name: 'Unknown',
        icon: '🏷️',
        value: 0
      }
    }
    categoryMap[exp.categoryId].value += exp.amount
  })

  // Convert to float (INR) and filter out zero values
  return Object.values(categoryMap)
    .map(item => ({
      ...item,
      value: Number((item.value / 100).toFixed(2))
    }))
    .filter(item => item.value > 0)
}

export const getMonthlySpendTrend = (expenditures) => {
  const months = {}
  
  // Get list of last 12 months in YYYY-MM format
  const today = new Date()
  const last12Months = []
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthKey = d.toISOString().slice(0, 7) // YYYY-MM
    const monthName = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    last12Months.push({ key: monthKey, name: monthName, total: 0 })
    months[monthKey] = 0
  }

  // Aggregate
  expenditures.forEach(exp => {
    if (exp.deleted) return
    const expMonth = exp.date.slice(0, 7) // YYYY-MM
    if (months[expMonth] !== undefined) {
      months[expMonth] += exp.amount
    }
  })

  // Format
  return last12Months.map(m => ({
    name: m.name,
    total: Number((months[m.key] / 100).toFixed(2))
  }))
}

export const getSparklineData = (expenditures, limit = 10) => {
  const dailyMap = {}
  
  expenditures.forEach(exp => {
    if (exp.deleted) return
    dailyMap[exp.date] = (dailyMap[exp.date] || 0) + exp.amount
  })

  // Sort dates
  const sortedDates = Object.keys(dailyMap).sort()
  const recentDates = sortedDates.slice(-limit)

  return recentDates.map(date => ({
    date,
    amount: Number((dailyMap[date] / 100).toFixed(2))
  }))
}

export const getDuesByStatusDistribution = (duePayments) => {
  let overdue = 0
  let dueSoon = 0
  let upcoming = 0

  duePayments.forEach(due => {
    if (due.deleted || due.paidAt) return
    if (due.status === 'overdue') overdue++
    else if (due.status === 'due_soon') dueSoon++
    else upcoming++
  })

  return [
    { name: 'Overdue', value: overdue, color: '#e63946' },
    { name: 'Due Soon', value: dueSoon, color: '#f4a261' },
    { name: 'Upcoming', value: upcoming, color: '#2a9d8f' }
  ].filter(item => item.value > 0)
}

export const getDashboardSummary = (expenditures) => {
  const today = new Date()
  const thisMonthKey = today.toISOString().slice(0, 7) // YYYY-MM
  
  let totalIncome = 0
  let totalExpenses = 0
  
  expenditures.forEach(exp => {
    if (exp.deleted) return
    const expMonth = exp.date.slice(0, 7)
    if (expMonth === thisMonthKey) {
      if (exp.type === 'income') {
        totalIncome += exp.amount
      } else {
        totalExpenses += exp.amount
      }
    }
  })
  
  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses
  }
}

export const MonthlyBarChart = ({ showIncomeExpense, expenditures = [] }) => {
  // Generate last 12 months array
  const today = new Date()
  const last12Months = []
  const monthsData = {}

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthKey = d.toISOString().slice(0, 7) // YYYY-MM
    const monthName = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    last12Months.push({ key: monthKey, name: monthName })
    monthsData[monthKey] = { income: 0, expense: 0 }
  }

  expenditures.forEach(exp => {
    if (exp.deleted) return
    const expMonth = exp.date.slice(0, 7)
    if (monthsData[expMonth] !== undefined) {
      if (exp.type === 'income') {
        monthsData[expMonth].income += exp.amount
      } else {
        monthsData[expMonth].expense += exp.amount
      }
    }
  })

  const trendData = last12Months.map(m => {
    const data = monthsData[m.key]
    return {
      name: m.name,
      income: Number((data.income / 100).toFixed(2)),
      expense: Number((data.expense / 100).toFixed(2)),
      netProfit: Number(((data.income - data.expense) / 100).toFixed(2))
    }
  })

  if (trendData.length === 0) return null

  // Determine max value for scaling
  const allValues = trendData.flatMap(t => {
    if (showIncomeExpense) {
      return [t.income, t.expense, Math.abs(t.netProfit)]
    }
    return [t.expense]
  })
  const maxVal = Math.max(...allValues, 1)
  
  const chartHeight = 150
  const padding = 20

  return (
    <div style={{ marginTop: '1rem' }}>
      <svg viewBox="0 0 500 180" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* Definitions for Gradients */}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-light)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(142, 71%, 55%)" />
            <stop offset="100%" stopColor="var(--color-income)" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(0, 84%, 70%)" />
            <stop offset="100%" stopColor="var(--color-expense)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
          <line
            key={idx}
            x1="30"
            y1={padding + (1 - r) * chartHeight}
            x2="480"
            y2={padding + (1 - r) * chartHeight}
            stroke="#e9e9e9"
            strokeDasharray="4 4"
          />
        ))}

        {/* Bars */}
        {trendData.map((item, idx) => {
          const x = 40 + idx * 37

          if (showIncomeExpense) {
            const barWidth = 11
            const incomeHeight = (item.income / maxVal) * chartHeight
            const incomeY = padding + chartHeight - incomeHeight

            const expenseHeight = (item.expense / maxVal) * chartHeight
            const expenseY = padding + chartHeight - expenseHeight

            return (
              <g key={idx}>
                {/* Income bar */}
                <rect
                  x={x}
                  y={incomeY}
                  width={barWidth}
                  height={incomeHeight}
                  fill="url(#incomeGradient)"
                  rx="2"
                  style={{ transition: 'all 0.5s ease-out' }}
                >
                  <title>{`Income: ₹${item.income.toFixed(2)}`}</title>
                </rect>
                {/* Expense bar */}
                <rect
                  x={x + 13}
                  y={expenseY}
                  width={barWidth}
                  height={expenseHeight}
                  fill="url(#expenseGradient)"
                  rx="2"
                  style={{ transition: 'all 0.5s ease-out' }}
                >
                  <title>{`Expense: ₹${item.expense.toFixed(2)}`}</title>
                </rect>
                {/* Month Label */}
                <text
                  x={x + 12}
                  y={padding + chartHeight + 15}
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                >
                  {item.name}
                </text>
              </g>
            )
          } else {
            const barWidth = 24
            const barHeight = (item.expense / maxVal) * chartHeight
            const y = padding + chartHeight - barHeight

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={padding}
                  width={barWidth}
                  height={chartHeight}
                  fill="#f4f1de"
                  rx="3"
                  opacity="0.3"
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="3"
                  style={{ transition: 'all 0.5s ease-out' }}
                >
                  <title>{`Spend: ₹${item.expense.toFixed(2)}`}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={padding + chartHeight + 15}
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                >
                  {item.name}
                </text>
              </g>
            )
          }
        })}

        {/* Net Profit Line Overlay (only when showIncomeExpense is true) */}
        {showIncomeExpense && (
          <>
            {/* Line path */}
            <path
              d={trendData.map((item, idx) => {
                const cx = 40 + idx * 37 + 12
                const cy = padding + chartHeight - (item.netProfit / maxVal) * chartHeight
                return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`
              }).join(' ')}
              fill="none"
              stroke="var(--color-profit-positive)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'all 0.5s ease-out' }}
            />

            {/* Dots on points */}
            {trendData.map((item, idx) => {
              const cx = 40 + idx * 37 + 12
              const cy = padding + chartHeight - (item.netProfit / maxVal) * chartHeight
              const isPositive = item.netProfit >= 0
              const dotColor = isPositive ? 'var(--color-profit-positive)' : 'var(--color-profit-negative)'

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={dotColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  style={{ transition: 'all 0.5s ease-out', cursor: 'pointer' }}
                >
                  <title>{`Net Profit: ₹${item.netProfit.toFixed(2)}`}</title>
                </circle>
              )
            })}
          </>
        )}
      </svg>
    </div>
  )
}
