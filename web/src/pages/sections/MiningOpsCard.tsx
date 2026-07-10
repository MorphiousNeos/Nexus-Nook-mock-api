import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  addSharedOpsEntry,
  communityAvailable,
  createSharedOps,
  deleteSharedOps,
  deleteSharedOpsEntry,
  getSharedOps,
  joinSharedOps,
  leaveSharedOps,
  listSharedOps,
  relativeTime,
  setSharedOpsShares,
  toggleSharedOpsClosed,
  type SharedOpsActivity,
  type SharedOpsDetail,
  type SharedOpsSummary,
} from '../../services/community'
import CommunityNotice from '../community/CommunityNotice'

const ACTIVITY_LABELS: Record<SharedOpsActivity, string> = {
  mining: '⛏️ Mining',
  salvage: '🔧 Salvage',
  cargo: '📦 Cargo',
  other: '🛰️ Other',
}

function formatAuec(n: number): string {
  return `${Math.round(n).toLocaleString()} aUEC`
}

function computePayouts(detail: SharedOpsDetail) {
  const net = detail.entries.reduce((sum, e) => sum + e.amount, 0)
  const totalShares = detail.crew.reduce((sum, c) => sum + Math.max(0, c.shares), 0)
  const payouts = detail.crew.map((c) => ({
    ...c,
    payout: totalShares > 0 ? (Math.max(0, c.shares) / totalShares) * net : 0,
  }))
  return { net, payouts }
}

function buildSummary(detail: SharedOpsDetail): string {
  const { net, payouts } = computePayouts(detail)
  return [
    `**${detail.name}** — ${detail.activity} op payout`,
    `Net: ${formatAuec(net)}`,
    '',
    ...payouts.map((p) => `${p.name} (${p.shares}×): ${formatAuec(p.payout)}`),
    '',
    '— split with Nexus Nook',
  ].join('\n')
}

