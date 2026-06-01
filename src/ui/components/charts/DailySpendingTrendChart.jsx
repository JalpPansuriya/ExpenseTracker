import React, { useState, useEffect, useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
]

export const DailySpendingTrendChart = ({
  expenditures,
  globalDateFrom,
  onExport
}) => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Local States
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Derive dynamic list of years from expenditures
  const availableYears = useMemo(() => {
    const years = new Set()
    expenditures.forEach(exp => {
      if (exp.deleted) return
      const yr = exp.date.split('-')[0]
      if (yr) {
        years.add(parseInt(yr, 10))
      }
    })
    
    // Add current and default years
    years.add(currentYear)
    
    return Array.from(years).sort((a, b) => b - a)
  }, [expenditures, currentYear])

  // Sync month & year with globalDateFrom if defined
  useEffect(() => {
    if (globalDateFrom) {
      const parts = globalDateFrom.split('-')
      const yr = parseInt(parts[0], 10)
      const mo = parseInt(parts[1], 10) - 1 // 0-indexed
      
      if (yr) setSelectedYear(yr)
      if (mo >= 0 && mo < 12) setSelectedMonth(mo)
    }
  }, [globalDateFrom])

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate()
  }, [selectedYear, selectedMonth])

  // Aggregate day-by-day expenses
  const chartData = useMemo(() => {
    const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      Amount: 0
    }))

    expenditures.forEach(exp => {
      if (exp.deleted) return
      
      // We only track "spending" (expenses) in this trend chart
      const type = exp.type || 'expense'
      if (type !== 'expense') return

      const parts = exp.date.split('-')
      const yr = parseInt(parts[0], 10)
      const mo = parseInt(parts[1], 10) - 1
      const dy = parseInt(parts[2], 10)

      if (yr === selectedYear && mo === selectedMonth && dy >= 1 && dy <= daysInMonth) {
        dailyExpenses[dy - 1].Amount += (exp.amount / 100) // convert from paise to Rupees
      }
    })

    // Format decimal numbers
    return dailyExpenses.map(d => ({
      ...d,
      Amount: Number(d.Amount.toFixed(2))
    }))
  }, [expenditures, selectedMonth, selectedYear, daysInMonth])

  // Check if there are any expenses in this month
  const hasExpenses = useMemo(() => {
    return chartData.some(d => d.Amount > 0)
  }, [chartData])

  const totalMonthlySpend = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.Amount, 0)
  }, [chartData])

  const chartId = 'daily-spending-trend-chart-svg'

  const handleExportClick = () => {
    const monthLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || 'Month'
    onExport(chartId, `Daily_Spending_Trend_${monthLabel}_${selectedYear}`)
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.75rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.85rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
            {label} {monthLabel} {selectedYear}
          </p>
          <p style={{ color: 'var(--color-expense)', fontWeight: '600' }}>
            Spent: ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-title-wrapper">
          <h3 className="chart-title-text">Daily Spending Trend</h3>
          <p className="chart-description-text">
            Line chart displaying daily outlays (Expenses only) across a selected month.
          </p>
        </div>
        <div className="chart-actions-container">
          <button className="export-png-button" onClick={handleExportClick} disabled={!hasExpenses}>
            📸 Export PNG
          </button>
        </div>
      </div>

      {/* Local Controls Row */}
      <div className="local-filters-panel">
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Select Month:</span>
        <select
          className="local-filter-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
          aria-label="Daily trend month selector"
        >
          {MONTH_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Select Year:</span>
        <select
          className="local-filter-select"
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
          aria-label="Daily trend year selector"
        >
          {availableYears.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>

        {hasExpenses && (
          <span style={{ fontSize: '0.8rem', marginLeft: 'auto', fontWeight: '700', color: 'var(--primary)' }}>
            Total: ₹{totalMonthlySpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Chart Render Area */}
      <div className="chart-container-wrapper" id={chartId}>
        {!hasExpenses ? (
          <div className="chart-empty-message">
            <div className="chart-empty-icon">📈</div>
            <div style={{ fontWeight: '600' }}>No Expenses Logged</div>
            <div style={{ fontSize: '0.8rem' }}>
              No outlays recorded in {MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label} {selectedYear}.
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--text-primary)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--border-light)' }}
                tickLine={false}
                tickFormatter={(val) => `Day ${val}`}
              />
              <YAxis
                tickFormatter={(val) => `₹${val}`}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="Amount"
                name="Spent"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 2, fill: 'var(--primary)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--primary-light)', strokeWidth: 1, stroke: '#ffffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
export default DailySpendingTrendChart
