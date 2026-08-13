import type { ReactNode } from 'react'

/**
 * Semantic modules.
 *
 * A page is not a stack of identical rounded rectangles. Each module type
 * answers a different question, so each one is composed differently — the
 * differences are structural (surface, density, alignment, type scale) rather
 * than decorative, so they still read as one language.
 *
 *   Hero      — why the user opened this page. One per page.
 *   Summary   — operational status: figures with the context that gives meaning.
 *   Data      — the working set. Lists, tables, the substance of the page.
 *   Activity  — what happened recently, in order.
 *   Alert     — something needs a decision.
 *   Action    — where the user puts information in, rather than takes it out.
 */

/* ------------------------------------------------------------------ Hero -- */

/**
 * The page's answer, and the only module of its kind on a page.
 *
 * Deliberately has no card around it: a border would make it a peer of the
 * modules below rather than their premise. Its weight comes from scale and
 * space alone.
 */
export function HeroModule({
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  lede?: ReactNode
  /** Right-aligned supporting figure or control. */
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="font-mono text-label uppercase text-hull-400">{eyebrow}</p>
          )}
          {/* An h1, not a div: this is the page's title, and a hero page had no
              document heading at all without it. Tailwind's preflight strips the
              browser's own h1 size, weight and margin, so the element name
              changes and nothing about the rendering does. */}
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-hull-100 sm:text-4xl">
            {title}
          </h1>
          {lede && (
            <div className="mt-3 max-w-2xl text-sm leading-relaxed text-hull-300 sm:text-base">
              {lede}
            </div>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}

/* --------------------------------------------------------------- Summary -- */

export type SummaryStat = {
  label: string
  value: string
  /** The context that turns a number into a status. */
  note?: string
  tone?: 'default' | 'positive' | 'caution' | 'danger'
}

const STAT_TONE: Record<NonNullable<SummaryStat['tone']>, string> = {
  default: 'text-hull-100',
  positive: 'text-positive-300',
  caution: 'text-caution-300',
  danger: 'text-danger-300',
}

/**
 * Operational status rather than isolated statistics.
 *
 * Each figure carries the context that gives it meaning — "2 of 4 configured"
 * says something a bare "2" does not. Rendered on the page surface with rules
 * between, not as a row of boxes, so the figures group as one readout.
 */
export function SummaryModule({ stats }: { stats: SummaryStat[] }) {
  if (stats.length === 0) return null
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line-subtle py-5 sm:grid-cols-4 sm:gap-x-8">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <dt className="font-mono text-label uppercase text-hull-400">{stat.label}</dt>
          <dd
            className={`mt-1.5 font-display text-2xl font-semibold tabular-nums leading-none ${
              STAT_TONE[stat.tone ?? 'default']
            }`}
          >
            {stat.value}
          </dd>
          {stat.note && (
            <dd className="mt-1.5 truncate text-xs text-hull-400">{stat.note}</dd>
          )}
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------------------------------------------ Data -- */

/**
 * The working set. Carries a surface because its contents are a distinct
 * object from the page around them.
 */
export function DataModule({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-card border border-line-subtle bg-hull-900 shadow-card ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-hull-100">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-hull-400">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
    </section>
  )
}

/* -------------------------------------------------------------- Activity -- */

/**
 * Recent events in order. Sits directly on the page with a single leading rule
 * — a chronology reads as a column, not as a box.
 */
export function ActivityModule({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <header className="mb-3 flex items-center gap-3">
        <h2 className="font-mono text-label uppercase text-hull-400">{title}</h2>
        <span aria-hidden className="h-px flex-1 bg-line-subtle" />
        {action}
      </header>
      <div className="border-l border-line-subtle pl-4">{children}</div>
    </section>
  )
}

/* ----------------------------------------------------------------- Alert -- */

/**
 * Something needs a decision. A leading rule in the status colour rather than
 * a filled panel: an alert should be findable, not loud.
 */
export function AlertModule({
  tone = 'caution',
  title,
  children,
  action,
}: {
  tone?: 'caution' | 'danger' | 'positive'
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const rule = {
    caution: 'border-l-caution-500',
    danger: 'border-l-danger-500',
    positive: 'border-l-positive-500',
  }[tone]
  return (
    <section
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l-2 bg-hull-900 py-3 pl-4 pr-4 ${rule}`}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-hull-100">{title}</h2>
        {children && <p className="mt-0.5 text-xs text-hull-400">{children}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}

/* ---------------------------------------------------------------- Action -- */

/**
 * Where information goes in rather than comes out. Recessed below the page
 * surface, which is the opposite direction to a data module — input and output
 * should not look alike.
 */
export function ActionModule({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-line-subtle bg-hull-950 p-5 sm:p-6">
      {title && (
        <h2 className="mb-4 font-mono text-label uppercase text-hull-400">{title}</h2>
      )}
      {children}
    </section>
  )
}
