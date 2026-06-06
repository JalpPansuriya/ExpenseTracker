import React, { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom'
import { NotificationSettingsService } from './notifications/settings'
import { injectDependencies } from './dues/duePayment'
import { ExpenditureService } from './domain/expenditure'
import { NotificationService } from './notifications/notificationService'
import { runDailyCheck } from './notifications/scheduler'

import DashboardPage from './ui/pages/DashboardPage'
import ExpensesPage from './ui/pages/ExpensesPage'
import AddEditPage from './ui/pages/AddEditPage'
import DuesPage from './ui/pages/DuesPage'
import AddEditDuePage from './ui/pages/AddEditDuePage'
import CategoriesPage from './ui/pages/CategoriesPage'
import VendorsPage from './ui/pages/VendorsPage'
import SettingsPage from './ui/pages/SettingsPage'
import ReportsPage from './ui/pages/ReportsPage'
import VendorDetailPage from './ui/pages/VendorDetailPage'

// Import Backup Service and Toast Component
import { BackupService } from './data/storage'
import { ToastContainer, showToast } from './ui/components/Toast'

// Import styling tokens
import './ui/styles/tokens.css'
import './ui/styles/app.css'

// Bootstrap wiring and dependency injection
injectDependencies({
  createExpenditureFromDue: ExpenditureService.createExpenditureFromDue,
  cancelNotifications: NotificationService.cancelNotifications
})

export const App = () => {
  useEffect(() => {
    const runWeeklyBackupCheck = async () => {
      try {
        const lastBackupStr = await BackupService.getLastBackupAt()
        
        let shouldBackup = false
        if (!lastBackupStr) {
          shouldBackup = true
        } else {
          const lastBackup = new Date(lastBackupStr)
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
          if (new Date() - lastBackup >= sevenDaysInMs) {
            shouldBackup = true
          }
        }

        if (shouldBackup) {
          const d = new Date()
          const YYYY = d.getFullYear()
          const MM = String(d.getMonth() + 1).padStart(2, '0')
          const DD = String(d.getDate()).padStart(2, '0')
          const HH = String(d.getHours()).padStart(2, '0')
          const Min = String(d.getMinutes()).padStart(2, '0')
          const timestamp = `${YYYY}-${MM}-${DD}-${HH}-${Min}`

          const blob = await BackupService.exportJSON()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `HisabTracker-Backup-${timestamp}.json`
          a.click()
          URL.revokeObjectURL(url)

          await BackupService.updateLastBackupAt(d.toISOString())

          showToast(`Weekly backup downloaded — HisabTracker-Backup-${timestamp}.json`, 6000)
        }
      } catch (err) {
        console.error('[Backup Check] Failed to run weekly backup:', err)
      }
    }

    const bootstrap = async () => {
      try {
        await NotificationSettingsService.initSettings()
        await runDailyCheck()
        await runWeeklyBackupCheck()
      } catch (error) {
        console.error('[App] Error during startup bootstrap:', error)
      }
    }
    bootstrap()
  }, [])

  return (
    <Router>
      <div className="app-container">
        
        {/* Navigation Bar */}
        <nav className="navbar">
          <Link to="/" className="navbar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span>🪡</span> HisabTracker
          </Link>
          <div className="navbar-links">
            <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/expenses" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Expenses
            </NavLink>
            <NavLink to="/dues" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Due Payments
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Reports
            </NavLink>
            <NavLink to="/vendors" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Vendors
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Categories
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Settings
            </NavLink>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/expenses/new" element={<AddEditPage />} />
            <Route path="/expenses/:id/edit" element={<AddEditPage />} />
            <Route path="/dues" element={<DuesPage />} />
            <Route path="/dues/new" element={<AddEditDuePage />} />
            <Route path="/dues/:id/edit" element={<AddEditDuePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/vendors/:id" element={<VendorDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Bottom Nav Bar for Mobile Touch Devices */}
        <div className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>🏠</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>💵</span>
            <span>Expenses</span>
          </NavLink>
          <NavLink to="/dues" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <span>Dues</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            <span>Reports</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <span>Settings</span>
          </NavLink>
        </div>

        {/* Toast Notification Container */}
        <ToastContainer />

      </div>
    </Router>
  )
}
export default App
