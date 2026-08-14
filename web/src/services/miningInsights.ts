import type { SharedOpsActivity, SharedOpsSummary } from './community'

/**
 * Derived ops insight.
 *
 * Pure functions over what the ops endpoint returns, because ops never enter
 * AppState — they are fetched, not persisted. Nothing here is stored.
 *
 * One thing shapes every figure below: GET /api/ops is unauthenticated and
 * returns *every* session from every player, not yours. So a bare count off
 * that list describes the community board, not your operation. Anything
 * presented as personal is therefore scoped to ops you own, using the same
 * `owner === displayName` test the session detail already uses.
 *
 * Ops you have merely *joined* cannot be identified from the list at all —
 * crew membership only appears in a per-session detail response — so nothing
 * here claims to know them.
 */

export const ACTIVITY_LABEL: Record<SharedOpsActivity, string> = {
  mining: 'Mining',
  salvage: 'Salvage',
  cargo: 'Cargo',
  other: 'Ops',
}

function list(sessions: SharedOpsSummary[] | null | undefined): SharedOpsSummary[] {
  return Array.isArray(sessions) ? sessions : []
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Ops this player created. The only ownership signal the list carries. */
export function ownedBy(sessions: SharedOpsSummary[], me: string): SharedOpsSummary[] {
  if (!me) return []
  return list(sessions).filter((s) => s?.owner === me)
}

export function openOps(sessions: SharedOpsSummary[]): SharedOpsSummary[] {
  return list(sessions).filter((s) => !s?.closed)
}

export function closedOps(sessions: SharedOpsSummary[]): SharedOpsSummary[] {
  return list(sessions).filter((s) => s?.closed)
}

export type OpsBoard = {
  /** Open ops this player owns. */
  yoursOpen: SharedOpsSummary[]
  yoursClosedCount: number
  /** Open ops across everyone, this player included. */
  boardOpenCount: number
  boardTotal: number
  /**
   * Net logged against the player's own open ops. This is each op's total,
   * not the player's cut — a share only exists once crew shares are known,
   * which needs a detail fetch.
   */
  loggedOnYours: number
  /** Crew across the player's own open ops. */
  crewOnYours: number
}

export function opsBoard(sessions: SharedOpsSummary[], me: string): OpsBoard {
  const all = list(sessions)
  const mine = ownedBy(all, me)
  const yoursOpen = openOps(mine)

  return {
    yoursOpen,
    yoursClosedCount: closedOps(mine).length,
    boardOpenCount: openOps(all).length,
    boardTotal: all.length,
    loggedOnYours: yoursOpen.reduce((sum, s) => sum + num(s.net), 0),
    crewOnYours: yoursOpen.reduce((sum, s) => sum + num(s.crewCount), 0),
  }
}

export type MiningAlert = {
  id: string
  tone: 'caution' | 'danger'
  title: string
  detail: string
}

/**
 * Ops waiting on a decision.
 *
 * Only one condition qualifies from list data alone. Creating an op enrols the
 * creator, so an open op of yours with nobody on it means the crew emptied —
 * worth knowing, and there is something to do about it.
 *
 * Deliberately absent: "no earnings logged". A net of zero cannot be told
 * apart from entries that cancel out, and guessing would be inventing.
 */
export function miningAlerts(sessions: SharedOpsSummary[], me: string): MiningAlert[] {
  return openOps(ownedBy(list(sessions), me))
    .filter((s) => num(s.crewCount) === 0)
    .map((s) => ({
      id: `ops-nocrew-${s.id}`,
      tone: 'caution' as const,
      title: `${s.name || 'Untitled session'} has no crew`,
      detail: 'Nobody is on this op. Share it with your crew, or close it out.',
    }))
}
