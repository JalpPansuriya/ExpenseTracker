import React, { useState, useEffect, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { VendorService } from '../../../domain/vendor'

export const TopVendorsChart = ({
  expenditures,
  globalDateFrom,
  globalDateTo,
  globalType,
  onExport
}) => {
  // Vendor List State for resolving vendorId
  const [vendorsList, setVendorsList] = useState([])
  const [loading, setLoading] = useState(true)

  // Local Filters
  const [localDateFrom, setLocalDateFrom] = useState(globalDateFrom || '')
  const [localDateTo, setLocalDateTo] = useState(globalDateTo || '')
  const [localType, setLocalType] = useState(globalType === 'all' ? 'expense' : globalType)

  // Load vendors list from VendorService
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const list = await VendorService.listVendors(true) // include archived
        setVendorsList(list)
      } catch (err) {
        console.error('[TopVendorsChart] Failed to load vendors list:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchVendors()
  }, [])

  // Synchronize local states with global updates
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
    if (loading) return []

    // Build a lookup map of vendorId -> vendorName
    const vendorMap = new Map(vendorsList.map(v => [v.id, v.name]))

    const filtered = expenditures.filter(exp => {
      if (exp.deleted) return false

      // Date range filter
      if (localDateFrom && exp.date < localDateFrom) return false
      if (localDateTo && exp.date > localDateTo) return false

      // Income / Expense type filter
      const expType = exp.type || 'expense'
      if (expType !== localType) return false

      return true
    })

    // Group and aggregate by resolved vendor name
    const vendorTotals = {}
    filtered.forEach(exp => {
      let vendorName = 'Unknown Vendor'
      if (exp.vendorId) {
        vendorName = vendorMap.get(exp.vendorId) || exp.vendorName || exp.vendor || 'Unknown Vendor'
      } else {
        vendorName = exp.vendorName || exp.vendor || 'Unknown Vendor'
      }

      vendorTotals[vendorName] = (vendorTotals[vendorName] || 0) + exp.amount
    })

    // Convert, sort, and slice to Top 10
    return Object.entries(vendorTotals)
      .map(([name, amount]) => ({
        name,
        value: Number((amount / 100).toFixed(2)) // convert paise to Rupees
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [expenditures, vendorsList, loading, localDateFrom, localDateTo, localType])

  const chartId = 'top-vendors-chart-svg'

  const handleExportClick = () => {
    onExport(chartId, `Top_10_Vendors_${localType}_${new Date().toISOString().split('T')[0]}`)
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.6rem 0.8rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.85rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{data.name}</p>
          <p style={{ color: localType === 'income' ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: '600' }}>
            Total: ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <h3 className="chart-title-text">Top 10 Vendors</h3>
          <p className="chart-description-text">
            Horizontal bar chart showing the highest-ranking vendors / customer clients by total {localType === 'income' ? 'incoming' : 'outgoing'} flow.
          </p>
        </div>
        <div className="chart-actions-container">
          <button className="export-png-button" onClick={handleExportClick} disabled={chartData.length === 0 || loading}>
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
        {loading ? (
          <div className="chart-empty-message">
            <div style={{ fontWeight: '600' }}>Loading vendors list...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty-message">
            <div className="chart-empty-icon">🤝</div>
            <div style={{ fontWeight: '600' }}>No Vendor Records</div>
            <div style={{ fontSize: '0.8rem' }}>No matching logs found in this scope.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
              <XAxis
                type="number"
                tickFormatter={(val) => `₹${val}`}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fill: 'var(--text-primary)', fontSize: 10, fontWeight: '600' }}
                axisLine={{ stroke: 'var(--border-light)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill={localType === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
export default TopVendorsChart
