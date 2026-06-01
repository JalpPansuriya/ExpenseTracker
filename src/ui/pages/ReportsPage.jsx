import React, { useState, useEffect } from 'react'
import { ExpenditureService } from '../../domain/expenditure'
import { DuePaymentService } from '../../dues/duePayment'
import { CategoryService } from '../../domain/category'

// Import Chart Components
import CategorySpendingChart from '../components/charts/CategorySpendingChart'
import MonthlyCashFlowChart from '../components/charts/MonthlyCashFlowChart'
import DailySpendingTrendChart from '../components/charts/DailySpendingTrendChart'
import TopVendorsChart from '../components/charts/TopVendorsChart'
import DuePaymentsSummaryChart from '../components/charts/DuePaymentsSummaryChart'

// Import CSS Stylesheet
import '../styles/reports.css'

export const ReportsPage = () => {
  // Data States
  const [expenditures, setExpenditures] = useState([])
  const [categories, setCategories] = useState([])
  const [dues, setDues] = useState([])
  const [loading, setLoading] = useState(true)

  // Global Filters
  const [globalDatePreset, setGlobalDatePreset] = useState('this_month')
  const [globalDateFrom, setGlobalDateFrom] = useState('')
  const [globalDateTo, setGlobalDateTo] = useState('')
  const [globalTypeToggle, setGlobalTypeToggle] = useState('all')

  // Calculate dates based on preset
  const calculatePresetDates = (preset) => {
    const today = new Date()
    const todayStr = today.toLocaleDateString('en-CA') // YYYY-MM-DD
    
    switch (preset) {
      case 'this_month': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA')
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA')
        return { from: first, to: last }
      }
      case 'last_month': {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA')
        const last = new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA')
        return { from: first, to: last }
      }
      case 'last_3_months': {
        const first = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()).toLocaleDateString('en-CA')
        return { from: first, to: todayStr }
      }
      case 'last_6_months': {
        const first = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()).toLocaleDateString('en-CA')
        return { from: first, to: todayStr }
      }
      case 'this_year': {
        const first = new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA')
        const last = new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA')
        return { from: first, to: last }
      }
      case 'custom':
      default:
        return null
    }
  }

  // Load Data on Mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [expList, catList, duesList] = await Promise.all([
          ExpenditureService.listExpenditures(),
          CategoryService.listCategories(true),
          DuePaymentService.listDuePayments()
        ])
        setExpenditures(expList)
        setCategories(catList)
        setDues(duesList)
      } catch (error) {
        console.error('[ReportsPage] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAllData()
  }, [])

  // Sync date ranges when global preset is adjusted
  useEffect(() => {
    const dates = calculatePresetDates(globalDatePreset)
    if (dates) {
      setGlobalDateFrom(dates.from)
      setGlobalDateTo(dates.to)
    }
  }, [globalDatePreset])

  // XMLSerializer SVG to high-resolution PNG download utility
  const exportSvgToPng = (containerId, fileName) => {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error(`Container with ID ${containerId} not found`)
      return
    }
    
    const svgEl = container.querySelector('svg')
    if (!svgEl) {
      console.error(`SVG element not found under container ${containerId}`)
      return
    }

    try {
      // 1. Clone the SVG node to work on it safely
      const clonedSvg = svgEl.cloneNode(true)

      // 2. Set inline styling context (fonts, background colors)
      clonedSvg.setAttribute('style', 'background-color: #ffffff; font-family: "DM Sans", sans-serif;')

      // 3. Extract accurate dimensions
      const width = svgEl.clientWidth || svgEl.getBoundingClientRect().width || 600
      const height = svgEl.clientHeight || svgEl.getBoundingClientRect().height || 350
      clonedSvg.setAttribute('width', width)
      clonedSvg.setAttribute('height', height)

      // 4. Transform node to XML string & Blob URL
      const svgString = new XMLSerializer().serializeToString(clonedSvg)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      // 5. Build Image and Draw onto a Canvas scaled by 2x for sharp outputs (retina screen support)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width * 2
        canvas.height = height * 2
        
        const ctx = canvas.getContext('2d')
        ctx.scale(2, 2)
        
        // Fill canvas with white background (fixes dark mode png transparencies)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height)

        // 6. Export dataURL and trigger native browser download
        const pngUrl = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.href = pngUrl
        downloadLink.download = `${fileName}.png`
        
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        // Revoke Object URL to release memory
        URL.revokeObjectURL(url)
      }
      img.src = url
    } catch (err) {
      console.error('[ReportsPage] Exporting PNG failed:', err)
    }
  }

  return (
    <div className="reports-container">
      {/* Header and Title */}
      <div className="reports-header-section">
        <h2 className="reports-title">
          <span>📊</span> Financial & Analytics Reports
        </h2>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Real-time metrics and dynamic data distributions
        </span>
      </div>

      {/* Global Filters Panel */}
      <div className="global-filters-container">
        <h3 className="global-filters-title">
          <span>⚙️</span> Global Baseline Filters (Applies to all charts)
        </h3>
        
        <div className="global-filters-row">
          {/* Preset Selector */}
          <div className="filter-group">
            <label className="filter-label" htmlFor="global-preset-select">Date Preset</label>
            <select
              id="global-preset-select"
              className="filter-select"
              value={globalDatePreset}
              onChange={e => setGlobalDatePreset(e.target.value)}
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          <div className="filter-group">
            <label className="filter-label">Date Range Scope</label>
            <div className="date-inputs-grid">
              <input
                type="date"
                className="filter-input"
                value={globalDateFrom}
                onChange={e => {
                  setGlobalDateFrom(e.target.value)
                  setGlobalDatePreset('custom')
                }}
                aria-label="Global Start Date"
              />
              <input
                type="date"
                className="filter-input"
                value={globalDateTo}
                onChange={e => {
                  setGlobalDateTo(e.target.value)
                  setGlobalDatePreset('custom')
                }}
                aria-label="Global End Date"
              />
            </div>
          </div>

          {/* Income/Expense Toggle */}
          <div className="filter-group">
            <label className="filter-label">Flow Type Toggle</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-button ${globalTypeToggle === 'all' ? 'active' : ''}`}
                onClick={() => setGlobalTypeToggle('all')}
              >
                All Flow
              </button>
              <button
                type="button"
                className={`toggle-button ${globalTypeToggle === 'income' ? 'active income' : ''}`}
                onClick={() => setGlobalTypeToggle('income')}
              >
                Incoming
              </button>
              <button
                type="button"
                className={`toggle-button ${globalTypeToggle === 'expense' ? 'active expense' : ''}`}
                onClick={() => setGlobalTypeToggle('expense')}
              >
                Outgoing
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          fontFamily: 'var(--font-family-heading)',
          fontWeight: '700',
          color: 'var(--text-secondary)'
        }}>
          📊 Collating financial data structures...
        </div>
      ) : (
        /* Grid of Charts */
        <div className="charts-layout-grid">
          {/* Chart 1 — Spending by Category */}
          <CategorySpendingChart
            expenditures={expenditures}
            categories={categories}
            globalDateFrom={globalDateFrom}
            globalDateTo={globalDateTo}
            globalType={globalTypeToggle}
            onExport={exportSvgToPng}
          />

          {/* Chart 4 — Top Vendors */}
          <TopVendorsChart
            expenditures={expenditures}
            globalDateFrom={globalDateFrom}
            globalDateTo={globalDateTo}
            globalType={globalTypeToggle}
            onExport={exportSvgToPng}
          />

          {/* Chart 2 — Monthly Cash Flow */}
          <MonthlyCashFlowChart
            expenditures={expenditures}
            globalDateFrom={globalDateFrom}
            globalType={globalTypeToggle}
            onExport={exportSvgToPng}
          />

          {/* Chart 3 — Daily Spending Trend */}
          <DailySpendingTrendChart
            expenditures={expenditures}
            globalDateFrom={globalDateFrom}
            onExport={exportSvgToPng}
          />

          {/* Chart 5 — Due Payments Summary (Full Width) */}
          <div className="full-width-chart">
            <DuePaymentsSummaryChart
              dues={dues}
              onExport={exportSvgToPng}
            />
          </div>
        </div>
      )}
    </div>
  )
}
export default ReportsPage
