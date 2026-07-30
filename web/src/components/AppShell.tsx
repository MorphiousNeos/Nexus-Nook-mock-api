import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../SessionContext'
import { Badge, Button } from './ui'
import DiscordButton from './DiscordButton'
import NavRail from './nav/NavRail'
import NavBottomBar from './nav/NavBottomBar'
import NavDrawer from './nav/NavDrawer'
import { NAV_ITEMS } from '../nav'
import { DISCORD_INVITE } from '../services/store'
import { isActivePath } from './nav/navConfig'

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

/** Account block, stacked. Used inside the mobile overflow sheet. */
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

/**
 * Desktop top bar.
 *
 * A single quiet strip across the content column: where you are on the left,
 * who you are on the right. It exists so account controls have somewhere to
 * belong — without it they floated at the end of the page, anchored to
 * nothing.
 */
function TopBar({ section }: { section: string }) {
  const { isDemo, state, logout } = useSession()
  const profile = state?.profile
  return (
    <header className="sticky top-0 z-30 hidden items-center gap-4 border-b border-line-subtle bg-hull-925/95 px-10 py-3 backdrop-blur lg:flex">
      <span className="font-mono text-label uppercase text-hull-400">{section}</span>
      <span aria-hidden className="h-4 w-px bg-line" />
      <span className="min-w-0 flex-1" />
      {isDemo && (
        <Badge tone="amber" dot>
          Demo mode
        </Badge>
      )}
      {profile && (
        <span className="max-w-[14rem] truncate text-sm text-hull-300">
          {profile.displayName}
        </span>
      )}
      {/* A filled brand button was the loudest thing in the frame. In the top
          bar the invite is a quiet link; it keeps its full treatment on the
          landing page and in the mobile sheet, where it is the actual call to
          action. */}
      {DISCORD_INVITE && (
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-control px-2 py-1 text-xs text-hull-400 transition-colors duration-ui ease-ui hover:text-hull-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-925"
        >
          Discord
        </a>
      )}
      <Button variant="ghost" onClick={logout} className="px-3 py-1.5 text-xs">
        Sign out
      </Button>
    </header>
  )
}

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const sectionLabel =
    NAV_ITEMS.find((item) => isActivePath(location.pathname, item.to))?.label ?? 'Overview'

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
      <aside className="sticky top-0 hidden h-screen w-[6.5rem] shrink-0 flex-col border-r border-line-subtle bg-hull-950 py-5 lg:flex xl:w-28">
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
      <div className="flex min-w-0 flex-1 flex-col bg-hull-950 lg:bg-hull-925">
        {/* Mobile header. Navigation lives at the bottom, so this carries
            identity and the account panel only. */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line-subtle bg-hull-950 px-5 py-3 lg:hidden">
          <Brand />
          <Badge tone="slate">{sectionLabel}</Badge>
        </header>

        <TopBar section={sectionLabel} />

        <main className="min-h-[60vh] flex-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

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
