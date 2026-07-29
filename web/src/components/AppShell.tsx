import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../SessionContext'
import { Badge, Button } from './ui'
import DiscordButton from './DiscordButton'
import NavRail from './nav/NavRail'
import NavBottomBar from './nav/NavBottomBar'
import NavDrawer from './nav/NavDrawer'

/**
 * Application shell.
 *
 * Navigation is three surfaces sharing one config: a rail on desktop, a bottom
 * bar on mobile, and an overflow sheet for what the bar cannot hold. The shell
 * owns only the layout and the drawer's open state; each surface decides how
 * it renders.
 */

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <NavLink
      to="/overview"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-control px-1 py-1 transition-opacity duration-ui ease-ui hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-950"
    >
      <img
        src="./icon.svg"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7"
        aria-hidden
      />
      <span className="font-display text-base font-bold tracking-tight text-hull-100">
        Nexus Nook
      </span>
    </NavLink>
  )
}

/** Account block: identity, then the two account-level actions. */
function AccountPanel() {
  const { isDemo, state, logout } = useSession()
  const profile = state?.profile
  return (
    <div className="space-y-3">
      {profile && (
        <div className="rounded-control border border-line-subtle bg-hull-900 px-3 py-2">
          <p className="truncate text-sm font-medium text-hull-100">
            {profile.displayName}
          </p>
          <p className="truncate text-xs text-hull-400">
            {profile.rsiHandle ? `· ${profile.rsiHandle}` : profile.email}
          </p>
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Close the overflow sheet whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Land at the top of each page. Without this the scroll offset carries over,
  // so signing in from the bottom of the landing form opens mid-dashboard.
  // Explicitly instant — the global `scroll-behavior: smooth` would otherwise
  // animate every navigation.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  // The sheet covers the viewport, so the page behind it should not scroll.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  return (
    <div className="mx-auto flex w-full max-w-7xl 2xl:max-w-[1400px]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[6.5rem] shrink-0 flex-col border-r border-line-subtle bg-hull-950 py-4 lg:flex xl:w-28">
        <div className="px-2 pb-4">
          <NavLink
            to="/overview"
            aria-label="Nexus Nook — overview"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-ui ease-ui hover:bg-hull-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-950"
          >
            <img src="./icon.svg" alt="" width={28} height={28} className="h-7 w-7" aria-hidden />
          </NavLink>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <NavRail pathname={location.pathname} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header. Navigation lives at the bottom, so this carries
            identity and the account panel only. */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line-subtle bg-hull-950 px-4 py-3 lg:hidden">
          <Brand />
          <Badge tone="slate">{location.pathname.replace('/', '') || 'overview'}</Badge>
        </header>

        <main className="min-h-[60vh] flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        {/* Account actions sit at the end of the desktop column; on mobile they
            live in the overflow sheet, where the rest of the chrome is. */}
        <div className="hidden px-6 pb-6 lg:block">
          <div className="ml-auto w-64">
            <AccountPanel />
          </div>
        </div>

        <NavBottomBar
          pathname={location.pathname}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((o) => !o)}
          onNavigate={closeDrawer}
        />

        <NavDrawer
          open={drawerOpen}
          pathname={location.pathname}
          onClose={closeDrawer}
          footer={<AccountPanel />}
        />
      </div>
    </div>
  )
}