function SessionDetail({
  sessionId,
  me,
  onBack,
  onChanged,
}: {
  sessionId: string
  me: string
  onBack: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<SharedOpsDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [entryLabel, setEntryLabel] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryKind, setEntryKind] = useState<'income' | 'expense'>('income')
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDetail(await getSharedOps(sessionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this session.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function run(fn: () => Promise<void>, fallback: string) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await refresh()
      onChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  async function submitEntry(e: FormEvent) {
    e.preventDefault()
    if (!detail) return
    const raw = Math.abs(parseInt(entryAmount, 10) || 0)
    const label = entryLabel.trim()
    if (!label || raw <= 0) return
    await run(
      () => addSharedOpsEntry(detail.id, label, entryKind === 'expense' ? -raw : raw),
      'Could not add that entry.',
    )
    setEntryLabel('')
    setEntryAmount('')
  }

  async function copySummary() {
    if (!detail) return
    try {
      await navigator.clipboard.writeText(buildSummary(detail))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (loading && !detail) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div>
        <Button variant="ghost" onClick={onBack}>
          ← Back to sessions
        </Button>
        <EmptyState icon="⚠️">{error ?? 'Session unavailable.'}</EmptyState>
      </div>
    )
  }

  const isOwner = !!me && detail.owner === me
  const isCrew = !!me && detail.crew.some((c) => c.name === me)
  const { net, payouts } = computePayouts(detail)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          ← Back to sessions
        </Button>
        <Button variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-100">
            {ACTIVITY_LABELS[detail.activity].split(' ')[0]} {detail.name}
          </p>
          {detail.closed && <Badge tone="slate">Closed</Badge>}
          <Badge tone="purple">Run by {detail.owner || 'Unknown'}</Badge>
          {detail.createdAt && (
            <span className="text-xs text-slate-500">
              started {relativeTime(detail.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!isCrew && !detail.closed && (
            <Button
              onClick={() => run(() => joinSharedOps(detail.id), 'Could not join.')}
              disabled={busy || !me}
            >
              {busy ? 'Working…' : 'Join crew'}
            </Button>
          )}
          {isCrew && !isOwner && (
            <Button
              variant="ghost"
              onClick={() => run(() => leaveSharedOps(detail.id), 'Could not leave.')}
              disabled={busy}
            >
              Leave crew
            </Button>
          )}
          {isOwner && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  run(() => toggleSharedOpsClosed(detail.id), 'Could not update.')
                }
                disabled={busy}
              >
                {detail.closed ? 'Reopen session' : 'Close session'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Delete "${detail.name}"? This cannot be undone.`)) {
                    void run(() => deleteSharedOps(detail.id), 'Could not delete.').then(
                      onBack,
                    )
                  }
                }}
                disabled={busy}
              >
                Delete
              </Button>
            </>
          )}
          {!me && <span className="text-xs text-slate-500">Sign in to join.</span>}
        </div>
        {actionError && <p className="mt-2 text-sm text-amber-300">{actionError}</p>}
      </div>

      {/* Crew & shares */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Crew &amp; shares
        </h4>
        <ul className="mt-2 space-y-1.5">
          {detail.crew.map((c) => (
            <li key={c.userId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-200">
                {c.name}
                {c.name === detail.owner && (
                  <span className="ml-1.5 text-[10px] uppercase text-purple-300">owner</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        run(
                          () => setSharedOpsShares(detail.id, c.userId, c.shares - 0.5),
                          'Could not update shares.',
                        )
                      }
                      disabled={busy}
                      className="grid h-6 w-6 place-items-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      aria-label={`Lower ${c.name}'s share`}
                    >
                      −
                    </button>
                    <span className="min-w-[2.5rem] text-center tabular-nums text-slate-300">
                      {c.shares}×
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        run(
                          () => setSharedOpsShares(detail.id, c.userId, c.shares + 0.5),
                          'Could not update shares.',
                        )
                      }
                      disabled={busy}
                      className="grid h-6 w-6 place-items-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      aria-label={`Raise ${c.name}'s share`}
                    >
                      +
                    </button>
                  </>
                ) : (
                  <span className="tabular-nums text-slate-400">{c.shares}×</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ledger */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Shared ledger
        </h4>
        {detail.entries.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Nothing logged yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {detail.entries.map((e) => {
              const canDelete = isOwner || (!!me && e.author === me)
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-slate-300">
                    {e.label}
                    <span className="ml-1.5 text-[11px] text-slate-500">· {e.author}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`tabular-nums ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {e.amount >= 0 ? '+' : '−'}
                      {formatAuec(Math.abs(e.amount))}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          run(
                            () => deleteSharedOpsEntry(detail.id, e.id),
                            'Could not delete entry.',
                          )
                        }
                        disabled={busy}
                        className="text-xs text-slate-600 hover:text-red-400"
                        aria-label={`Remove ${e.label}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {isCrew && !detail.closed && (
          <form onSubmit={submitEntry} className="mt-3 flex flex-wrap gap-2">
            <select
              value={entryKind}
              onChange={(e) => setEntryKind(e.target.value as 'income' | 'expense')}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            >
              <option value="income">+ Sale</option>
              <option value="expense">− Expense</option>
            </select>
            <input
              placeholder={entryKind === 'income' ? 'Quantanium haul' : 'Refinery fee'}
              value={entryLabel}
              onChange={(e) => setEntryLabel(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <input
              type="number"
              min={1}
              placeholder="aUEC"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              className="w-28 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <Button
              type="submit"
              variant="ghost"
              disabled={busy || !entryLabel.trim() || !entryAmount}
            >
              Add
            </Button>
          </form>
        )}
        {!isCrew && !detail.closed && (
          <p className="mt-3 text-xs text-slate-500">Join the crew to log entries.</p>
        )}
      </div>

      {/* Payouts */}
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Payouts
          </h4>
          <span
            className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-emerald-300' : 'text-red-400'}`}
          >
            Net {formatAuec(net)}
          </span>
        </div>
        <ul className="mt-2 space-y-1">
          {payouts.map((p) => (
            <li key={p.userId} className="flex items-baseline justify-between text-sm">
              <span className="text-slate-200">
                {p.name} <span className="text-xs text-slate-500">({p.shares}×)</span>
              </span>
              <span className="tabular-nums text-emerald-300">{formatAuec(p.payout)}</span>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={copySummary}
          disabled={payouts.length === 0}
        >
          {copied ? 'Copied ✓' : '📋 Copy payout summary'}
        </Button>
      </div>
    </div>
  )
}

export default function MiningOpsCard() {
  const { state } = useSession()
  const me = state?.profile.displayName ?? ''

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SharedOpsSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [activity, setActivity] = useState<SharedOpsActivity>('mining')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSessions(await listSharedOps())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!communityAvailable) {
      setLoading(false)
      return
    }
    void refresh()
  }, [refresh])

  if (!communityAvailable) return <CommunityNotice />

  if (selectedId) {
    return (
      <Card title="Mining & Salvage Ops" icon="⛏️">
        <SessionDetail
          sessionId={selectedId}
          me={me}
          onBack={() => setSelectedId(null)}
          onChanged={refresh}
        />
      </Card>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setFormError(null)
    try {
      const { id } = await createSharedOps(name.trim(), activity)
      setName('')
      setActivity('mining')
      setFormOpen(false)
      await refresh()
      if (id) setSelectedId(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the session.')
    } finally {
      setBusy(false)
    }
  }

  const open = sessions.filter((s) => !s.closed)
  const closed = sessions.filter((s) => s.closed)

  function renderRow(s: SharedOpsSummary) {
    return (
      <li key={s.id}>
        <button
          type="button"
          onClick={() => setSelectedId(s.id)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3 text-left transition hover:border-purple-700/60 hover:bg-slate-900/60 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-100">
                {ACTIVITY_LABELS[s.activity].split(' ')[0]} {s.name || 'Untitled session'}
                {s.closed && (
                  <span className="ml-2 text-[10px] uppercase text-slate-500">closed</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {s.owner || 'Unknown'} · {s.crewCount}{' '}
                {s.crewCount === 1 ? 'crew member' : 'crew members'} ·{' '}
                {relativeTime(s.createdAt)}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${s.net >= 0 ? 'text-emerald-300' : 'text-red-400'}`}
            >
              {formatAuec(s.net)}
            </span>
          </div>
        </button>
      </li>
    )
  }

  return (
    <Card
      title="Mining & Salvage Ops"
      icon="⛏️"
      action={
        <Button
          variant={formOpen ? 'ghost' : 'primary'}
          onClick={() => setFormOpen((o) => !o)}
        >
          {formOpen ? 'Close' : 'New session'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Community crew sessions — anyone can browse, join an open crew, and log the take
        together. Payouts split by shares, ready to paste into Discord.
      </p>

      {formOpen && (
        <form
          onSubmit={submit}
          className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2"
        >
          <Field
            label="Session name"
            placeholder="Sunday Quantanium run"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Activity
            </span>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as SharedOpsActivity)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            >
              {(Object.keys(ACTIVITY_LABELS) as SharedOpsActivity[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          {formError && (
            <p className="text-sm text-amber-300 sm:col-span-2">{formError}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Creating…' : 'Start session'}
            </Button>
          </div>
        </form>
      )}

      {error && <EmptyState icon="⚠️">{error}</EmptyState>}

      {!error && loading && sessions.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!error && !loading && sessions.length === 0 && (
        <EmptyState>
          No sessions yet. Start one and your crew can join from their own devices.
        </EmptyState>
      )}

      {!error && open.length > 0 && <ul className="space-y-2">{open.map(renderRow)}</ul>}

      {!error && closed.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Closed sessions
          </h3>
          <ul className="space-y-2">{closed.map(renderRow)}</ul>
        </div>
      )}
    </Card>
  )
}
