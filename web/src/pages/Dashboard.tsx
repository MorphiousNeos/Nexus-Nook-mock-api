import { useSession } from '../SessionContext'
import { Badge, Button } from '../components/ui'
import DiscordButton from '../components/DiscordButton'
import ProfileCard from './sections/ProfileCard'
import FleetCard from './sections/FleetCard'
import InventoryCard from './sections/InventoryCard'
import ServerStatusCard from './sections/ServerStatusCard'
import OrgCard from './sections/OrgCard'
import TradeCard from './sections/TradeCard'

export default function Dashboard() {
  const { state, isDemo, logout } = useSession()
  const profile = state!.profile

  return (
    <div>
      <header className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Nexus Nook
              </span>
            </span>
            {isDemo && <Badge tone="amber">Demo mode</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {profile.displayName}
              {profile.rsiHandle && (
                <span className="ml-1 text-slate-500">· {profile.rsiHandle}</span>
              )}
            </span>
            <DiscordButton className="px-3 py-1.5 text-xs" />
            <Button variant="ghost" onClick={logout} className="px-3 py-1.5 text-xs">
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">
            Welcome back, {profile.displayName.split(' ')[0] || 'Citizen'}.
          </h1>
          <p className="text-sm text-slate-400">
            Your personal nook in the Nexus.{' '}
            {isDemo && 'Data is stored locally in this browser.'}
          </p>
        </div>

        <div className="mb-5">
          <TradeCard />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ProfileCard />
          <ServerStatusCard />
          <FleetCard />
          <InventoryCard />
          <OrgCard />
        </div>
      </main>
    </div>
  )
}
