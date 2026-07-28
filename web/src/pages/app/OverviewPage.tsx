import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../SessionContext'
import { Badge, SectionLabel, Skeleton } from '../../components/ui'
import DiscordButton from '../../components/DiscordButton'
import { NAV_ITEMS } from '../../nav'
import type { OpsActivity, ServerStatus, ServerStatusLevel } from '../../services/store'
import { relativeTime } from '../../services/community'
import {
  EXEC_PHASE_STYLE,
  formatCountdown,
  isLightLit,
  useExecTimer,
  type ExecPhase,
  type ExecPhaseInfo,
} from '../../services/execTimer'
import { getCommLinks, type CommLink } from '../../services/scwiki'

const STATUS_TONE: Record<ServerStatusLevel, 'green' | 'amber' | 'slate' | 'red'> = {
  online: 'green',
  degraded: 'amber',
  maintenance: 'slate',
  offline: 'red',
}

const OPS_ICON: Record<OpsActivity, string> = {
  mining: '⛏️',
  salvage: '🔧',
  cargo: '📦',
  other: '🛰️',
}

const PHASE_ACCENT: Record<ExecPhase, string> = {
  open: 'border-positive-700/60 bg-positive-950/25 hover:border-positive-500/70',
  charging: 'border-danger-900/60 bg-danger-950/20 hover:border-danger-700/70',
  blackout: 'border-hull-700/70 bg-hull-900/60 hover:border-hull-600',
}

const PHASE_BAR: Record<ExecPhase, string> = {
  open: 'bg-positive-500',
  charging: 'bg-danger-500',
  blackout: 'bg-hull-500',
}

/** Last time the dashboard showed Comm-Links; anything newer gets a "New" badge. */
const COMM_SEEN_KEY = 'nexus-nook:comm-links-seen'

/** Coerce anything a store/API might hand back into a safe finite number. */
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatAuec(n: number): string {
  return `${Math.round(n).toLocaleString()} aUEC`
}

function isHttpUrl(url?: string): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

function publishedTs(link: CommLink): number {
  if (!link.publishedAt) return Number.NEGATIVE_INFINITY
  const t = Date.parse(link.publishedAt)
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

/** Compact metric tile linking into a section. */
function StatTile({
  to,
  icon,
  label,
  value,
  hint,
}: {
  to: string
  icon: string
  label: string
  value: string
  hint?: string
}) {
  // Instrument ordering: caption first, then the value. A gauge is read by
  // finding the label you want and dropping to the number under it, so the
  // value carries the visual weight and the caption stays quiet above it.
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-card border border-line-subtle/80 bg-hull-900/60 p-5 shadow-card backdrop-blur transition-colors duration-ui ease-ui hover:border-brand-700/60 hover:bg-hull-900/80"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-60"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-label uppercase text-hull-500">{label}</p>
        <span aria-hidden className="text-sm leading-none opacity-70">
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-readout font-semibold tabular-nums text-hull-100">
        {value}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-hull-500">{hint ?? ' '}</p>
        <span
          aria-hidden
          className="shrink-0 text-hull-600 transition-transform duration-ui ease-ui group-hover:translate-x-0.5 group-hover:text-brand-300"
        >
          →
        </span>
      </div>
    </Link>
  )
}

