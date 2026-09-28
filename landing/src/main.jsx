import React from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './LandingPage.jsx'
import './index.css'

// URL do app Expo (web). Configure VITE_APP_URL no .env da landing.
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8081'

document.documentElement.setAttribute('data-theme', 'fun')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LandingPage
      onStart={() => { window.location.href = APP_URL }}
      onLogin={() => { window.location.href = APP_URL }}
      onToggleTheme={null}
    />
  </React.StrictMode>,
)
