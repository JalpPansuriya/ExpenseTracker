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
    const bootstrap = async () => {
      try {
        await NotificationSettingsService.initSettings()
        await runDailyCheck()
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
            <Route path="/vendors" element={<VendorsPage />} />
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
          <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <span>Settings</span>
          </NavLink>
        </div>

      </div>
    </Router>
  )
}
export default App
