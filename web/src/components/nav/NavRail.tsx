import { NavLink } from 'react-router-dom'
import { NAV_GROUPS, isActivePath, itemsFor } from './navConfig'

/**
 * Desktop navigation rail.
 *
 * Narrow by design: a stacked icon and micro-label per destination, grouped
 * under captions with hairline rules. Thirteen destinations in a flat list
 * have no shape, so the grouping is the hierarchy.
 *
 * The active state is a flat surface change plus a hard-edged indicator on the
 * leading edge — no inner shadow, no glow, no gradient. Matte throughout.
 */
export default function NavRail({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Primary" className="w-full">
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.id} className={groupIndex > 0 ? 'mt-5' : ''}>
          {groupIndex > 0 && (
            <span aria-hidden className="mb-3 block h-px bg-line-subtle/70" />
          )}
          <h2 className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-hull-400">
            {group.caption}
          </h2>
          <ul className="space-y-0.5">
            {itemsFor(group.paths).map((item) => {
              const active = isActivePath(pathname, item.to)
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    className={`relative flex flex-col items-center gap-1 rounded-control px-1 py-2.5 transition-colors duration-ui ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-950 ${
                      active
                        ? 'bg-hull-800 text-hull-100'
                        : 'text-hull-400 hover:bg-hull-900 hover:text-hull-200'
                    }`}
                  >
                    {/* Leading-edge indicator: the whole active signal, kept flat. */}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-control transition-colors duration-ui ease-ui ${
                        active ? 'bg-brand-400' : 'bg-transparent'
                      }`}
                    />
                    <span aria-hidden className="text-lg leading-none">
                      {item.icon}
                    </span>
                    <span className="w-full truncate text-center text-[11px] font-medium leading-tight">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
