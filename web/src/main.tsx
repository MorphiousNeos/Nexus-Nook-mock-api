import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { captureOAuthRedirect } from './services/ApiStore'
import './index.css'

// Must run before the router mounts: pulls a Discord OAuth token out of the
// URL hash (and scrubs it) so the session bootstrap below sees it.
const oauthError = captureOAuthRedirect()
if (oauthError) sessionStorage.setItem('nexus-nook:oauth-error', oauthError)

// Installable app: register the service worker (production builds only, so
// dev servers never fight a stale cache).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
