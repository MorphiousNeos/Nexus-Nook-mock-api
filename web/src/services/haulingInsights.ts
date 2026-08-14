import type { HaulingContract, HaulingStop } from './types'

/**
 * Derived hauling insight.
 *
 * The single home for every question asked about contracts, so Overview and
 * the Hauling page cannot answer the same question differently. Contract
 * progress and the "ready to close out" rule previously lived in
 * overviewInsights; they moved here and Overview now imports them.
 *
 * Nothing is persisted, and nothing here orders by time: a HaulingContract
 * carries no timestamp, so any notion of "recent" or "oldest" would be
 * invented rather than derived.
 */

/** Coerce anything a store or API might hand back into a safe finite number. */
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** The persisted blob is user-editable JSON, so a field may not be an array. */
function list<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

export function contractName(c: HaulingContract): string {
  return (c?.name ?? '').trim() || 'Untitled contract'
}

export function formatAuec(n: number): string {
  return `${Math.round(n).toLocaleString()} aUEC`
}

/* -------------------------------------------------------------- progress -- */

export type ContractProgress = {
  id: string
  name: string
  done: number
  total: number
  remaining: number
  reward: number
}

export function contractProgress(c: HaulingContract): ContractProgress {
  const stops = list(c?.stops)
  const done = stops.filter((s) => s?.done).length
  return {
    id: c.id,
    name: contractName(c),
    done,
    total: stops.length,
    remaining: Math.max(0, stops.length - done),
    reward: Math.max(0, num(c?.reward)),
  }
}

export function activeContracts(contracts: HaulingContract[]): HaulingContract[] {
  return list(contracts).filter((c) => c?.status === 'active')
}

export function deliveredContracts(contracts: HaulingContract[]): HaulingContract[] {
  return list(contracts).filter((c) => c?.status === 'delivered')
}

/**
 * All stops are done but the contract is still active.
 *
 * Reachable: finishing the last stop marks a contract delivered automatically,
 * but reopening a delivered contract leaves every stop ticked and the status
 * back on active. That is the state worth surfacing.
 */
export function contractIsCloseable(c: HaulingContract): boolean {
  const stops = list(c?.stops)
  return c?.status === 'active' && stops.length > 0 && stops.every((s) => s?.done)
}

export function closeableContracts(contracts: HaulingContract[]): HaulingContract[] {
  return list(contracts).filter(contractIsCloseable)
}

/* ---------------------------------------------------------------- totals -- */

export type HaulingTotals = {
  activeCount: number
  deliveredCount: number
  /** Stops not yet ticked, across active contracts only. */
  stopsRemaining: number
  stopsDone: number
  stopsTotal: number
  /** SCU still to collect: pickup stops not yet ticked. */
  remainingScu: number
  /** Payouts recorded against contracts still running. */
  pendingReward: number
}

export function haulingTotals(contracts: HaulingContract[]): HaulingTotals {
  const active = activeContracts(contracts)
  let stopsRemaining = 0
  let stopsDone = 0
  let stopsTotal = 0
  let remainingScu = 0
  let pendingReward = 0

  for (const c of active) {
    pendingReward += Math.max(0, num(c.reward))
    for (const s of list(c.stops)) {
      stopsTotal += 1
      if (s?.done) stopsDone += 1
      else {
        stopsRemaining += 1
        // Only pickups add cargo you still have to collect; a pending dropoff
        // is cargo already in the hold.
        if (s?.kind === 'pickup') remainingScu += Math.max(0, num(s.scu))
      }
    }
  }

  return {
    activeCount: active.length,
    deliveredCount: deliveredContracts(contracts).length,
    stopsRemaining,
    stopsDone,
    stopsTotal,
    remainingScu,
    pendingReward,
  }
}

/* ------------------------------------------------------------- attention -- */

export type HaulingAlert = {
  id: string
  tone: 'caution' | 'danger'
  title: string
  detail: string
}

/**
 * Contracts waiting on a decision. Narrow by design: an entry earns a place
 * only when there is something to do about it.
 */
export function haulingAlerts(contracts: HaulingContract[]): HaulingAlert[] {
  const alerts: HaulingAlert[] = []

  for (const c of list(contracts)) {
    if (contractIsCloseable(c)) {
      alerts.push({
        id: `haul-done-${c.id}`,
        tone: 'caution',
        title: `${contractName(c)} is ready to close out`,
        detail: 'Every stop is done — mark it delivered to clear it from your board.',
      })
      continue
    }
    // A contract with no stops cannot be flown or completed. The compose form
    // prevents this, but a blob written by an older build could carry one.
    if (c?.status === 'active' && list(c.stops).length === 0) {
      alerts.push({
        id: `haul-empty-${c.id}`,
        tone: 'caution',
        title: `${contractName(c)} has no stops`,
        detail: 'Add at least one pickup or dropoff, or remove the contract.',
      })
    }
  }

  return alerts
}

/* ----------------------------------------------------------- route board -- */

export type RouteGroup = {
  location: string
  stops: { contract: HaulingContract; stop: HaulingStop }[]
}

/**
 * Every unfinished stop across active contracts, grouped by location, so a
 * hauler can fly one loop instead of running each contract separately.
 *
 * Locations holding a pickup sort first — you cannot drop off cargo you have
 * not collected — then alphabetically for a stable, scannable order.
 */
export function routeGroups(contracts: HaulingContract[]): RouteGroup[] {
  const byLocation = new Map<string, RouteGroup>()

  for (const contract of activeContracts(contracts)) {
    for (const stop of list(contract.stops)) {
      if (stop?.done) continue
      const key = (stop?.location ?? '').trim().toLowerCase() || 'unknown'
      const entry = byLocation.get(key) ?? {
        location: (stop?.location ?? '').trim() || 'Unknown location',
        stops: [],
      }
      entry.stops.push({ contract, stop })
      byLocation.set(key, entry)
    }
  }

  return [...byLocation.values()].sort((a, b) => {
    const aPickup = a.stops.some((s) => s.stop.kind === 'pickup')
    const bPickup = b.stops.some((s) => s.stop.kind === 'pickup')
    if (aPickup !== bPickup) return aPickup ? -1 : 1
    return a.location.localeCompare(b.location)
  })
}
