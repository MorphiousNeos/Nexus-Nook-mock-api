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

/** Primary mobile destinations, in bar order. A path missing from NAV_ITEMS is skipped. */
const TAB_PATHS = ['/overview', '/fleet', '/trade', '/community']

function MobileTabBar({
  pathname,
  drawerOpen,
  onToggleDrawer,
  onNavigate,
}: {
  pathname: string
  drawerOpen: boolean
  onToggleDrawer: () => void
  onNavigate: () => void
}) {
  const tabs = TAB_PATHS.map((to) => NAV_ITEMS.find((item) => item.to === to)).filter(
    (item): item is (typeof NAV_ITEMS)[number] => Boolean(item),
  )
  if (tabs.length === 0) return null

  const tabClass = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition ${
      active
        ? 'text-purple-200'
        : 'text-slate-400 hover:text-slate-200 active:text-slate-100'
    }`

  return (
    <nav
      aria-label="Primary mobile"
      className="nn-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/70 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1">
        {tabs.map((item) => {
          // The index route renders Overview, so "/" counts as the Overview tab.
          const active =
            !drawerOpen &&
            (pathname === item.to || (item.to === '/overview' && pathname === '/'))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={tabClass(active)}
            >
              <span
                aria-hidden
                className={`grid h-7 w-7 place-items-center rounded-lg border text-base transition ${
                  active
                    ? 'border-purple-600/60 bg-purple-950/60 shadow-inner shadow-purple-900/50'
                    : 'border-transparent'
                }`}
              >
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? 'Close navigation' : 'More destinations'}
          className={tabClass(drawerOpen)}
        >
          <span
            aria-hidden
            className={`grid h-7 w-7 place-items-center rounded-lg border text-base transition ${
              drawerOpen
                ? 'border-purple-600/60 bg-purple-950/60 shadow-inner shadow-purple-900/50'
                : 'border-transparent'
            }`}
          >
            {drawerOpen ? '✕' : '⋯'}
          </span>
          <span className="max-w-full truncate">More</span>
        </button>
      </div>
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

  // Land at the top of each page. Without this the scroll offset carries over,
  // so signing in from the bottom of the landing form opens mid-dashboard.
  // Explicitly instant — the global `scroll-behavior: smooth` would otherwise
  // animate every navigation.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="mx-auto flex w-full max-w-7xl 2xl:max-w-[1400px]">
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
            <div className="fixed inset-x-0 top-[57px] z-40 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-slate-800/70 bg-slate-950/95 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl shadow-black/50">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="mt-5 border-t border-slate-800/70 pt-5">
                <SidebarFooter />
              </div>
            </div>
          </div>
        )}

        <main className="min-h-[60vh] flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        <MobileTabBar
          pathname={location.pathname}
          drawerOpen={mobileOpen}
          onToggleDrawer={() => setMobileOpen((o) => !o)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>
    </div>
  )
}
