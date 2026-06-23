import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../SessionContext'
import { Badge } from '../../components/ui'
import DiscordButton from '../../components/DiscordButton'
import { NAV_ITEMS } from '../../nav'
import type { ServerStatus, ServerStatusLevel } from '../../services/store'

const STATUS_TONE: Record<ServerStatusLevel, 'green' | 'amber' | 'slate' | 'red'> = {
  online: 'green',
  degraded: 'amber',
  maintenance: 'slate',
  offline: 'red',
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
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur transition duration-300 hover:border-purple-700/60 hover:shadow-2xl hover:shadow-purple-950/20"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-60"
      />
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700/70 bg-slate-800/60 text-lg"
        >
          {icon}
        </span>
        <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-purple-300" aria-hidden>
          →
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-100">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-slate-400">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Link>
  )
}

export default function OverviewPage() {
  const { state, isDemo, getServerStatus } = useSession()
  const profile = state!.profile
  const fleet = state!.fleet
  const inventory = state!.inventory

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

  const itemUnits = inventory.reduce((sum, i) => sum + i.qty, 0)
  const onlineCount = servers?.filter((s) => s.status === 'online').length ?? 0
  const worst =
    servers && servers.length > 0
      ? servers.find((s) => s.status === 'offline') ??
        servers.find((s) => s.status === 'degraded') ??
        servers.find((s) => s.status === 'maintenance') ??
        servers[0]
      : null

  // Quick links into the non-summarized sections.
  const quickLinks = NAV_ITEMS.filter((i) =>
    ['/trade', '/org', '/profile'].includes(i.to),
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
            {profile.displayName.split(' ')[0] || 'Citizen'}
          </span>
          .
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
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
          to="/profile"
          icon="🛰️"
          label="RSI handle"
          value={profile.rsiHandle || '—'}
          hint={profile.rsiHandle ? 'Public, display only' : 'Add yours in Profile'}
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
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            Live shard glance:
            {servers!.slice(0, 4).map((s) => (
              <Badge key={s.region} tone={STATUS_TONE[s.status]} dot>
                {s.region}
              </Badge>
            ))}
          </span>
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-wide text-slate-200">
          Jump in
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 transition hover:border-purple-700/60 hover:bg-slate-900/70"
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/70 bg-slate-800/60 text-base"
                >
                  {item.icon}
                </span>
                <span className="font-display font-semibold text-slate-100">{item.label}</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-semibold text-slate-100">Join the community</p>
          <p className="mt-1 text-sm text-slate-400">
            Share routes, swap fleet tips, and help shape Nexus Nook.
          </p>
        </div>
        <DiscordButton className="shrink-0" />
      </section>
    </div>
  )
}
