import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * The measure every page is set to.
 *
 * Width and padding live here and nowhere else, so two pages cannot drift to
 * different gutters or a different column width — which is precisely what had
 * happened: the dashboard carried its own copy of the container classes.
 *
 * The column is deliberately narrower than the shell. Content that runs the
 * full width of a monitor reads as a web page; content held to a measure reads
 * as an instrument panel.
 */
export default function PageContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const { pathname } = useLocation()
  return (
    <div
      // Keyed on the path so the entrance replays on every navigation.
      key={pathname}
      className={`mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-14 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Page header.
 *
 * Quiet by design — a page announces itself once, in plain type, and then gets
 * out of the way. No gradient fill, no glow, no bordered icon chip: those
 * compete with the content underneath and read as decoration rather than
 * hierarchy.
 */
export function PageHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="nn-page-enter mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 sm:mb-10">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span aria-hidden className="text-xl leading-none opacity-80">
              {icon}
            </span>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-hull-100 sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hull-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}

/** Standard vertical rhythm between the stacked sections of a page body. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="nn-page-enter nn-page-enter-body space-y-6 sm:space-y-8">{children}</div>
}
