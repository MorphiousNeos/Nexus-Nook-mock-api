import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider, useSession } from './SessionContext'
import Footer from './components/Footer'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import PrivacyPage from './pages/PrivacyPage'
import OverviewPage from './pages/app/OverviewPage'
import FleetPage from './pages/app/FleetPage'
import TradePage from './pages/app/TradePage'
import InventoryPage from './pages/app/InventoryPage'
import BlueprintsPage from './pages/app/BlueprintsPage'
import HaulingPage from './pages/app/HaulingPage'
import MiningPage from './pages/app/MiningPage'
import OrgPage from './pages/app/OrgPage'
import CommunityPage from './pages/app/CommunityPage'
import ServersPage from './pages/app/ServersPage'
import ProfilePage from './pages/app/ProfilePage'

function Layout() {
  const { ready, state } = useSession()

  if (!ready) {
    return (
      <div className="starfield flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center text-slate-400">
          <span className="animate-pulse font-display tracking-widest">
            INITIALIZING NEXUS LINK…
          </span>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="starfield flex min-h-screen flex-col">
      <div className="flex-1">
        {!state ? (
          // Logged out: always the Landing page; any deep link falls through to it.
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          // Authenticated app shell with nested section routes.
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="trade" element={<TradePage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="blueprints" element={<BlueprintsPage />} />
              <Route path="hauling" element={<HaulingPage />} />
              <Route path="mining" element={<MiningPage />} />
              <Route path="org" element={<OrgPage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="servers" element={<ServersPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="privacy" element={<PrivacyPage />} />
            {/* Unknown authed route → Overview */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  )
}
