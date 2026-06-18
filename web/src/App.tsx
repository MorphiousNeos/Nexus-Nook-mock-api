import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider, useSession } from './SessionContext'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

function Layout() {
  const { ready } = useSession()

  return (
    <div className="starfield flex min-h-screen flex-col">
      <div className="flex-1">
        {!ready ? (
          <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
            <span className="animate-pulse font-display tracking-widest">
              INITIALIZING NEXUS LINK…
            </span>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<RequireSession />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <Footer />
    </div>
  )
}

function RequireSession() {
  const { state } = useSession()
  if (!state) return <Navigate to="/" replace />
  return <Dashboard />
}

export default function App() {
  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  )
}
