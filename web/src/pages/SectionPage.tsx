import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/** Shared page chrome: centered container, a clear header, then the body. */
export default function SectionPage({
  icon,
  title,
  description,
  children,
}: {
  icon: string
  title: string
  description: string
  children: ReactNode
}) {
  const { pathname } = useLocation()
  return (
    // Keyed on the path so the entrance animation replays on every navigation.
    <div
      key={pathname}
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-6xl lg:px-8 lg:py-12"
    >
      <header className="nn-page-enter mb-7 flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hull-700/70 bg-hull-800/60 text-2xl shadow-lg shadow-brand-950/20"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="nn-heading-glow bg-gradient-to-r from-blue-300 to-brand-300 bg-clip-text font-display text-2xl font-semibold tracking-tight text-transparent sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-hull-400 lg:text-base">{description}</p>
        </div>
      </header>
      <div className="nn-page-enter nn-page-enter-body">{children}</div>
    </div>
  )
}
