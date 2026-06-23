import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../SessionContext'
import { Badge, Button } from './ui'
import DiscordButton from './DiscordButton'
import { NAV_ITEMS } from '../nav'

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <NavLink
      to="/overview"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:opacity-90"
    >
      <img src="./icon.svg" alt="" width={30} height={30} className="h-[30px] w-[30px]" aria-hidden />
      <span className="font-display text-xl font-bold">
        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Nexus Nook
        </span>
      </span>
    </NavLink>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-purple-700/60 bg-purple-950/40 text-purple-100 shadow-inner shadow-purple-950/40'
                : 'border-transparent text-slate-300 hover:border-slate-700/70 hover:bg-slate-800/50 hover:text-slate-100'
            }`
          }
        >
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-700/60 bg-slate-800/50 text-base">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter() {
  const { isDemo, state, logout } = useSession()
  const profile = state?.profile
  return (
    <div className="space-y-3">
      {profile && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
          <p className="truncate text-sm font-medium text-slate-100">{profile.displayName}</p>
          {profile.rsiHandle ? (
            <p className="truncate text-xs text-slate-500">· {profile.rsiHandle}</p>
          ) : (
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
          )}
        </div>
      )}
      {isDemo && (
        <Badge tone="amber" dot>
          Demo mode
        </Badge>
      )}
      <DiscordButton className="w-full px-3 py-2 text-sm" />
      <Button variant="ghost" onClick={logout} className="w-full px-3 py-2 text-sm">
        Sign out
      </Button>
    </div>
  )
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="mx-auto flex w-full max-w-7xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800/70 bg-slate-950/60 px-4 py-5 backdrop-blur lg:flex">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="mt-4 border-t border-slate-800/70 pt-4">
          <SidebarFooter />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/70 bg-slate-950/85 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-200 transition hover:bg-slate-700/60"
          >
            <span className="text-lg" aria-hidden>
              {mobileOpen ? '✕' : '☰'}
            </span>
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden">
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-x-0 top-[57px] z-40 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-slate-800/70 bg-slate-950/95 px-4 py-5 shadow-2xl shadow-black/50">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="mt-5 border-t border-slate-800/70 pt-5">
                <SidebarFooter />
              </div>
            </div>
          </div>
        )}

        <main className="min-h-[60vh] flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
