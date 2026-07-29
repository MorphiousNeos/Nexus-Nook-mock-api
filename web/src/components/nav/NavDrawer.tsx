import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../nav'
import { isActivePath, overflowGroups } from './navConfig'

/**
 * Mobile overflow sheet: everything the bottom bar has no room for, in the
 * same groups the desktop rail uses.
 *
 * Rises from the bottom edge so it meets the thumb where the control that
 * opened it sits. Dismisses on Escape or a tap outside, and moves focus into
 * the sheet on open so keyboard and screen-reader users are not stranded
 * behind it.
 */
export default function NavDrawer({
  open,
  pathname,
  onClose,
  footer,
}: {
  open: boolean
  pathname: string
  onClose: () => void
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-hull-950/70"
      />
      <div
        id="nav-drawer"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="All destinations"
        className="nn-sheet absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-card border-t border-line bg-hull-900 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] focus:outline-none"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line-subtle bg-hull-900 px-4 py-3">
          <h2 className="font-mono text-label uppercase text-hull-400">
            All destinations
          </h2>
          <span aria-hidden className="h-px flex-1 bg-line-subtle/70" />
        </div>

        <div className="px-3 py-3">
          {overflowGroups().map((group, index) => (
            <section key={group.id} className={index > 0 ? 'mt-5' : ''}>
              <h3 className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-hull-400">
                {group.caption}
              </h3>
              <ul className="grid grid-cols-2 gap-2">
                {group.paths.map((to) => {
                  const item = NAV_ITEMS.find((i) => i.to === to)
                  if (!item) return null
                  const active = isActivePath(pathname, to)
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-control border px-3 py-2.5 transition-colors duration-ui ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-hull-900 ${
                          active
                            ? 'border-brand-500 bg-hull-800 text-hull-100'
                            : 'border-line-subtle text-hull-300 hover:bg-hull-800 hover:text-hull-100'
                        }`}
                      >
                        <span aria-hidden className="text-base leading-none">
                          {item.icon}
                        </span>
                        <span className="min-w-0 truncate text-sm font-medium">
                          {item.label}
                        </span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          {footer && (
            <div className="mt-6 border-t border-line-subtle pt-4">{footer}</div>
          )}
        </div>
      </div>
    </div>
  )
}
