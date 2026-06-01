import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export const DuePaymentsSummaryChart = ({ dues, onExport }) => {
  // Aggregate dues by status
  const chartData = useMemo(() => {
    let overdueCount = 0, overdueTotal = 0
    let dueSoonCount = 0, dueSoonTotal = 0
    let upcomingCount = 0, upcomingTotal = 0

    dues.forEach(due => {
      // Ignore paid or deleted dues
      if (due.status === 'paid' || due.deleted) return

      const amt = due.amount / 100 // convert to Rupees

      if (due.status === 'overdue') {
        overdueCount++
        overdueTotal += amt
      } else if (due.status === 'due_soon') {
        dueSoonCount++
        dueSoonTotal += amt
      } else if (due.status === 'upcoming') {
        upcomingCount++
        upcomingTotal += amt
      }
    })

    return [
      {
        status: '🚨 Overdue',
        'Payments Count': overdueCount,
        'Total Amount (₹)': Number(overdueTotal.toFixed(2)),
        color: 'var(--status-overdue)'
      },
      {
        status: '⏳ Due Soon',
        'Payments Count': dueSoonCount,
        'Total Amount (₹)': Number(dueSoonTotal.toFixed(2)),
        color: 'var(--status-due-soon)'
      },
      {
        status: '📅 Upcoming',
        'Payments Count': upcomingCount,
        'Total Amount (₹)': Number(upcomingTotal.toFixed(2)),
        color: 'var(--status-paid)' // use green for upcoming
      }
    ]
  }, [dues])

  const hasData = useMemo(() => {
    return chartData.some(d => d['Payments Count'] > 0)
  }, [chartData])

  const chartId = 'due-payments-summary-chart-svg'

  const handleExportClick = () => {
    onExport(chartId, `Due_Payments_Summary_${new Date().toISOString().split('T')[0]}`)
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.75rem',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.85rem'
        }}>
          <p style={{ fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{data.status}</p>
          <p style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
            <span>Count:</span>
            <span>{data['Payments Count']} items</span>
          </p>
          <p style={{ color: 'var(--accent)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
            <span>Total:</span>
            <span>₹{data['Total Amount (₹)'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <h3 className="chart-title-text">Due Payments Summary</h3>
          <p className="chart-description-text">
            Double Y-axis bar chart comparing the total item counts vs total rupee amounts for Overdue, Due Soon, and Upcoming payments.
          </p>
        </div>
        <div className="chart-actions-container">
          <button className="export-png-button" onClick={handleExportClick} disabled={!hasData}>
            📸 Export PNG
          </button>
        </div>
      </div>

      {/* Grid of quick summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--border-light)'
      }}>
        {chartData.map((d, index) => (
          <div key={index} style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '0.6rem',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `3.5px solid ${d.color}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{d.status.split(' ')[1]}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>{d['Payments Count']} <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>items</span></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: d.color }}>₹{d['Total Amount (₹)'].toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      {/* Chart Render Area */}
      <div className="chart-container-wrapper" id={chartId}>
        {!hasData ? (
          <div className="chart-empty-message">
            <div className="chart-empty-icon">📅</div>
            <div style={{ fontWeight: '600' }}>No Pending Due Payments</div>
            <div style={{ fontSize: '0.8rem' }}>Great job! You have no outstanding or upcoming payments.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis
                dataKey="status"
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: '600' }}
                axisLine={{ stroke: 'var(--border-light)' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
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
              <Bar yAxisId="left" dataKey="Payments Count" fill="var(--primary-light)" name="Count (Left Y-Axis)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Total Amount (₹)" fill="var(--accent)" name="Total (Right Y-Axis)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
export default DuePaymentsSummaryChart
