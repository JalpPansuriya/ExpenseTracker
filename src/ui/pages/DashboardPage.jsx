import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExpenditureService } from '../../domain/expenditure'
import { DuePaymentService } from '../../dues/duePayment'
import { CategoryService } from '../../domain/category'
import { StorageService } from '../../data/storage'
import { getSpendByCategory, getSparklineData, getDashboardSummary, MonthlyBarChart } from '../../reports/charts'
import AmountDisplay from '../components/AmountDisplay'
import DuePaymentWidget from '../components/DuePaymentWidget'
import CategoryPill from '../components/CategoryPill'
import NotificationPermissionBanner from '../components/NotificationPermissionBanner'

export const DashboardPage = () => {
  const [expenditures, setExpenditures] = useState([])
  const [categories, setCategories] = useState([])

  const handleDebugClick = async () => {
    try {
      const summary = await DuePaymentService.getDueSummary()
      const allDues = await StorageService.getAll('duePayments')
      console.log('DEBUG BUTTON CLICKED!')
      console.log('DuePaymentService.getDueSummary() returns:', summary)
      console.log("StorageService.getAll('duePayments') returns:", allDues)
      alert(`Debug logged. Dues count in DB: ${allDues.length}. Summary overdue: ${summary.overdueCount}, due soon: ${summary.dueSoonCount}, upcoming: ${summary.upcomingCount}`)
    } catch (err) {
      console.error('Debug click failed:', err)
      alert('Debug click failed: ' + err.message)
    }
  }

  const [dueSummary, setDueSummary] = useState({
    overdueCount: 0,
    overdueTotal: 0,
    dueSoonCount: 0,
    dueSoonTotal: 0,
    upcomingCount: 0
  })
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const exps = await ExpenditureService.listExpenditures()
        const cats = await CategoryService.listCategories(true)
        setExpenditures(exps)
        setCategories(cats)
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const load = async () => {
      const summary = await DuePaymentService.getDueSummary()
      setDueSummary(summary)
    }
    load()
  }, [])

  const { totalIncome, totalExpenses, netProfit } = getDashboardSummary(expenditures)
  const spendByCategory = getSpendByCategory(expenditures, categories)
  const recentExpenses = expenditures.slice(0, 5)

  const hasPendingDues = Number(dueSummary.overdueCount || 0) > 0 || 
                         Number(dueSummary.dueSoonCount || 0) > 0 || 
                         Number(dueSummary.upcomingCount || 0) > 0

  // Custom SVG Donut Chart Renderer (Beautiful & Clean)
  const renderCategoryDonut = () => {
    if (spendByCategory.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
          No data for selected period
        </div>
      )
    }

    const total = spendByCategory.reduce((sum, item) => sum + item.value, 0)
    let accumulatedAngle = 0
    const radius = 50
    const cx = 80
    const cy = 80
    const circumference = 2 * Math.PI * radius

    // Premium Color Palette for Categories
    const colors = ['#005f73', '#0a9396', '#9b5de5', '#f4a261', '#2a9d8f', '#e76f51', '#e9c46a', '#457b9d', '#264653', '#72efdd']

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f4f1de" strokeWidth="20" />
          {spendByCategory.map((item, idx) => {
            const percentage = item.value / total
            const strokeLength = percentage * circumference
            const strokeOffset = circumference - strokeLength + accumulatedAngle
            accumulatedAngle -= strokeLength
            const color = colors[idx % colors.length]

            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="20"
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            )
          })}
          {/* Center Text */}
          <circle cx={cx} cy={cy} r={radius - 12} fill="#ffffff" />
          <text x={cx} y={cy - 2} fontSize="9" fontWeight="700" fill="var(--text-secondary)" textAnchor="middle">
            TOTAL AMOUNT
          </text>
          <text x={cx} y={cy + 12} fontSize="12" fontWeight="800" fill="var(--text-primary)" textAnchor="middle">
            ₹{total > 100000 ? `${(total/1000).toFixed(0)}k` : total.toFixed(0)}
          </text>
        </svg>

        <div style={{ flex: '1', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {spendByCategory.map((item, idx) => {
            const color = colors[idx % colors.length]
            const percentage = ((item.value / total) * 100).toFixed(0)
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                  <span>{item.icon} {item.name}</span>
                </span>
                <span style={{ fontWeight: '700' }}>{percentage}%</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <NotificationPermissionBanner />

      {/* Hero Summary Widget Grid (Income, Expenses, Net Profit) */}
      <div className="dashboard-grid grid-three-col" style={{ marginBottom: '1.5rem' }}>
        {/* Total Income Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-income)', backgroundColor: 'var(--color-income-bg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
            💚 Monthly Income
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <AmountDisplay amount={totalIncome} className="bold" style={{ fontSize: '2rem', color: 'var(--color-income)' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            This calendar month
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-expense)', backgroundColor: 'var(--color-expense-bg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
            🔴 Monthly Expenses
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <AmountDisplay amount={totalExpenses} className="bold" style={{ fontSize: '2rem', color: 'var(--color-expense)' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            This calendar month
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="card" style={{
          borderLeft: `4px solid ${netProfit >= 0 ? 'var(--color-profit-positive)' : 'var(--color-profit-negative)'}`,
          backgroundColor: netProfit >= 0 ? 'hsl(217, 91%, 95%)' : 'var(--color-expense-bg)',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
            🔵 Net Profit
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <AmountDisplay
              amount={netProfit}
              className="bold"
              style={{
                fontSize: '2rem',
                color: netProfit >= 0 ? 'var(--color-profit-positive)' : 'var(--color-profit-negative)'
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {netProfit >= 0 ? 'Surplus (Profit) 📈' : 'Deficit (Loss) 📉'}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Monthly Trend Chart Card */}
        <div className="card">
          <div className="card-title">
            <span>Monthly Cash Flow & Net Profit 📊</span>
          </div>
          <MonthlyBarChart showIncomeExpense={true} expenditures={expenditures} />
        </div>

        {/* Due Payments Widget */}
        {hasPendingDues === false ? (
          <div className="card">
            <div className="card-title">
              <span>Due Payments Overview ⏳</span>
              <Link to="/dues" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                View All Dues →
              </Link>
            </div>
            <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>All caught up! No pending dues.</span>
            </div>
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleDebugClick} style={{ padding: '0.4rem 0.8rem' }}>
                🐛 Debug Dues
              </button>
              <Link to="/dues/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', textAlign: 'center', flexGrow: 1 }}>
                + Add New Due Payment
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <DuePaymentWidget summary={dueSummary} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDebugClick} style={{ alignSelf: 'center' }}>
              🐛 Debug Dues
            </button>
          </div>
        )}
      </div>

      <div className="dashboard-grid grid-three-col">
        {/* Category Breakdown Donut Card */}
        <div className="card">
          <div className="card-title">
            <span>Amount by Category 🧵</span>
          </div>
          {renderCategoryDonut()}
        </div>

        {/* Recent Transactions Card */}
        <div className="card">
          <div className="card-title">
            <span>Recent Transactions 📝</span>
            <Link to="/expenses" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
              View All
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
              No transactions logged yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentExpenses.map(exp => {
                const cat = categories.find(c => c.id === exp.categoryId)
                const isIncome = exp.type === 'income'
                return (
                  <div 
                    key={exp.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.6rem 0.75rem', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-light)',
                      borderLeft: `3px solid ${isIncome ? 'var(--color-income)' : 'var(--color-expense)'}`,
                      backgroundColor: 'var(--bg-primary)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                        <span className="badge" style={{
                          backgroundColor: isIncome ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                          color: isIncome ? 'var(--color-income)' : 'var(--color-expense)',
                          fontSize: '0.65rem',
                          padding: '0.1rem 0.3rem',
                          marginRight: '0.4rem',
                          borderRadius: '2px',
                          fontWeight: '800'
                        }}>
                          {isIncome ? 'IN' : 'OUT'}
                        </span>
                        {exp.vendor}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <CategoryPill category={cat} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{exp.date}</span>
                      </div>
                    </div>
                    <div>
                      <AmountDisplay 
                        amount={exp.amount} 
                        className="bold" 
                        style={{ fontSize: '0.95rem', color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }} 
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <Link to="/expenses/new" className="btn btn-primary btn-sm" style={{ width: '100%', textDecoration: 'none', textAlign: 'center' }}>
              + Add Transaction
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default DashboardPage
