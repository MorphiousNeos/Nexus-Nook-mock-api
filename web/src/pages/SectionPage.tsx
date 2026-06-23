import type { ReactNode } from 'react'

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
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-7 flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700/70 bg-slate-800/60 text-2xl"
        >
          {icon}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </header>
      {children}
    </div>
  )
}
