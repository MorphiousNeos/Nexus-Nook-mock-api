import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/**
 * Console section rule: a short accent stroke, a monospace label, and a
 * hairline running to the edge. Repeating this one shape is what makes a page
 * scan as a single instrument panel rather than a stack of unrelated cards.
 *
 * `live` marks a band whose data moves on its own.
 */
export function SectionLabel({ children, live }: { children: string; live?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden
        className={`h-px w-8 bg-gradient-to-r to-transparent ${
          live ? 'from-accent-400' : 'from-brand-500'
        }`}
      />
      <h2 className="font-mono text-label uppercase text-hull-400">{children}</h2>
      {live && (
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent-300">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400 motion-reduce:animate-none"
          />
          Live
        </span>
      )}
      <span aria-hidden className="h-px flex-1 bg-line-subtle/70" />
    </div>
  )
}

export function Card({
  title,
  icon,
  action,
  children,
  className = '',
}: {
  title?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`group relative overflow-hidden rounded-card border border-line-subtle/80 bg-hull-900/60 p-5 shadow-card backdrop-blur transition-colors duration-ui ease-ui hover:border-line/80 sm:p-6 lg:p-7 ${className}`}
    >
      {/* Subtle top edge highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-60"
      />
      {title && (
        <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control border border-line/70 bg-hull-800/60 text-base">
              {icon}
            </span>
          )}
          <h2 className="font-display text-lg font-semibold tracking-wide text-hull-100">
            {title}
          </h2>
          <span aria-hidden className="hidden h-px flex-1 bg-line-subtle/70 sm:block" />
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition duration-snap ease-ui focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-hull-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-blue-600 to-brand-600 text-white shadow-lg shadow-brand-900/30 hover:from-blue-500 hover:to-brand-500 hover:shadow-brand-800/40 focus:ring-brand-500',
    ghost:
      'border border-hull-700 bg-hull-800/50 text-hull-200 hover:bg-hull-700/60 hover:border-hull-600 focus:ring-hull-500',
    danger:
      'border border-danger-900/60 bg-danger-950/40 text-danger-300 hover:bg-danger-900/40 focus:ring-danger-600',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-label uppercase text-hull-400">
        {label}
      </span>
      <input
        className="w-full rounded-control border border-line bg-hull-950/60 px-3 py-2 text-sm text-hull-100 placeholder-hull-500 transition duration-snap ease-ui focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-hull-500">{hint}</span>}
    </label>
  )
}

export function Badge({
  children,
  tone = 'slate',
  dot = false,
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'purple'
  dot?: boolean
}) {
  const tones: Record<string, string> = {
    slate: 'bg-hull-700/50 text-hull-300 border-hull-600',
    green: 'bg-positive-900/40 text-positive-300 border-positive-700/60',
    amber: 'bg-caution-900/40 text-caution-300 border-caution-700/60',
    red: 'bg-danger-900/40 text-danger-300 border-danger-700/60',
    purple: 'bg-brand-900/40 text-brand-200 border-brand-700/60',
  }
  const dotTones: Record<string, string> = {
    slate: 'bg-hull-400',
    green: 'bg-positive-400',
    amber: 'bg-caution-400',
    red: 'bg-danger-400',
    purple: 'bg-brand-300',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} aria-hidden />
      )}
      {children}
    </span>
  )
}

/** `title` and `action` are optional — callers may pass only children. */
export function EmptyState({
  children,
  icon,
  title,
  action,
}: {
  children: ReactNode
  icon?: ReactNode
  title?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hull-700/70 bg-hull-950/40 px-4 py-8 text-center text-sm text-hull-500 sm:py-10">
      {icon && (
        <span
          aria-hidden
          className="nn-empty-glow mb-1 grid h-16 w-16 place-items-center text-3xl opacity-90 sm:h-20 sm:w-20 sm:text-4xl"
        >
          {icon}
        </span>
      )}
      {title && (
        <p className="font-display text-base font-semibold tracking-wide text-hull-200 sm:text-lg">
          {title}
        </p>
      )}
      <p className="max-w-sm">{children}</p>
      {action && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  )
}

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`nn-skeleton rounded-md ${className}`} aria-hidden />
}