/** The five in-game hangar status lights. */
function ExecLights({ info }: { info: ExecPhaseInfo }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const lit = isLightLit(info, i)
        return (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full border sm:h-3 sm:w-3 ${
              lit
                ? 'border-positive-400 bg-positive-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                : info.phase === 'blackout'
                  ? 'border-hull-700 bg-hull-800'
                  : 'border-danger-800 bg-danger-950'
            }`}
          />
        )
      })}
    </div>
  )
}

/**
 * The daily hook: a ticking Executive Hangar countdown. Kept in its own
 * component so the once-a-second re-render never touches the rest of the page.
 */
function ExecHangarStrip() {
  const { info, source, communityReports } = useExecTimer()
  const style = info ? EXEC_PHASE_STYLE[info.phase] : null

  return (
    <Link
      to="/servers"
      aria-label="Executive Hangar timer — open the Servers tab"
      className={`group relative block overflow-hidden rounded-2xl border p-4 shadow-xl shadow-black/30 backdrop-blur transition duration-300 sm:p-5 ${
        info ? PHASE_ACCENT[info.phase] : 'border-caution-800/60 bg-caution-950/20 hover:border-caution-600/70'
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent opacity-60"
      />
      {info?.phase === 'open' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse bg-positive-500/5 motion-reduce:animate-none"
        />
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-label uppercase text-hull-500">
            Executive Hangar · Pyro
          </p>
          {info && style ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge tone={style.tone} dot>
                {style.label}
              </Badge>
              <span className="text-sm text-hull-400">{style.short}</span>
              {/* Tabular figures so the seconds tick without the line reflowing. */}
              <span className="font-display text-4xl font-bold tabular-nums leading-none text-hull-100 sm:text-5xl">
                {formatCountdown(info.msToNext)}
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-hull-300">
              Timer needs a one-tap calibration — set it on the Servers tab.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {info && <ExecLights info={info} />}
          <span
            aria-hidden
            className="text-hull-600 transition group-hover:translate-x-0.5 group-hover:text-brand-300"
          >
            →
          </span>
        </div>
      </div>

      {info && (
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-hull-800">
          <div
            className={`h-full rounded-full transition-all motion-reduce:transition-none ${PHASE_BAR[info.phase]}`}
            style={{ width: `${Math.min(100, Math.max(0, info.progress * 100))}%` }}
          />
        </div>
      )}

      {info && source === 'community' && (
        <p className="relative mt-2 text-[11px] text-hull-500">
          Community-calibrated from {communityReports} player report
          {communityReports === 1 ? '' : 's'}
        </p>
      )}
    </Link>
  )
}

/**
 * Three newest official Comm-Links. Never blocks or breaks the dashboard:
 * any API failure renders nothing at all.
 */
function CommLinksSection() {
  const [items, setItems] = useState<CommLink[] | null>(null)
  const [failed, setFailed] = useState(false)
  // Captured once on mount so the badges survive this visit's own timestamp write.
  const [lastSeen] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(COMM_SEEN_KEY)
      const n = raw ? Number(raw) : NaN
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    let active = true
    getCommLinks(8)
      .then((list) => {
        if (!active) return
        const rows = (Array.isArray(list) ? list : [])
          .map((item, i) => ({ item, i }))
          .sort((a, b) => publishedTs(b.item) - publishedTs(a.item) || a.i - b.i)
          .map(({ item }) => item)
          .slice(0, 3)
        setItems(rows)
        try {
          localStorage.setItem(COMM_SEEN_KEY, String(Date.now()))
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [])

  if (failed) return null
  if (items !== null && items.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-brand-500 to-transparent" />
        <h2 className="font-mono text-label uppercase text-hull-400">Latest Comm-Links</h2>
        <span aria-hidden className="h-px flex-1 bg-line-subtle/70" />
        <Link
          to="/news"
          className="shrink-0 font-mono text-label uppercase text-brand-300 transition-colors duration-ui ease-ui hover:text-brand-200"
        >
          All news →
        </Link>
      </div>

      {items === null ? (
        <ul className="grid gap-4 sm:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-2xl border border-hull-800/80 bg-hull-900/50 p-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {items.map((item, i) => {
            const ts = publishedTs(item)
            const isNew = lastSeen !== null && Number.isFinite(ts) && ts > lastSeen
            const when = item.publishedAt ? relativeTime(item.publishedAt) : ''
            const body = (
              <>
                {isHttpUrl(item.imageUrl) && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-24 w-full rounded-lg object-cover"
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-medium text-hull-100">
                    {item.title}
                  </h3>
                  {isNew && (
                    <span className="shrink-0">
                      <Badge tone="purple" dot>
                        New
                      </Badge>
                    </span>
                  )}
                </div>
                {(when || item.channel) && (
                  <p className="mt-1.5 text-xs text-hull-500">
                    {[item.channel, when].filter(Boolean).join(' · ')}
                  </p>
                )}
              </>
            )
            const shell =
              'block h-full rounded-2xl border border-hull-800/80 bg-hull-900/50 p-3 transition'
            return (
              <li key={`${item.id ?? item.url ?? item.title}:${i}`}>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${shell} hover:border-brand-700/60 hover:bg-hull-900/70 focus:border-brand-700/60 focus:outline-none`}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={shell}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-snug text-hull-600">
        Comm-Link data via the Star Citizen Wiki API (CC BY-SA 4.0) — content © Cloud
        Imperium Games.
      </p>
    </section>
  )
}

/** Shared shell for a "pick up where you left off" panel. */
function ResumePanel({
  to,
  icon,
  title,
  children,
}: {
  to: string
  icon: string
  title: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-hull-800/80 bg-hull-900/50 p-5 transition hover:border-brand-700/60 hover:bg-hull-900/70"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg border border-hull-700/70 bg-hull-800/60 text-base"
          >
            {icon}
          </span>
          <span className="font-display font-semibold text-hull-100">{title}</span>
        </span>
        <span
          aria-hidden
          className="text-hull-600 transition group-hover:translate-x-0.5 group-hover:text-brand-300"
        >
          →
        </span>
      </div>
      {children}
    </Link>
  )
}

function ProgressBar({ ratio, tone }: { ratio: number; tone: string }) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(ratio) ? ratio * 100 : 0))
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hull-800">
      <div
        className={`h-full rounded-full transition-all motion-reduce:transition-none ${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function OverviewPage() {
  const { state, isDemo, getServerStatus } = useSession()
  const profile = state!.profile
  const fleet = Array.isArray(state!.fleet) ? state!.fleet : []
  const inventory = Array.isArray(state!.inventory) ? state!.inventory : []

  const [servers, setServers] = useState<ServerStatus[] | null>(null)

  useEffect(() => {
    let active = true
    getServerStatus()
      .then((s) => active && setServers(s))
      .catch(() => active && setServers([]))
    return () => {
      active = false
    }
  }, [getServerStatus])

  const itemUnits = inventory.reduce((sum, i) => sum + num(i?.qty), 0)
  const onlineCount = servers?.filter((s) => s.status === 'online').length ?? 0
  const worst =
    servers && servers.length > 0
      ? servers.find((s) => s.status === 'offline') ??
        servers.find((s) => s.status === 'degraded') ??
        servers.find((s) => s.status === 'maintenance') ??
        servers[0]
      : null

  // Everything below comes from session state already in memory — no fetches.
  const resume = useMemo(() => {
    const contracts = Array.isArray(state!.hauling) ? state!.hauling : []
    const activeContracts = contracts.filter((c) => c && c.status === 'active')
    const hauls = activeContracts
      .map((c) => {
        const stops = Array.isArray(c.stops) ? c.stops : []
        const done = stops.filter((s) => s?.done).length
        return {
          id: c.id,
          name: (c.name ?? '').trim() || 'Untitled contract',
          done,
          total: stops.length,
          remaining: Math.max(0, stops.length - done),
          reward: Math.max(0, num(c.reward)),
        }
      })
      .sort((a, b) => a.remaining - b.remaining || b.reward - a.reward)
    const pendingReward = hauls.reduce((sum, h) => sum + h.reward, 0)

    const allSessions = Array.isArray(state!.opsSessions) ? state!.opsSessions : []
    const ops = allSessions
      .filter((s) => s && !s.closed)
      .map((s) => {
        const entries = Array.isArray(s.entries) ? s.entries : []
        return {
          id: s.id,
          name: (s.name ?? '').trim() || 'Untitled session',
          icon: OPS_ICON[s.activity] ?? OPS_ICON.other,
          net: entries.reduce((sum, e) => sum + num(e?.amount), 0),
          crew: Array.isArray(s.crew) ? s.crew.length : 0,
        }
      })
      .sort((a, b) => b.net - a.net)
    const opsNet = ops.reduce((sum, s) => sum + s.net, 0)

    const blueprints = Array.isArray(state!.blueprints) ? state!.blueprints : []
    let nearest: {
      id: string
      name: string
      need: number
      have: number
      ratio: number
      missing: number
    } | null = null
    for (const bp of blueprints) {
      if (!bp || bp.status === 'crafted') continue
      const mats = Array.isArray(bp.materials) ? bp.materials : []
      let need = 0
      let have = 0
      for (const m of mats) {
        const n = Math.max(0, num(m?.need))
        if (n <= 0) continue
        need += n
        have += Math.min(n, Math.max(0, num(m?.have)))
      }
      if (need <= 0) continue
      const ratio = have / need
      if (!nearest || ratio > nearest.ratio) {
        nearest = {
          id: bp.id,
          name: (bp.name ?? '').trim() || 'Untitled blueprint',
          need,
          have,
          ratio,
          missing: Math.max(0, need - have),
        }
      }
    }

    return { hauls, pendingReward, ops, opsNet, nearest }
  }, [state])

  const hasResume =
    resume.hauls.length > 0 || resume.ops.length > 0 || resume.nearest !== null

  // The money tile: hauling payout when there are contracts, otherwise the
  // running ops net — whichever is actually moving for this player.
  const moneyTile =
    resume.hauls.length > 0 || resume.ops.length === 0
      ? {
          to: '/hauling',
          label: 'aUEC pending payout',
          value: Math.round(resume.pendingReward).toLocaleString(),
          hint:
            resume.hauls.length > 0
              ? `${resume.hauls.length} active ${resume.hauls.length === 1 ? 'contract' : 'contracts'}`
              : 'Log a hauling contract',
        }
      : {
          to: '/mining',
          label: 'aUEC ops net',
          value: Math.round(resume.opsNet).toLocaleString(),
          hint: `${resume.ops.length} open ${resume.ops.length === 1 ? 'session' : 'sessions'}`,
        }

  // Quick links into the non-summarized sections.
  const quickLinks = NAV_ITEMS.filter((i) =>
    ['/trade', '/org', '/profile'].includes(i.to),
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-6xl lg:px-8 lg:py-12">
      <ExecHangarStrip />

      <header className="mb-8 mt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-blue-300 to-brand-300 bg-clip-text text-transparent">
            {(profile?.displayName ?? '').split(' ')[0] || 'Citizen'}
          </span>
          .
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-hull-400">
          Your personal nook in the Nexus.
          {isDemo && (
            <Badge tone="amber" dot>
              Demo mode — data stays in this browser
            </Badge>
          )}
        </p>
      </header>

      <section aria-label="Summary" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          to="/fleet"
          icon="🚀"
          label={fleet.length === 1 ? 'Ship in fleet' : 'Ships in fleet'}
          value={String(fleet.length)}
          hint={fleet.length === 0 ? 'Add your first ship' : undefined}
        />
        <StatTile
          to="/inventory"
          icon="📦"
          label="Inventory items"
          value={String(inventory.length)}
          hint={inventory.length > 0 ? `${itemUnits} units tracked` : 'Manifest empty'}
        />
        <StatTile
          to={moneyTile.to}
          icon="💰"
          label={moneyTile.label}
          value={moneyTile.value}
          hint={moneyTile.hint}
        />
        <StatTile
          to="/servers"
          icon="📡"
          label={worst ? `${worst.region} shard` : 'Server status'}
          value={
            servers === null
              ? '…'
              : worst
                ? worst.status.charAt(0).toUpperCase() + worst.status.slice(1)
                : '—'
          }
          hint={
            servers === null
              ? 'Checking shards…'
              : servers.length > 0
                ? `${onlineCount}/${servers.length} regions online`
                : 'No data'
          }
        />
      </section>

      {worst && (
        <div className="mt-5">
          <span className="inline-flex items-center gap-2 text-xs text-hull-500">
            Live shard glance:
            {servers!.slice(0, 4).map((s) => (
              <Badge key={s.region} tone={STATUS_TONE[s.status]} dot>
                {s.region}
              </Badge>
            ))}
          </span>
        </div>
      )}

      {hasResume && (
        <section className="mt-10">
          <SectionLabel>Pick up where you left off</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-3">
            {resume.hauls.length > 0 && (
              <ResumePanel to="/hauling" icon="🚚" title="Hauling">
                <ul className="space-y-3">
                  {resume.hauls.slice(0, 3).map((h) => (
                    <li key={h.id}>
                      <p className="truncate text-sm font-medium text-hull-200">{h.name}</p>
                      <p className="mt-0.5 text-xs text-hull-500">
                        {h.remaining === 0
                          ? 'All stops done'
                          : `${h.remaining} ${h.remaining === 1 ? 'stop' : 'stops'} left`}
                        {h.total > 0 ? ` · ${h.done}/${h.total}` : ''}
                        {h.reward > 0 ? ` · ${formatAuec(h.reward)}` : ''}
                      </p>
                      <ProgressBar
                        ratio={h.total > 0 ? h.done / h.total : 0}
                        tone="bg-gradient-to-r from-sky-500 to-brand-500"
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-hull-500">
                  {resume.pendingReward > 0
                    ? `${formatAuec(resume.pendingReward)} pending`
                    : 'No rewards logged yet'}
                  {resume.hauls.length > 3 ? ` · +${resume.hauls.length - 3} more` : ''}
                </p>
              </ResumePanel>
            )}

            {resume.ops.length > 0 && (
              <ResumePanel to="/mining" icon="⛏️" title="Open ops">
                <ul className="space-y-2.5">
                  {resume.ops.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-hull-200">
                          {s.icon} {s.name}
                        </span>
                        <span className="text-xs text-hull-500">
                          {s.crew} {s.crew === 1 ? 'crew member' : 'crew members'}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          s.net >= 0 ? 'text-positive-300' : 'text-danger-400'
                        }`}
                      >
                        {formatAuec(s.net)}
                      </span>
                    </li>
                  ))}
                </ul>
                {resume.ops.length > 3 && (
                  <p className="mt-3 text-xs text-hull-500">
                    +{resume.ops.length - 3} more open
                  </p>
                )}
              </ResumePanel>
            )}

            {resume.nearest && (
              <ResumePanel to="/blueprints" icon="📐" title="Next craft">
                <p className="truncate text-sm font-medium text-hull-200">
                  {resume.nearest.name}
                </p>
                <p className="mt-0.5 text-xs text-hull-500">
                  {resume.nearest.have}/{resume.nearest.need} materials gathered
                </p>
                <ProgressBar
                  ratio={resume.nearest.ratio}
                  tone={resume.nearest.missing === 0 ? 'bg-positive-500' : 'bg-brand-500'}
                />
                <p className="mt-3 text-xs text-hull-500">
                  {resume.nearest.missing === 0
                    ? 'Materials ready — go craft it'
                    : `${resume.nearest.missing} still to gather`}
                </p>
              </ResumePanel>
            )}
          </div>
        </section>
      )}

      <CommLinksSection />

      <section className="mt-10">
        <SectionLabel>Jump in</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-2xl border border-hull-800/80 bg-hull-900/50 p-5 transition hover:border-brand-700/60 hover:bg-hull-900/70"
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-lg border border-hull-700/70 bg-hull-800/60 text-base"
                >
                  {item.icon}
                </span>
                <span className="font-display font-semibold text-hull-100">{item.label}</span>
              </div>
              <p className="mt-3 text-sm text-hull-400">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-hull-800/80 bg-hull-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-semibold text-hull-100">Join the community</p>
          <p className="mt-1 text-sm text-hull-400">
            Share routes, swap fleet tips, and help shape Nexus Nook.
          </p>
        </div>
        <DiscordButton className="shrink-0" />
      </section>
    </div>
  )
}
