import { useMemo, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field } from '../../components/ui'
import type {
  CrewShare,
  OpsActivity,
  OpsLedgerEntry,
  OpsSession,
} from '../../services/types'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const ACTIVITY_LABELS: Record<OpsActivity, string> = {
  mining: '⛏️ Mining',
  salvage: '🔧 Salvage',
  cargo: '📦 Cargo',
  other: '🛰️ Other',
}

function formatAuec(n: number): string {
  return `${Math.round(n).toLocaleString()} aUEC`
}

/** Net total and per-crew payouts for a session. */
function computePayouts(session: OpsSession) {
  const net = session.entries.reduce((sum, e) => sum + e.amount, 0)
  const totalShares = session.crew.reduce((sum, c) => sum + Math.max(0, c.shares), 0)
  const payouts = session.crew.map((c) => ({
    ...c,
    payout: totalShares > 0 ? (Math.max(0, c.shares) / totalShares) * net : 0,
  }))
  return { net, totalShares, payouts }
}

/** Plain-text payout summary, ready to paste into Discord. */
function buildSummary(session: OpsSession): string {
  const { net, payouts } = computePayouts(session)
  const lines = [
    `**${session.name}** — ${ACTIVITY_LABELS[session.activity].replace(/^\S+ /, '')} op payout`,
    `Net: ${formatAuec(net)}`,
    '',
    ...payouts.map(
      (p) => `${p.name} (${p.shares}×): ${formatAuec(p.payout)}`,
    ),
    '',
    '— split with Nexus Nook',
  ]
  return lines.join('\n')
}

