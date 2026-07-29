import { NavLink } from 'react-router-dom'
import { PRIMARY_PATHS, isActivePath, itemsFor } from './navConfig'

/**
 * Mobile bottom navigation.
 *
 * Four thumb-reachable destinations plus an overflow control. Sits above the
 * home indicator via safe-area padding, and the app's main column reserves
 * matching space so content is never hidden behind it.
 *
 * Active state is a top-edge indicator and a colour change — flat, matte, and
 * legible at a glance without a glow.
 */
export default function NavBottomBar({
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
  const items = itemsFor(PRIMARY_PATHS)
  if (items.length === 0) return null

  const cell =
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 pb-1.5 pt-2 transition-colors duration-ui ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-950'

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-subtle bg-hull-950 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch gap-1 px-2">
        {items.map((item) => {
          const active = !drawerOpen && isActivePath(pathname, item.to)
          return (
            <li key={item.to} className="flex min-w-0 flex-1">
              <NavLink
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`${cell} ${active ? 'text-hull-100' : 'text-hull-400'}`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-3 top-0 h-0.5 rounded-control transition-colors duration-ui ease-ui ${
                    active ? 'bg-brand-400' : 'bg-transparent'
                  }`}
                />
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                <span className="max-w-full truncate text-[11px] font-medium leading-none">
                  {item.label}
                </span>
              </NavLink>
            </li>
          )
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-expanded={drawerOpen}
            aria-controls="nav-drawer"
            className={`${cell} ${drawerOpen ? 'text-hull-100' : 'text-hull-400'}`}
          >
            <span
              aria-hidden
              className={`absolute inset-x-3 top-0 h-0.5 rounded-control transition-colors duration-ui ease-ui ${
                drawerOpen ? 'bg-brand-400' : 'bg-transparent'
              }`}
            />
            <span aria-hidden className="text-lg leading-none">
              {drawerOpen ? '✕' : '⋯'}
            </span>
            <span className="max-w-full truncate text-[11px] font-medium leading-none">
              {drawerOpen ? 'Close' : 'More'}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
