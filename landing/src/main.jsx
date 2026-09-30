import React from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './LandingPage.jsx'
import './index.css'
import { language, t } from './i18n'

// Follow the visitor's language (see ./i18n.js) for <html lang>, title and description.
document.documentElement.lang = language === 'pt' ? 'pt-BR' : language
document.title = t.meta.title
document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)

document.documentElement.setAttribute('data-theme', 'fun')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
)
