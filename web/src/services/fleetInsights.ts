import type {
  Availability,
  ConfigurationRole,
  Loadout,
  Ship,
} from './types'

/**
 * Derived fleet insight.
 *
 * Everything here is computed from the fleet and its loadouts on demand, and
 * nothing is persisted — per the model's rule that a value which can be
 * recalculated should never be stored, because a stored copy can only drift
 * out of agreement with the records it was derived from.
 */

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  ready: 'Ready',
  stored: 'Stored',
  claiming: 'Awaiting claim',
  maintenance: 'Maintenance',
}

export const ROLE_LABEL: Record<ConfigurationRole, string> = {
  cargo: 'Cargo',
  combat: 'Combat',
  mining: 'Mining',
  medical: 'Medical',
  exploration: 'Exploration',
  salvage: 'Salvage',
  racing: 'Racing',
  'multi-role': 'Multi-role',
}

/** Wishlist hulls are plans, not assets — they never count toward readiness. */
export function operational(fleet: Ship[]): Ship[] {
  return fleet.filter((ship) => ship.state !== 'wishlist')
}

export type FleetReadiness = {
  total: number
  operationalCount: number
  ready: number
  stored: number
  claiming: number
  maintenance: number
  wishlist: number
  loaner: number
  primary?: Ship
}

export function readiness(fleet: Ship[]): FleetReadiness {
  const owned = operational(fleet)
  const count = (a: Availability) => owned.filter((s) => s.availability === a).length
  return {
    total: fleet.length,
    operationalCount: owned.length,
    ready: count('ready'),
    stored: count('stored'),
    claiming: count('claiming'),
    maintenance: count('maintenance'),
    wishlist: fleet.filter((s) => s.state === 'wishlist').length,
    loaner: fleet.filter((s) => s.state === 'loaner').length,
    primary: fleet.find((s) => s.isPrimary),
  }
}

/** Days until a timed policy lapses. Null when the policy cannot lapse. */
export function daysUntilInsuranceLapse(ship: Ship, now = Date.now()): number | null {
  if (ship.insurance.type !== 'timed') return null
  const at = Date.parse(ship.insurance.expiresAt)
  if (Number.isNaN(at)) return null
  return Math.ceil((at - now) / 86_400_000)
}

export type AttentionItem = {
  id: string
  tone: 'caution' | 'danger'
  title: string
  detail: string
}

/**
 * Things a player would want to act on, most urgent first.
 *
 * Deliberately narrow: an item earns a place here only if there is something
 * to *do* about it. A count with no action behind it belongs in the summary,
 * not in a list that is asking for attention.
 */
export function attentionItems(
  fleet: Ship[],
  loadouts: Loadout[],
  now = Date.now(),
): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const ship of fleet) {
    if (ship.state === 'wishlist') continue

    if (ship.availability === 'claiming') {
      items.push({
        id: `claim-${ship.id}`,
        tone: 'danger',
        title: `${ship.name} is awaiting a claim`,
        detail: 'Mark it ready once the claim completes.',
      })
    } else if (ship.availability === 'maintenance') {
      items.push({
        id: `maint-${ship.id}`,
        tone: 'caution',
        title: `${ship.name} is under maintenance`,
        detail: 'It will not count toward available ships until you clear it.',
      })
    }

    const days = daysUntilInsuranceLapse(ship, now)
    if (days !== null && days <= 30) {
      items.push({
        id: `ins-${ship.id}`,
        tone: days <= 7 ? 'danger' : 'caution',
        title:
          days < 0
            ? `${ship.name} insurance has lapsed`
            : `${ship.name} insurance lapses in ${days} ${days === 1 ? 'day' : 'days'}`,
        detail: 'Renew before flying it into anything expensive.',
      })
    }
  }

  // A build that the migration could not attach to a hull, because its name
  // matched more than one. Surfaced rather than silently dropped.
  for (const lo of loadouts) {
    if (lo.shipId) continue
    items.push({
      id: `unlinked-${lo.id}`,
      tone: 'caution',
      title: `"${lo.name}" is not attached to a ship`,
      detail: lo.shipNameAtMigration
        ? `It previously named "${lo.shipNameAtMigration}". Pick the right hull.`
        : 'Pick the hull this build belongs to.',
    })
  }

  // Danger before caution, otherwise original order.
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'danger' ? -1 : 1))
}

/** Owned hulls with no build attached — the most common gap worth closing. */
export function shipsWithoutLoadout(fleet: Ship[], loadouts: Loadout[]): Ship[] {
  return operational(fleet).filter(
    (ship) => !loadouts.some((lo) => lo.shipId === ship.id),
  )
}

/** Role distribution across operational hulls, largest first. */
export function roleBreakdown(fleet: Ship[]): Array<{ role: ConfigurationRole; count: number }> {
  const counts = new Map<ConfigurationRole, number>()
  for (const ship of operational(fleet)) {
    counts.set(ship.configurationRole, (counts.get(ship.configurationRole) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
}
