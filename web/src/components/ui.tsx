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
      // A card is a plane resting above the page, so elevation carries it and
      // the edge only needs to be a hairline. The decorative top highlight is
      // gone: repeated on every card it read as ornament, not structure.
      className={`group relative overflow-hidden rounded-card border border-line-subtle bg-hull-900 p-5 shadow-card transition-colors duration-ui ease-ui hover:border-line sm:p-6 lg:p-7 ${className}`}
    >
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
  variant?: 'primary' | 'ghost' | 'danger' | 'quiet'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition duration-snap ease-ui focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-hull-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
  const variants: Record<string, string> = {
    // Flat fills. A primary action should read as a solid control, not a
    // painted one — the gradient here was the loudest thing on most screens.
    primary:
      'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500',
    ghost:
      'border border-line bg-hull-800 text-hull-200 hover:bg-hull-700 hover:border-line-strong focus:ring-hull-500',
    danger:
      'border border-danger-900/60 bg-danger-950/40 text-danger-300 hover:bg-danger-900/40 focus:ring-danger-600',
    // Administrative actions — remove, clear, reset. These sat in bordered red
    // panels beside every row, which made deleting a ship look more important
    // than the ship. Now they are plain text that only becomes destructive on
    // approach: reachable, never competing.
    quiet:
      'text-hull-500 hover:text-danger-300 hover:bg-danger-950/30 focus:ring-danger-600',
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
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-hull-950/40 px-4 py-10 text-center text-sm text-hull-400 sm:py-12">
      {icon && (
        <span
          aria-hidden
          className="mb-1 grid h-14 w-14 place-items-center text-3xl opacity-70 sm:h-16 sm:w-16"
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
