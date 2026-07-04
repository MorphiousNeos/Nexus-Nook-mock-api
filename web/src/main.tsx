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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
