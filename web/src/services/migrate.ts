import { SCHEMA_VERSION } from './types'
import type { Acquisition, ConfigurationRole, Loadout, Ship } from './types'

/**
 * Schema migrations for the persisted blob.
 *
 * Data lives as one JSON document per player, so a reshape is a normalizer at
 * read time rather than a SQL migration — no downtime, no backend deploy. The
 * rule is that this runs before any component sees the data, so nothing
 * downstream ever has to understand more than one shape.
 *
 * Migrations must be idempotent: a blob already at the current version passes
 * through untouched, and re-running a step must not corrupt a record.
 */

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Legacy free text put acquisition inside notes as "Acquired: Pledge". */
const ACQUISITION_FROM_TEXT: Record<string, Acquisition> = {
  pledge: 'pledge',
  pledged: 'pledge',
  'bought in-game': 'in-game',
  'bought in game': 'in-game',
  'in-game': 'in-game',
  'in game': 'in-game',
  'aUEC': 'in-game',
  loaner: 'loaner',
  gift: 'gift',
  gifted: 'gift',
}

/**
 * Pull a leading "Acquired: X" out of the notes field, returning the parsed
 * acquisition and whatever text the player actually wrote.
 */
export function splitAcquisitionFromNotes(notes: string): {
  acquisition: Acquisition
  notes?: string
} {
  const match = notes.match(/acquired:\s*([^·|\n]+)/i)
  if (!match) return { acquisition: 'unknown', notes: notes.trim() || undefined }

  const raw = match[1].trim().toLowerCase()
  // Match on a contained keyword so "Bought in-game (aUEC)" still resolves.
  const key = Object.keys(ACQUISITION_FROM_TEXT).find((k) => raw.includes(k))
  const rest = (notes.slice(0, match.index) + notes.slice(match.index! + match[0].length))
    .replace(/^[\s·|,-]+|[\s·|,-]+$/g, '')
    .trim()

  return {
    acquisition: key ? ACQUISITION_FROM_TEXT[key] : 'unknown',
    notes: rest || undefined,
  }
}

const ROLES: ConfigurationRole[] = [
  'cargo',
  'combat',
  'mining',
  'medical',
  'exploration',
  'salvage',
  'racing',
  'multi-role',
]

/** Best-effort read of a legacy free-text `type` as a configuration role. */
function roleFromLegacyType(type: string): ConfigurationRole {
  const t = type.toLowerCase()
  const direct = ROLES.find((role) => t.includes(role.replace('-', ' ')) || t.includes(role))
  if (direct) return direct
  if (t.includes('freight') || t.includes('hauler') || t.includes('transport')) return 'cargo'
  if (t.includes('fighter') || t.includes('gunship') || t.includes('bomber')) return 'combat'
  if (t.includes('refin')) return 'mining'
  if (t.includes('explor') || t.includes('pathfind')) return 'exploration'
  return 'multi-role'
}

/** Migrate one v1 ship record. Already-migrated records pass through. */
function migrateShip(raw: unknown): Ship {
  const r = (raw ?? {}) as Record<string, unknown>

  // A record that already carries the v2 axes is left alone.
  if (typeof r.state === 'string' && typeof r.availability === 'string') {
    return {
      ...(r as unknown as Ship),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    }
  }

  const legacyNotes = str(r.notes)
  const { acquisition, notes } = splitAcquisitionFromNotes(legacyNotes)
  const name = str(r.name)

  return {
    id: str(r.id) || uid(),
    catalogId: typeof r.catalogId === 'string' ? r.catalogId : undefined,
    // v1 had a single name doing both jobs. Seeding both from it keeps the
    // display identical, and the player can rename either half afterwards.
    name,
    model: str(r.model) || name,
    manufacturer: str(r.manufacturer),
    state: 'owned',
    // Deliberately conservative: understating readiness costs one tap to fix,
    // while overstating it means the app confidently claims a ship is mission
    // capable when it is sitting in storage.
    availability: 'stored',
    configurationRole: roleFromLegacyType(str(r.type)),
    acquisition,
    insurance: { type: 'none' },
    isPrimary: false,
    tags: [],
    notes,
  }
}

/**
 * Relink a name-based loadout to a ship id.
 *
 * A name that matches two ships attaches to neither: guessing would silently
 * bind a build to the wrong hull, and a visibly unlinked loadout is a problem
 * the player can see and fix. The original name is retained either way.
 */
function migrateLoadout(raw: unknown, fleet: Ship[]): Loadout {
  const r = (raw ?? {}) as Record<string, unknown>
  if (typeof r.shipId === 'string') return r as unknown as Loadout

  const legacyName = str(r.ship)
  const key = legacyName.trim().toLowerCase()
  const matches = fleet.filter(
    (ship) =>
      ship.name.trim().toLowerCase() === key || ship.model.trim().toLowerCase() === key,
  )

  return {
    id: str(r.id) || uid(),
    name: str(r.name),
    shipId: matches.length === 1 ? matches[0].id : '',
    shipNameAtMigration: legacyName || undefined,
    savedInGame: r.savedInGame === true,
    components: Array.isArray(r.components) ? (r.components as Loadout['components']) : [],
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  }
}

type Migratable = {
  schemaVersion?: number
  fleet?: unknown
  loadouts?: unknown
}

/**
 * Bring a persisted blob up to the current schema. Safe to call on data of any
 * version, including data already current.
 */
export function migrateAppData<T extends object>(blob: T): T & { schemaVersion: number } {
  const b = blob as Migratable
  const version = typeof b.schemaVersion === 'number' ? b.schemaVersion : 1

  if (version >= SCHEMA_VERSION) {
    return { ...blob, schemaVersion: version }
  }

  const fleet = (Array.isArray(b.fleet) ? b.fleet : []).map(migrateShip)
  const loadouts = (Array.isArray(b.loadouts) ? b.loadouts : []).map((lo) =>
    migrateLoadout(lo, fleet),
  )

  return { ...blob, fleet, loadouts, schemaVersion: SCHEMA_VERSION }
}

/**
 * Guard against a stale tab writing an older shape back over a newer one.
 *
 * The migration runs client-side, so a tab opened before a deploy still holds
 * v1 data in memory. Without this it could save that over a migrated blob and
 * undo the upgrade.
 */
export function isSafeToWrite(incomingVersion: number | undefined, storedVersion: number | undefined): boolean {
  return (incomingVersion ?? 1) >= (storedVersion ?? 1)
}
