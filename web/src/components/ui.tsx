import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

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
      className={`group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur transition duration-300 hover:border-slate-700/80 hover:shadow-2xl hover:shadow-purple-950/20 sm:p-6 lg:p-7 ${className}`}
    >
      {/* Subtle top edge highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-60"
      />
      {title && (
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/70 bg-slate-800/60 text-base">
                {icon}
              </span>
            )}
            <h2 className="font-display text-lg font-semibold tracking-wide text-slate-100">
              {title}
            </h2>
          </div>
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
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-900/30 hover:from-blue-500 hover:to-purple-500 hover:shadow-purple-800/40 focus:ring-purple-500',
    ghost:
      'border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 hover:border-slate-600 focus:ring-slate-500',
    danger:
      'border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/40 focus:ring-red-600',
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
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
    slate: 'bg-slate-700/50 text-slate-300 border-slate-600',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/60',
    red: 'bg-red-900/40 text-red-300 border-red-700/60',
    purple: 'bg-purple-900/40 text-purple-200 border-purple-700/60',
  }
  const dotTones: Record<string, string> = {
    slate: 'bg-slate-400',
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    purple: 'bg-purple-300',
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

export function EmptyState({
  children,
  icon,
}: {
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700/70 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
      {icon && <span className="text-2xl opacity-80">{icon}</span>}
      <p>{children}</p>
    </div>
  )
}

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`nn-skeleton rounded-md ${className}`} aria-hidden />
}
