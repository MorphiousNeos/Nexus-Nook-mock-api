import { useMemo, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field } from '../../components/ui'
import type { HaulingContract, HaulingStop } from '../../services/types'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Draft stop rows used while composing a new contract. */
type DraftStop = {
  key: string
  kind: 'pickup' | 'dropoff'
  location: string
  commodity: string
  scu: string
}

function emptyDraftStop(kind: 'pickup' | 'dropoff'): DraftStop {
  return { key: uid(), kind, location: '', commodity: '', scu: '' }
}

function formatAuec(n: number): string {
  return `${n.toLocaleString()} aUEC`
}

/**
 * The mission-stacking view: every unfinished stop across all active
 * contracts, grouped by location so a hauler can plan one efficient loop
 * instead of flying each contract separately.
 */
function RouteBoard({
  contracts,
  onToggleStop,
}: {
  contracts: HaulingContract[]
  onToggleStop: (contractId: string, stopId: string) => void
}) {
  const groups = useMemo(() => {
    const byLocation = new Map<
      string,
      { location: string; stops: { contract: HaulingContract; stop: HaulingStop }[] }
    >()
    for (const contract of contracts) {
      if (contract.status !== 'active') continue
      for (const stop of contract.stops) {
        if (stop.done) continue
        const key = stop.location.trim().toLowerCase() || 'unknown'
        const entry = byLocation.get(key) ?? {
          location: stop.location.trim() || 'Unknown location',
          stops: [],
        }
        entry.stops.push({ contract, stop })
        byLocation.set(key, entry)
      }
    }
    // Locations with pickups first (you must pick up before you can drop off),
    // then alphabetical for a stable, scannable list.
    return Array.from(byLocation.values()).sort((a, b) => {
      const aHasPickup = a.stops.some((s) => s.stop.kind === 'pickup')
      const bHasPickup = b.stops.some((s) => s.stop.kind === 'pickup')
      if (aHasPickup !== bHasPickup) return aHasPickup ? -1 : 1
      return a.location.localeCompare(b.location)
    })
  }, [contracts])

  if (groups.length === 0) return null

  return (
    <div className="mb-5 rounded-xl border border-purple-900/50 bg-purple-950/15 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-purple-300">
        Route board — all remaining stops by location
      </h3>
      <p className="mt-1 text-[11px] text-slate-500">
        Stack your missions: hit each location once. Check off stops as you go.
      </p>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <div
            key={g.location.toLowerCase()}
            className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
          >
            <p className="font-medium text-slate-100">📍 {g.location}</p>
            <ul className="mt-2 space-y-1.5">
              {g.stops.map(({ contract, stop }) => (
                <li key={stop.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={stop.done}
                      onChange={() => onToggleStop(contract.id, stop.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-purple-500"
                    />
                    <span
                      className={
                        stop.kind === 'pickup' ? 'text-sky-300' : 'text-emerald-300'
                      }
                    >
                      {stop.kind === 'pickup' ? '⬆ Pick up' : '⬇ Drop off'}
                    </span>
                    <span className="text-slate-200">
                      {stop.scu > 0 ? `${stop.scu} SCU ` : ''}
                      {stop.commodity || 'cargo'}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      · {contract.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HaulingCard() {
  const { state, addHauling, updateHauling, removeHauling } = useSession()
  const contracts = state!.hauling

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [reward, setReward] = useState('')
  const [notes, setNotes] = useState('')
  const [stops, setStops] = useState<DraftStop[]>([
    emptyDraftStop('pickup'),
    emptyDraftStop('dropoff'),
  ])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDelivered, setShowDelivered] = useState(false)

  const active = contracts.filter((c) => c.status === 'active')
  const delivered = contracts.filter((c) => c.status === 'delivered')

  const totals = useMemo(() => {
    let pendingReward = 0
    let remainingScu = 0
    for (const c of active) {
      pendingReward += c.reward ?? 0
      for (const s of c.stops) {
        if (!s.done && s.kind === 'pickup') remainingScu += s.scu
      }
    }
    return { pendingReward, remainingScu }
  }, [active])

  function patchDraftStop(key: string, patch: Partial<DraftStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function resetForm() {
    setName('')
    setReward('')
    setNotes('')
    setStops([emptyDraftStop('pickup'), emptyDraftStop('dropoff')])
    setFormError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setFormError('Give the contract a name (e.g. "Covalex — Ship to Seraphim").')
      return
    }
    const cleanStops: Omit<HaulingStop, 'id'>[] = stops
      .filter((s) => s.location.trim() || s.commodity.trim())
      .map((s) => ({
        kind: s.kind,
        location: s.location.trim(),
        commodity: s.commodity.trim(),
        scu: Math.max(0, parseInt(s.scu, 10) || 0),
        done: false,
      }))
    if (cleanStops.length === 0) {
      setFormError('Add at least one stop with a location.')
      return
    }
    setBusy(true)
    try {
      await addHauling({
        name: name.trim(),
        reward: Math.max(0, parseInt(reward, 10) || 0) || undefined,
        notes: notes.trim() || undefined,
        status: 'active',
        stops: cleanStops.map((s) => ({ ...s, id: uid() })),
      })
      resetForm()
      setFormOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function toggleStop(contractId: string, stopId: string) {
    const contract = contracts.find((c) => c.id === contractId)
    if (!contract) return
    const nextStops = contract.stops.map((s) =>
      s.id === stopId ? { ...s, done: !s.done } : s,
    )
    const allDone = nextStops.length > 0 && nextStops.every((s) => s.done)
    await updateHauling(contractId, {
      stops: nextStops,
      status: allDone ? 'delivered' : 'active',
    })
  }

  async function reopen(contractId: string) {
    await updateHauling(contractId, { status: 'active' })
  }

  return (
    <Card
      title="Hauling Planner"
      icon="🚚"
      action={
        <Button
          variant={formOpen ? 'ghost' : 'primary'}
          onClick={() => setFormOpen((o) => !o)}
        >
          {formOpen ? 'Close' : 'Log contract'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Log your cargo contracts, stack the stops into one route, and check them off as
        you fly.
      </p>

      {active.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="purple">
            {active.length} active {active.length === 1 ? 'contract' : 'contracts'}
          </Badge>
          {totals.pendingReward > 0 && (
            <Badge tone="green">{formatAuec(totals.pendingReward)} pending</Badge>
          )}
          {totals.remainingScu > 0 && (
            <Badge tone="slate">{totals.remainingScu} SCU left to pick up</Badge>
          )}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={submit}
          className="mb-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Contract name"
              placeholder="Covalex — Ship to Seraphim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Field
              label="Reward (aUEC, optional)"
              type="number"
              min={0}
              placeholder="45000"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Stops
            </span>
            <div className="space-y-2">
              {stops.map((s) => (
                <div
                  key={s.key}
                  className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 sm:grid-cols-[auto_1fr_1fr_5rem_auto]"
                >
                  <select
                    value={s.kind}
                    onChange={(e) =>
                      patchDraftStop(s.key, {
                        kind: e.target.value as 'pickup' | 'dropoff',
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="pickup">⬆ Pick up</option>
                    <option value="dropoff">⬇ Drop off</option>
                  </select>
                  <input
                    placeholder="Location (e.g. Everus Harbor)"
                    value={s.location}
                    onChange={(e) => patchDraftStop(s.key, { location: e.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    placeholder="Commodity (e.g. Agricium)"
                    value={s.commodity}
                    onChange={(e) => patchDraftStop(s.key, { commodity: e.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="SCU"
                    value={s.scu}
                    onChange={(e) => patchDraftStop(s.key, { scu: e.target.value })}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setStops((prev) =>
                        prev.length > 1 ? prev.filter((x) => x.key !== s.key) : prev,
                      )
                    }
                    disabled={stops.length <= 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStops((prev) => [...prev, emptyDraftStop('pickup')])}
              >
                + Pickup
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStops((prev) => [...prev, emptyDraftStop('dropoff')])}
              >
                + Dropoff
              </Button>
            </div>
          </div>

          <Field
            label="Notes (optional)"
            placeholder="Watch for the armistice zone exit…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {formError && <p className="text-sm text-amber-300">{formError}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add contract'}
          </Button>
        </form>
      )}

      <RouteBoard contracts={contracts} onToggleStop={toggleStop} />

      {contracts.length === 0 && (
        <EmptyState>
          No contracts logged. Grab hauling missions in game, then log them here and fly
          one efficient loop.
        </EmptyState>
      )}

      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((c) => {
            const doneCount = c.stops.filter((s) => s.done).length
            return (
              <li
                key={c.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {doneCount}/{c.stops.length} stops
                      {c.reward ? ` · ${formatAuec(c.reward)}` : ''}
                    </p>
                    {c.notes && <p className="mt-1 text-xs text-slate-500">{c.notes}</p>}
                  </div>
                  <Button
                    variant="danger"
                    className="shrink-0"
                    onClick={() => removeHauling(c.id)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-purple-500 transition-all"
                    style={{
                      width: `${c.stops.length ? (doneCount / c.stops.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {delivered.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDelivered((v) => !v)}
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300"
          >
            Delivered ({delivered.length}) {showDelivered ? '▾' : '▸'}
          </button>
          {showDelivered && (
            <ul className="mt-2 space-y-2">
              {delivered.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-300">
                      ✅ {c.name}
                    </p>
                    {c.reward ? (
                      <p className="text-xs text-emerald-400">{formatAuec(c.reward)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" onClick={() => reopen(c.id)}>
                      Reopen
                    </Button>
                    <Button variant="danger" onClick={() => removeHauling(c.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
