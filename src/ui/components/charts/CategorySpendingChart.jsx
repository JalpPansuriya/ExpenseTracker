import React, { useState, useEffect, useMemo } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const COLORS = [
  '#005f73', // deep teal
  '#0a9396', // medium teal
  '#9b5de5', // purple
  '#2a9d8f', // green
  '#f4a261', // amber
  '#e76f51', // orange
  '#e63946', // red
  '#457b9d', // steel blue
  '#f15bb5', // pink
  '#fee440'  // yellow
]

export const CategorySpendingChart = ({
  expenditures,
  categories,
  globalDateFrom,
  globalDateTo,
  globalType,
  onExport
}) => {
  // Local Filters State
  const [localDateFrom, setLocalDateFrom] = useState(globalDateFrom || '')
  const [localDateTo, setLocalDateTo] = useState(globalDateTo || '')
  const [localType, setLocalType] = useState(globalType === 'all' ? 'expense' : globalType)

  // Sync with global filters on change
  useEffect(() => {
    setLocalDateFrom(globalDateFrom || '')
    setLocalDateTo(globalDateTo || '')
  }, [globalDateFrom, globalDateTo])

  useEffect(() => {
    if (globalType === 'all') {
      setLocalType('expense')
    } else {
      setLocalType(globalType)
    }
  }, [globalType])

  // Filter and Aggregate Data
  const chartData = useMemo(() => {
    const filtered = expenditures.filter(exp => {
      if (exp.deleted) return false
      
      // Date filter
      if (localDateFrom && exp.date < localDateFrom) return false
      if (localDateTo && exp.date > localDateTo) return false
      
      // Type filter (income or expense)
      const expType = exp.type || 'expense'
      if (expType !== localType) return false
      
      return true
    })

    // Group by category
    const categoryTotals = {}
    filtered.forEach(exp => {
      const catId = exp.categoryId || 'uncategorized'
      categoryTotals[catId] = (categoryTotals[catId] || 0) + exp.amount
    })

    // Convert to Recharts structure
    return Object.entries(categoryTotals).map(([catId, amount]) => {
      const category = categories.find(c => c.id === catId)
      return {
        id: catId,
        name: category ? `${category.icon} ${category.name}` : '📁 Other/Uncategorized',
        value: Number((amount / 100).toFixed(2)) // convert from paise to rupees
      }
    }).sort((a, b) => b.value - a.value)
  }, [expenditures, categories, localDateFrom, localDateTo, localType])

  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

  const chartId = 'category-spending-chart-svg'

  const handleExportClick = () => {
    onExport(chartId, `Spending_By_Category_${localType}_${new Date().toISOString().split('T')[0]}`)
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percent = totalAmount > 0 ? ((data.value / totalAmount) * 100).toFixed(1) : 0
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.75rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.85rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{payload[0].name}</p>
          <p style={{ color: localType === 'income' ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: '600' }}>
            Amount: ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Percentage: {percent}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-title-wrapper">
          <h3 className="chart-title-text">Spending by Category</h3>
          <p className="chart-description-text">
            Donut chart showing distributions of {localType === 'income' ? 'incoming revenue' : 'outgoing expenses'} by categories.
          </p>
        </div>
        <div className="chart-actions-container">
          <button className="export-png-button" onClick={handleExportClick} disabled={chartData.length === 0}>
            📸 Export PNG
          </button>
        </div>
      </div>

      {/* Local Controls Row */}
      <div className="local-filters-panel">
        <input
          type="date"
          className="local-filter-input"
          value={localDateFrom}
          onChange={e => setLocalDateFrom(e.target.value)}
          aria-label="Start date filter"
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to</span>
        <input
          type="date"
          className="local-filter-input"
          value={localDateTo}
          onChange={e => setLocalDateTo(e.target.value)}
          aria-label="End date filter"
        />
        
        {/* Local Type Toggle Button */}
        <button
          type="button"
          className={`local-toggle-button ${localType === 'expense' ? 'active expense' : ''}`}
          onClick={() => setLocalType('expense')}
        >
          Expenses
        </button>
        <button
          type="button"
          className={`local-toggle-button ${localType === 'income' ? 'active income' : ''}`}
          onClick={() => setLocalType('income')}
        >
          Income
        </button>
      </div>

      {/* Chart Render Area */}
      <div className="chart-container-wrapper" id={chartId}>
        {chartData.length === 0 ? (
          <div className="chart-empty-message">
            <div className="chart-empty-icon">🥯</div>
            <div style={{ fontWeight: '600' }}>No Data Available</div>
            <div style={{ fontSize: '0.8rem' }}>Try adjusting your filters above to see results.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
export default CategorySpendingChart
