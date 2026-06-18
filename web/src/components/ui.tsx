import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Card({
  title,
  icon,
  children,
  className = '',
}: {
  title?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur ${className}`}
    >
      {title && (
        <header className="mb-4 flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h2 className="font-display text-lg font-semibold tracking-wide text-slate-100">
            {title}
          </h2>
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
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50'
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 focus:ring-purple-500',
    ghost:
      'border border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 focus:ring-slate-500',
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
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'purple'
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-700/50 text-slate-300 border-slate-600',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/60',
    red: 'bg-red-900/40 text-red-300 border-red-700/60',
    purple: 'bg-purple-900/40 text-purple-200 border-purple-700/60',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-700/70 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  )
}
