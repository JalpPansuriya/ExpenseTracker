import React, { useState, useEffect, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export const MonthlyCashFlowChart = ({
  expenditures,
  globalDateFrom,
  globalType,
  onExport
}) => {
  // Extract list of years available in expenditures
  const availableYears = useMemo(() => {
    const years = new Set()
    expenditures.forEach(exp => {
      if (exp.deleted) return
      const yr = exp.date.split('-')[0]
      if (yr) {
        years.add(parseInt(yr, 10))
      }
    })
    
    // Add current year if empty
    if (years.size === 0) {
      years.add(new Date().getFullYear())
    }
    
    return Array.from(years).sort((a, b) => b - a)
  }, [expenditures])

  // Local Year Selector (default to current year or the most recent year with data)
  const defaultYear = useMemo(() => {
    const currentYr = new Date().getFullYear()
    if (availableYears.includes(currentYr)) return currentYr
    return availableYears[0] || currentYr
  }, [availableYears])

  const [selectedYear, setSelectedYear] = useState(defaultYear)

  // Sync year if defaults change or new database records modify availableYears
  useEffect(() => {
    setSelectedYear(defaultYear)
  }, [defaultYear])

  // Global filters synchronization: if a global date range is defined, sync local year to it
  useEffect(() => {
    if (globalDateFrom) {
      const globalYr = parseInt(globalDateFrom.split('-')[0], 10)
      if (globalYr && availableYears.includes(globalYr)) {
        setSelectedYear(globalYr)
      }
    }
  }, [globalDateFrom, availableYears])

  // Aggregate monthly data
  const chartData = useMemo(() => {
    // Initialize 12 months array
    const monthlyData = MONTH_NAMES.map(m => ({
      month: m,
      Income: 0,
      Expenses: 0
    }))

    expenditures.forEach(exp => {
      if (exp.deleted) return
      
      const parts = exp.date.split('-')
      const yr = parseInt(parts[0], 10)
      const mo = parseInt(parts[1], 10) - 1 // 0-indexed

      if (yr === selectedYear && mo >= 0 && mo < 12) {
        const amt = exp.amount / 100 // convert to Rupees
        const type = exp.type || 'expense'
        
        if (type === 'income') {
          monthlyData[mo].Income += amt
        } else {
          monthlyData[mo].Expenses += amt
        }
      }
    })

    // Round values to 2 decimal places
    return monthlyData.map(d => ({
      ...d,
      Income: Number(d.Income.toFixed(2)),
      Expenses: Number(d.Expenses.toFixed(2))
    }))
  }, [expenditures, selectedYear])

  // Check if there is any data in the selected year
  const hasData = useMemo(() => {
    return chartData.some(d => d.Income > 0 || d.Expenses > 0)
  }, [chartData])

  const chartId = 'monthly-cashflow-chart-svg'

  const handleExportClick = () => {
    onExport(chartId, `Monthly_Cash_Flow_${selectedYear}`)
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.75rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.85rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{label} {selectedYear}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, fontWeight: '600', display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span>{p.name}:</span>
              <span>₹{p.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          ))}
          {payload.length === 2 && (
            <div style={{
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-light)',
              fontWeight: '700',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Net Savings:</span>
              <span style={{ color: (payload[0].value - payload[1].value) >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                ₹{(payload[0].value - payload[1].value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-title-wrapper">
          <h3 className="chart-title-text">Monthly Cash Flow</h3>
          <p className="chart-description-text">
            Side-by-side grouped bar chart comparing incoming Revenue vs outgoing Expenses per month.
          </p>
        </div>
        <div className="chart-actions-container">
          <button className="export-png-button" onClick={handleExportClick} disabled={!hasData}>
            📸 Export PNG
          </button>
        </div>
      </div>

      {/* Local Controls Row */}
      <div className="local-filters-panel">
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Select Year:</span>
        <select
          className="local-filter-select"
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
          aria-label="Cash flow year selector"
        >
          {availableYears.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
      </div>

      {/* Chart Render Area */}
      <div className="chart-container-wrapper" id={chartId}>
        {!hasData ? (
          <div className="chart-empty-message">
            <div className="chart-empty-icon">📊</div>
            <div style={{ fontWeight: '600' }}>No Cash Flow Data</div>
            <div style={{ fontSize: '0.8rem' }}>No income or expense records found for the year {selectedYear}.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: '600' }}
                axisLine={{ stroke: 'var(--border-light)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(val) => `₹${val}`}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="rect"
                iconSize={10}
                formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '600' }}>{value}</span>}
              />
              <Bar dataKey="Income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
export default MonthlyCashFlowChart