function SessionDetail({
  session,
  onPatch,
  onRemove,
}: {
  session: OpsSession
  onPatch: (patch: Partial<Omit<OpsSession, 'id'>>) => void
  onRemove: () => void
}) {
  const [entryLabel, setEntryLabel] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryKind, setEntryKind] = useState<'income' | 'expense'>('income')
  const [crewName, setCrewName] = useState('')
  const [copied, setCopied] = useState(false)

  const { net, payouts } = computePayouts(session)

  function addEntry(e: FormEvent) {
    e.preventDefault()
    const label = entryLabel.trim()
    const raw = Math.abs(parseInt(entryAmount, 10) || 0)
    if (!label || raw <= 0) return
    const entry: OpsLedgerEntry = {
      id: uid(),
      label,
      amount: entryKind === 'expense' ? -raw : raw,
    }
    onPatch({ entries: [...session.entries, entry] })
    setEntryLabel('')
    setEntryAmount('')
  }

  function addCrew(e: FormEvent) {
    e.preventDefault()
    const name = crewName.trim()
    if (!name) return
    const member: CrewShare = { id: uid(), name, shares: 1 }
    onPatch({ crew: [...session.crew, member] })
    setCrewName('')
  }

  function setShares(id: string, shares: number) {
    onPatch({
      crew: session.crew.map((c) =>
        c.id === id ? { ...c, shares: Math.max(0, Math.round(shares * 2) / 2) } : c,
      ),
    })
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummary(session))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="mt-3 space-y-4 border-t border-slate-800 pt-3">
      {/* Ledger */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Ledger
        </h4>
        {session.entries.length > 0 && (
          <ul className="mt-2 space-y-1">
            {session.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-300">{e.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`tabular-nums ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {e.amount >= 0 ? '+' : '−'}
                    {formatAuec(Math.abs(e.amount))}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onPatch({ entries: session.entries.filter((x) => x.id !== e.id) })
                    }
                    className="text-xs text-slate-600 hover:text-red-400"
                    aria-label={`Remove ${e.label}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {!session.closed && (
          <form onSubmit={addEntry} className="mt-2 flex flex-wrap gap-2">
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
            <Button type="submit" variant="ghost" disabled={!entryLabel.trim() || !entryAmount}>
              Add
            </Button>
          </form>
        )}
      </div>

      {/* Crew */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Crew &amp; shares
        </h4>
        <ul className="mt-2 space-y-1.5">
          {session.crew.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-200">{c.name}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShares(c.id, c.shares - 0.5)}
                  className="grid h-6 w-6 place-items-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                  aria-label={`Lower ${c.name}'s share`}
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center tabular-nums text-slate-300">
                  {c.shares}×
                </span>
                <button
                  type="button"
                  onClick={() => setShares(c.id, c.shares + 0.5)}
                  className="grid h-6 w-6 place-items-center rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                  aria-label={`Raise ${c.name}'s share`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onPatch({ crew: session.crew.filter((x) => x.id !== c.id) })
                  }
                  className="ml-1 text-xs text-slate-600 hover:text-red-400"
                  aria-label={`Remove ${c.name}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
        {!session.closed && (
          <form onSubmit={addCrew} className="mt-2 flex gap-2">
            <input
              placeholder="Crew member name"
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <Button type="submit" variant="ghost" disabled={!crewName.trim()}>
              Add crew
            </Button>
          </form>
        )}
      </div>

      {/* Payouts */}
      <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Payouts
          </h4>
          <span className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
            Net {formatAuec(net)}
          </span>
        </div>
        {payouts.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Add crew members to split the take.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between text-sm">
                <span className="text-slate-200">
                  {p.name} <span className="text-xs text-slate-500">({p.shares}×)</span>
                </span>
                <span className="tabular-nums text-emerald-300">{formatAuec(p.payout)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={copySummary} disabled={payouts.length === 0}>
            {copied ? 'Copied ✓' : '📋 Copy payout summary'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onPatch({ closed: !session.closed })}
          >
            {session.closed ? 'Reopen session' : 'Close session'}
          </Button>
          <Button variant="danger" onClick={onRemove}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MiningOpsCard() {
  const { state, addOpsSession, updateOpsSession, removeOpsSession } = useSession()
  const sessions = state!.opsSessions
  const me = state!.profile.displayName

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [activity, setActivity] = useState<OpsActivity>('mining')
  const [crewInput, setCrewInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const open = useMemo(() => sessions.filter((s) => !s.closed), [sessions])
  const closed = useMemo(() => sessions.filter((s) => s.closed), [sessions])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    const names = crewInput
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    // You're always on the crew; extra names come from the comma list.
    const crew: CrewShare[] = [
      { id: uid(), name: me || 'Me', shares: 1 },
      ...names
        .filter((n) => n.toLowerCase() !== (me || '').toLowerCase())
        .map((n) => ({ id: uid(), name: n, shares: 1 })),
    ]
    setBusy(true)
    try {
      await addOpsSession({ name: name.trim(), activity, crew, entries: [] })
      setName('')
      setCrewInput('')
      setActivity('mining')
      setFormOpen(false)
    } finally {
      setBusy(false)
    }
  }

  function renderSession(s: OpsSession) {
    const { net } = computePayouts(s)
    const expanded = expandedId === s.id
    return (
      <li
        key={s.id}
        className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
      >
        <button
          type="button"
          onClick={() => setExpandedId(expanded ? null : s.id)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <p className="font-medium text-slate-100">
              {ACTIVITY_LABELS[s.activity].split(' ')[0]} {s.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {s.crew.length} crew · {s.entries.length}{' '}
              {s.entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              {formatAuec(net)}
            </span>
            <span className="text-slate-500">{expanded ? '▾' : '▸'}</span>
          </span>
        </button>
        {expanded && (
          <SessionDetail
            session={s}
            onPatch={(patch) => updateOpsSession(s.id, patch)}
            onRemove={() => {
              if (window.confirm(`Delete "${s.name}"? This cannot be undone.`)) {
                void removeOpsSession(s.id)
              }
            }}
          />
        )}
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
        Run a session with your crew, log every sale and fee, and split the take fairly —
        then paste the payout summary straight into Discord.
      </p>

      {formOpen && (
        <form
          onSubmit={submit}
          className="mb-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
                onChange={(e) => setActivity(e.target.value as OpsActivity)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                {(Object.keys(ACTIVITY_LABELS) as OpsActivity[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field
            label="Crew (comma-separated, you're included automatically)"
            placeholder="StarHopper, VoidRunner, DustMiner"
            value={crewInput}
            onChange={(e) => setCrewInput(e.target.value)}
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Start session'}
          </Button>
        </form>
      )}

      {sessions.length === 0 && (
        <EmptyState>
          No sessions yet. Start one before your next mining or salvage run.
        </EmptyState>
      )}

      {open.length > 0 && <ul className="space-y-2">{open.map(renderSession)}</ul>}

      {closed.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Closed <Badge tone="slate">{closed.length}</Badge>
          </h3>
          <ul className="space-y-2">{closed.map(renderSession)}</ul>
        </div>
      )}
    </Card>
  )
}
