import { useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, EmptyState, Field } from '../../components/ui'
import { ActionModule, DataModule } from '../../components/modules'
import {
  activeContracts,
  contractProgress,
  deliveredContracts,
  formatAuec,
  routeGroups,
} from '../../services/haulingInsights'
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

const INPUT =
  'rounded-control border border-line-subtle bg-hull-950 px-3 py-2 text-sm text-hull-100 placeholder-hull-500 transition-colors duration-snap ease-ui focus:border-brand-500 focus:outline-none'

/**
 * The mission-stacking view: every unfinished stop across all active
 * contracts, grouped by location so a hauler can plan one efficient loop
 * instead of flying each contract separately.
 *
 * This is the page's decision tool, so it sits above the contract inventory —
 * a list of contracts tells you what you owe; this tells you where to fly.
 */
function RouteBoard({
  contracts,
  onToggleStop,
}: {
  contracts: HaulingContract[]
  onToggleStop: (contractId: string, stopId: string) => void
}) {
  const groups = routeGroups(contracts)
  if (groups.length === 0) return null

  return (
    <DataModule
      title="Route board"
      description="Every remaining stop, grouped by location. Hit each place once and tick them off as you go."
    >
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.location.toLowerCase()}>
            <h3 className="font-mono text-label uppercase text-hull-400">{g.location}</h3>
            <ul className="mt-2 space-y-1.5">
              {g.stops.map(({ contract, stop }) => (
                <li key={stop.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={stop.done}
                      onChange={() => onToggleStop(contract.id, stop.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-hull-600 bg-hull-900 accent-brand-500"
                    />
                    <span className="min-w-0">
                      <span
                        className={
                          stop.kind === 'pickup' ? 'text-brand-300' : 'text-positive-300'
                        }
                      >
                        {stop.kind === 'pickup' ? 'Pick up' : 'Drop off'}
                      </span>{' '}
                      <span className="text-hull-100">
                        {stop.scu > 0 ? `${stop.scu} SCU ` : ''}
                        {stop.commodity || 'cargo'}
                      </span>
                      <span className="block truncate text-xs text-hull-500">
                        {contract.name}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DataModule>
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

  const active = activeContracts(contracts)
  const delivered = deliveredContracts(contracts)

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
    <div className="space-y-6 sm:space-y-8">
      <RouteBoard contracts={contracts} onToggleStop={toggleStop} />

      {contracts.length === 0 && (
        <EmptyState>
          No contracts logged. Grab hauling missions in game, then log them here and fly
          one efficient loop.
        </EmptyState>
      )}

      {active.length > 0 && (
        <DataModule
          title="Active contracts"
          description="What you have committed to move."
        >
          <ul className="space-y-4">
            {active.map((c) => {
              const p = contractProgress(c)
              return (
                <li key={c.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-hull-100">{p.name}</p>
                      <p className="mt-0.5 text-xs text-hull-400">
                        {p.done}/{p.total} stops
                        {p.reward ? ` · ${formatAuec(p.reward)}` : ''}
                      </p>
                      {c.notes && (
                        <p className="mt-1 text-xs text-hull-500">{c.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="quiet"
                      className="shrink-0"
                      onClick={() => removeHauling(c.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-hull-800">
                    <div
                      className={`h-full rounded-full transition-all duration-ui ease-ui motion-reduce:transition-none ${
                        p.remaining === 0 ? 'bg-positive-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </DataModule>
      )}

      {delivered.length > 0 && (
        <DataModule
          title="Delivered"
          description={`${delivered.length} completed ${delivered.length === 1 ? 'contract' : 'contracts'}.`}
          action={
            <Button variant="ghost" onClick={() => setShowDelivered((v) => !v)}>
              {showDelivered ? 'Hide' : 'Show'}
            </Button>
          }
        >
          {showDelivered ? (
            <ul className="space-y-3">
              {delivered.map((c) => {
                const p = contractProgress(c)
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-hull-300">{p.name}</p>
                      {p.reward > 0 && (
                        <p className="text-xs text-positive-300">{formatAuec(p.reward)}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" onClick={() => reopen(c.id)}>
                        Reopen
                      </Button>
                      <Button variant="quiet" onClick={() => removeHauling(c.id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-hull-500">Hidden — show to reopen or remove.</p>
          )}
        </DataModule>
      )}

      {/* Input, recessed below the page surface: what you put in should not
          look like what you take out. */}
      <ActionModule title="Log a contract">
        {!formOpen ? (
          <Button onClick={() => setFormOpen(true)}>Log contract</Button>
        ) : (
          <form onSubmit={submit} className="space-y-3">
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
              <span className="mb-1 block font-mono text-label uppercase text-hull-400">
                Stops
              </span>
              <div className="space-y-2">
                {stops.map((s) => (
                  <div
                    key={s.key}
                    className="grid gap-2 rounded-control border border-line-subtle bg-hull-900 p-2 sm:grid-cols-[auto_1fr_1fr_5rem_auto]"
                  >
                    <select
                      aria-label="Stop kind"
                      value={s.kind}
                      onChange={(e) =>
                        patchDraftStop(s.key, {
                          kind: e.target.value as 'pickup' | 'dropoff',
                        })
                      }
                      className={INPUT}
                    >
                      <option value="pickup">Pick up</option>
                      <option value="dropoff">Drop off</option>
                    </select>
                    <input
                      aria-label="Location"
                      placeholder="Location (e.g. Everus Harbor)"
                      value={s.location}
                      onChange={(e) => patchDraftStop(s.key, { location: e.target.value })}
                      className={INPUT}
                    />
                    <input
                      aria-label="Commodity"
                      placeholder="Commodity (e.g. Agricium)"
                      value={s.commodity}
                      onChange={(e) =>
                        patchDraftStop(s.key, { commodity: e.target.value })
                      }
                      className={INPUT}
                    />
                    <input
                      aria-label="SCU"
                      type="number"
                      min={0}
                      placeholder="SCU"
                      value={s.scu}
                      onChange={(e) => patchDraftStop(s.key, { scu: e.target.value })}
                      className={INPUT}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Remove stop"
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

            {formError && <p className="text-sm text-caution-300">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add contract'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm()
                  setFormOpen(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </ActionModule>
    </div>
  )
}
