import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Custom Service Worker Registration with Periodic Sync support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Vite-plugin-pwa outputs build SW at /sw.js in production, and maps in dev
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[ServiceWorker] Registered with scope: ', registration.scope)

        // Request Periodic Sync if supported
        if ('periodicSync' in registration) {
          registration.periodicSync.register('daily-due-check', {
            minInterval: 24 * 60 * 60 * 1000 // once a day
          }).then(() => {
            console.log('[ServiceWorker] Periodic sync "daily-due-check" registered!')
          }).catch((error) => {
            console.warn('[ServiceWorker] Periodic sync could not be registered: ', error)
          })
        }
      })
      .catch((error) => {
        console.error('[ServiceWorker] Registration failed: ', error)
      })
  })
}
