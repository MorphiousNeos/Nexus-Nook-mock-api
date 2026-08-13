import { attentionItems } from './fleetInsights'
import {
  contractProgress,
  haulingAlerts,
  type ContractProgress,
} from './haulingInsights'
import type { AppState, BlueprintEntry, OpsActivity, OpsSession } from './types'

export type { ContractProgress }

/**
 * Derived overview insight.
 *
 * Overview is the only page that has to answer a question no single domain
 * can: "what should I do next?" So this file composes signals across fleet,
 * hauling, ops and blueprints rather than owning any of them — fleet
 * attention still comes from fleetInsights, because two implementations of
 * the same question would eventually disagree.
 *
 * Same discipline as fleetInsights: everything is computed on demand and
 * nothing is persisted. No timestamps exist in the model, so nothing here
 * orders by recency — an invented chronology would be worse than none.
 */

/** Coerce anything a store or API might hand back into a safe finite number. */
function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** The persisted blob is user-editable JSON, so a field may not be an array. */
function list<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function titleOf(name: string | undefined, fallback: string): string {
  return (name ?? '').trim() || fallback
}

/* ------------------------------------------------------------- attention -- */

export type OverviewAlert = {
  id: string
  tone: 'caution' | 'danger'
  title: string
  detail: string
  /** Where the user goes to act on it. An alert with nowhere to go is a stat. */
  to: string
}

/** A blueprint that is fully gathered but not yet marked crafted. */
function blueprintIsReady(bp: BlueprintEntry): boolean {
  if (!bp || bp.status === 'crafted') return false
  const mats = list(bp.materials).filter((m) => num(m?.need) > 0)
  if (mats.length === 0) return false
  return mats.every((m) => num(m.have) >= num(m.need))
}

/**
 * Everything across the app that is waiting on a decision, most urgent first.
 *
 * Deliberately narrow, matching the rule Fleet set: an item earns a place here
 * only when there is something to *do* about it. Counts without an action
 * behind them belong in the summary readout instead.
 */
export function overviewAlerts(state: AppState | null, now = Date.now()): OverviewAlert[] {
  if (!state) return []

  const alerts: OverviewAlert[] = list(state.fleet).length
    ? attentionItems(list(state.fleet), list(state.loadouts), now).map((item) => ({
        id: item.id,
        tone: item.tone,
        title: item.title,
        detail: item.detail,
        to: '/fleet',
      }))
    : []

  // Hauling owns its own rule for what needs a decision; Overview only adds
  // the route to act on it. Two implementations would eventually disagree.
  for (const a of haulingAlerts(list(state.hauling))) {
    alerts.push({ ...a, to: '/hauling' })
  }

  for (const bp of list(state.blueprints)) {
    if (!blueprintIsReady(bp)) continue
    alerts.push({
      id: `bp-ready-${bp.id}`,
      tone: 'caution',
      title: `${titleOf(bp.name, 'Untitled blueprint')} has every material`,
      detail: 'Nothing left to gather — this one is ready to craft.',
      to: '/blueprints',
    })
  }

  // Danger before caution; otherwise the order each domain produced.
  return alerts.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'danger' ? -1 : 1))
}

/* ------------------------------------------------------------- in flight -- */

export type SessionProgress = {
  id: string
  name: string
  activity: OpsActivity
  crew: number
  net: number
}

export type InFlight = {
  contracts: ContractProgress[]
  sessions: SessionProgress[]
  /** Sum of the payouts the player recorded against contracts still running. */
  pendingReward: number
  /** Running net across open sessions. Can legitimately be negative. */
  opsNet: number
  count: number
}

function sessionProgress(s: OpsSession): SessionProgress {
  return {
    id: s.id,
    name: titleOf(s.name, 'Untitled session'),
    activity: s.activity,
    crew: list(s?.crew).length,
    net: list(s?.entries).reduce((sum, e) => sum + num(e?.amount), 0),
  }
}

/**
 * Work the player has started and not finished.
 *
 * Contracts are ordered by how close they are to done, because the nearest one
 * to finishing is the one worth picking back up. Sessions are ordered by net,
 * largest first, since that is the only magnitude a session carries.
 */
export function inFlight(state: AppState | null): InFlight {
  if (!state) {
    return { contracts: [], sessions: [], pendingReward: 0, opsNet: 0, count: 0 }
  }

  const contracts = list(state.hauling)
    .filter((c) => c?.status === 'active')
    .map(contractProgress)
    .sort((a, b) => a.remaining - b.remaining || b.reward - a.reward)

  const sessions = list(state.opsSessions)
    .filter((s) => s && !s.closed)
    .map(sessionProgress)
    .sort((a, b) => b.net - a.net)

  return {
    contracts,
    sessions,
    pendingReward: contracts.reduce((sum, c) => sum + c.reward, 0),
    opsNet: sessions.reduce((sum, s) => sum + s.net, 0),
    count: contracts.length + sessions.length,
  }
}

/* ---------------------------------------------------------------- totals -- */

/** True when the player has not recorded anything yet, anywhere. */
export function isNewOperation(state: AppState | null): boolean {
  if (!state) return true
  return (
    list(state.fleet).length === 0 &&
    list(state.hauling).length === 0 &&
    list(state.opsSessions).length === 0 &&
    list(state.inventory).length === 0 &&
    list(state.blueprints).length === 0
  )
}

/** Units across the manifest, which is a different figure from line count. */
export function inventoryUnits(state: AppState | null): number {
  if (!state) return 0
  return list(state.inventory).reduce((sum, i) => sum + num(i?.qty), 0)
}

export function formatAuec(n: number): string {
  return `${Math.round(n).toLocaleString()} aUEC`
}
