import { migrateAppData } from './migrate'
import { SCHEMA_VERSION } from './types'
import type {
  AppState,
  AuthInput,
  BlueprintEntry,
  HaulingContract,
  InventoryItem,
  Loadout,
  OpsSession,
  PlatformStatus,
  ServerStatus,
  Ship,
  Store,
  UserProfile,
} from './types'

const STORAGE_KEY = 'nexus-nook:state'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function loadRaw(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    // Normalize lists added after a session was first stored, then bring the
    // whole blob up to the current schema before anything else sees it.
    if (!Array.isArray(parsed.blueprints)) parsed.blueprints = []
    if (!Array.isArray(parsed.hauling)) parsed.hauling = []
    if (!Array.isArray(parsed.opsSessions)) parsed.opsSessions = []
    if (!Array.isArray(parsed.loadouts)) parsed.loadouts = []
    const migrated = migrateAppData(parsed) as unknown as AppState
    if (migrated.schemaVersion !== parsed.schemaVersion) persist(migrated)
    return migrated
  } catch {
    return null
  }
}

function persist(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Realistic-looking sample server data generated client-side for demo mode. */
function sampleServers(): ServerStatus[] {
  const rand = (min: number, max: number) =>
    Math.floor(min + Math.random() * (max - min))
  return [
    { region: 'US East', status: 'online', players: rand(420, 980), latency: rand(18, 55), capacity: rand(40, 95) },
    { region: 'US West', status: 'online', players: rand(380, 900), latency: rand(25, 70), capacity: rand(35, 90) },
    { region: 'EU Central', status: 'degraded', players: rand(500, 1100), latency: rand(60, 130), capacity: rand(70, 99) },
    { region: 'EU West', status: 'online', players: rand(300, 820), latency: rand(30, 80), capacity: rand(30, 88) },
    { region: 'Asia Pacific', status: 'maintenance', players: 0, latency: 0, capacity: 0 },
    { region: 'Oceania', status: 'online', players: rand(120, 400), latency: rand(80, 160), capacity: rand(20, 70) },
  ]
}

/**
 * Sample content for a brand-new demo profile so every section shows a working
 * example instead of an empty box. Every entry is labelled "(sample)" so it
 * reads as demo data and is safe to delete. Only ever used when a profile is
 * created for the first time — never merged into existing data.
 */
function seedFleet(): Ship[] {
  return [
    {
      id: uid(),
      name: 'Old Reliable',
      model: 'Cutlass Black',
      manufacturer: 'Drake Interplanetary',
      state: 'owned',
      availability: 'ready',
      configurationRole: 'salvage',
      acquisition: 'pledge',
      insurance: { type: 'lti' },
      isPrimary: true,
      tags: ['sample'],
      notes: 'Sample data · the one that always comes back.',
    },
    {
      id: uid(),
      name: 'Freelancer MAX',
      model: 'Freelancer MAX',
      manufacturer: 'Musashi Industrial & Starflight Concern',
      state: 'owned',
      availability: 'stored',
      configurationRole: 'cargo',
      acquisition: 'in-game',
      insurance: { type: 'timed', expiresAt: '2027-01-15' },
      isPrimary: false,
      tags: ['sample'],
      notes: 'Sample data · the bulk hauler.',
    },
    {
      id: uid(),
      name: 'Aurora MR',
      model: 'Aurora MR',
      manufacturer: 'Roberts Space Industries',
      state: 'owned',
      availability: 'claiming',
      configurationRole: 'multi-role',
      acquisition: 'pledge',
      insurance: { type: 'lti' },
      isPrimary: false,
      tags: ['sample'],
      notes: 'Sample data · the starter that never gets sold.',
    },
    {
      id: uid(),
      name: 'Vulture',
      model: 'Vulture',
      manufacturer: 'Drake Interplanetary',
      state: 'wishlist',
      availability: 'stored',
      configurationRole: 'salvage',
      acquisition: 'unknown',
      insurance: { type: 'none' },
      isPrimary: false,
      tags: ['sample'],
      notes: 'Sample data · planned next purchase.',
    },
  ]
}

function seedInventory(): InventoryItem[] {
  return [
    {
      id: uid(),
      name: 'Bolon Quantum Drive (sample)',
      qty: 2,
      notes: '[Quantum Drives] Spares for the Freelancer',
    },
    { id: uid(), name: 'MedPen (sample)', qty: 12, notes: '[Consumables] Ship locker restock' },
    { id: uid(), name: 'Laranite (sample)', qty: 32, notes: '[Commodities] Staged at Everus Harbor' },
    {
      id: uid(),
      name: 'P4-AR Rifle (sample)',
      qty: 3,
      notes: '[Weapons] Crew kit for salvage runs',
    },
  ]
}

function seedHauling(): HaulingContract[] {
  return [
    {
      id: uid(),
      name: 'Hurston loop — 4 stops (sample)',
      reward: 184500,
      status: 'active',
      notes: 'Sample contract · stack the pickups, then run both drops in one loop.',
      stops: [
        {
          id: uid(),
          kind: 'pickup',
          location: 'Lorville · Central Business District',
          commodity: 'Titanium',
          scu: 48,
          done: true,
        },
        {
          id: uid(),
          kind: 'pickup',
          location: 'HDMS-Edmond',
          commodity: 'Agricium',
          scu: 24,
          done: true,
        },
        {
          id: uid(),
          kind: 'dropoff',
          location: 'Everus Harbor',
          commodity: 'Titanium',
          scu: 48,
          done: false,
        },
        {
          id: uid(),
          kind: 'dropoff',
          location: 'Port Tressler',
          commodity: 'Agricium',
          scu: 24,
          done: false,
        },
      ],
    },
  ]
}

function seedOpsSessions(): OpsSession[] {
  return [
    {
      id: uid(),
      name: 'Aaron Halo mining run (sample)',
      activity: 'mining',
      crew: [
        { id: uid(), name: 'You (sample)', shares: 1 },
        { id: uid(), name: 'Vex — laser (sample)', shares: 1 },
        { id: uid(), name: 'Kestrel — hauler (sample)', shares: 0.5 },
      ],
      entries: [
        { id: uid(), label: 'Quantainium sold · ARC-L1', amount: 412000 },
        { id: uid(), label: 'Taranite sold · HUR-L2', amount: 96500 },
        { id: uid(), label: 'Refinery fees', amount: -38200 },
        { id: uid(), label: 'Fuel + repairs', amount: -12400 },
      ],
      closed: false,
    },
  ]
}

function seedBlueprints(): BlueprintEntry[] {
  return [
    {
      id: uid(),
      name: 'Ballistic Cannon Mk II (sample)',
      category: 'Weapons',
      status: 'found',
      source: 'Sample entry · ground bunker contracts',
      notes: 'Materials partly gathered — Quantanium is the blocker.',
      materials: [
        { id: uid(), name: 'Aluminium', need: 40, have: 40 },
        { id: uid(), name: 'Tungsten', need: 25, have: 11 },
        { id: uid(), name: 'Quantanium', need: 6, have: 0 },
      ],
    },
  ]
}

function seedLoadouts(shipId: string): Loadout[] {
  return [
    {
      id: uid(),
      name: 'Cutlass — salvage kit (sample)',
      shipId,
      savedInGame: true,
      notes: 'Sample loadout · what to re-buy after a wipe.',
      components: [
        {
          id: uid(),
          name: 'Bolon Quantum Drive',
          category: 'Quantum Drives',
          notes: 'Long-range jumps',
        },
        { id: uid(), name: 'Rush Cooler', category: 'Coolers' },
        { id: uid(), name: 'Warlock Shield Generator', category: 'Shield Generators' },
        { id: uid(), name: 'CF-337 Panther Repeater ×2', category: 'Weapons' },
      ],
    },
  ]
}

/**
 * Fully client-side store. No network, no real auth. "Login" just creates
 * or reuses a local profile in localStorage so a shared link works for anyone.
 */
export class LocalStore implements Store {
  readonly isDemo = true

  async getSession(): Promise<AppState | null> {
    return loadRaw()
  }

  async enter(input: AuthInput): Promise<AppState> {
    const existing = loadRaw()
    if (existing && existing.profile.email === input.email.trim()) {
      // Returning user — refresh display fields, keep their data.
      existing.profile.displayName = input.displayName.trim()
      if (input.rsiHandle !== undefined) {
        existing.profile.rsiHandle = input.rsiHandle.trim()
      }
      persist(existing)
      return existing
    }

    const fleet = seedFleet()
    const state: AppState = {
      schemaVersion: SCHEMA_VERSION,
      profile: {
        id: uid(),
        displayName: input.displayName.trim(),
        email: input.email.trim(),
        rsiHandle: (input.rsiHandle ?? '').trim(),
      },
      // First creation only — a returning profile is handled above and keeps
      // whatever the user already has, seeded or not.
      fleet,
      inventory: seedInventory(),
      blueprints: seedBlueprints(),
      hauling: seedHauling(),
      opsSessions: seedOpsSessions(),
      // The sample build attaches to the sample Cutlass by id, the same way a
      // real one would — seeded data should exercise the real relationship.
      loadouts: seedLoadouts(fleet[0]?.id ?? ''),
    }
    persist(state)
    return state
  }

  async logout(): Promise<void> {
    // Keep the data in localStorage but the app treats "no active flag" as
    // logged out by clearing the active session marker. For the demo we simply
    // remove stored state so a fresh visitor starts clean.
    localStorage.removeItem(STORAGE_KEY)
  }

  async deleteAccount(): Promise<void> {
    // Demo data lives entirely in this browser; deleting it is the deletion.
    localStorage.removeItem(STORAGE_KEY)
  }

  private mutate(fn: (s: AppState) => void): AppState {
    const state = loadRaw()
    if (!state) throw new Error('No active session')
    fn(state)
    persist(state)
    return state
  }

  async updateProfile(patch: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile> {
    const state = this.mutate((s) => {
      s.profile = { ...s.profile, ...patch }
    })
    return state.profile
  }

  async addShip(ship: Omit<Ship, 'id'>): Promise<Ship[]> {
    const state = this.mutate((s) => {
      s.fleet.push({ ...ship, id: uid() })
    })
    return state.fleet
  }

  async removeShip(id: string): Promise<Ship[]> {
    const state = this.mutate((s) => {
      s.fleet = s.fleet.filter((x) => x.id !== id)
    })
    return state.fleet
  }

  async addItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem[]> {
    const state = this.mutate((s) => {
      s.inventory.push({ ...item, id: uid() })
    })
    return state.inventory
  }

  async removeItem(id: string): Promise<InventoryItem[]> {
    const state = this.mutate((s) => {
      s.inventory = s.inventory.filter((x) => x.id !== id)
    })
    return state.inventory
  }

  async addBlueprint(entry: Omit<BlueprintEntry, 'id'>): Promise<BlueprintEntry[]> {
    const state = this.mutate((s) => {
      s.blueprints.push({ ...entry, id: uid() })
    })
    return state.blueprints
  }

  async updateBlueprint(
    id: string,
    patch: Partial<Omit<BlueprintEntry, 'id'>>,
  ): Promise<BlueprintEntry[]> {
    const state = this.mutate((s) => {
      const idx = s.blueprints.findIndex((x) => x.id === id)
      if (idx !== -1) s.blueprints[idx] = { ...s.blueprints[idx], ...patch }
    })
    return state.blueprints
  }

  async removeBlueprint(id: string): Promise<BlueprintEntry[]> {
    const state = this.mutate((s) => {
      s.blueprints = s.blueprints.filter((x) => x.id !== id)
    })
    return state.blueprints
  }

  async addHauling(contract: Omit<HaulingContract, 'id'>): Promise<HaulingContract[]> {
    const state = this.mutate((s) => {
      s.hauling.push({ ...contract, id: uid() })
    })
    return state.hauling
  }

  async updateHauling(
    id: string,
    patch: Partial<Omit<HaulingContract, 'id'>>,
  ): Promise<HaulingContract[]> {
    const state = this.mutate((s) => {
      const idx = s.hauling.findIndex((x) => x.id === id)
      if (idx !== -1) s.hauling[idx] = { ...s.hauling[idx], ...patch }
    })
    return state.hauling
  }

  async removeHauling(id: string): Promise<HaulingContract[]> {
    const state = this.mutate((s) => {
      s.hauling = s.hauling.filter((x) => x.id !== id)
    })
    return state.hauling
  }

  async addOpsSession(session: Omit<OpsSession, 'id'>): Promise<OpsSession[]> {
    const state = this.mutate((s) => {
      s.opsSessions.push({ ...session, id: uid() })
    })
    return state.opsSessions
  }

  async updateOpsSession(
    id: string,
    patch: Partial<Omit<OpsSession, 'id'>>,
  ): Promise<OpsSession[]> {
    const state = this.mutate((s) => {
      const idx = s.opsSessions.findIndex((x) => x.id === id)
      if (idx !== -1) s.opsSessions[idx] = { ...s.opsSessions[idx], ...patch }
    })
    return state.opsSessions
  }

  async removeOpsSession(id: string): Promise<OpsSession[]> {
    const state = this.mutate((s) => {
      s.opsSessions = s.opsSessions.filter((x) => x.id !== id)
    })
    return state.opsSessions
  }

  async addLoadout(loadout: Omit<Loadout, 'id'>): Promise<Loadout[]> {
    const state = this.mutate((s) => {
      s.loadouts.push({ ...loadout, id: uid() })
    })
    return state.loadouts
  }

  async updateLoadout(
    id: string,
    patch: Partial<Omit<Loadout, 'id'>>,
  ): Promise<Loadout[]> {
    const state = this.mutate((s) => {
      const idx = s.loadouts.findIndex((x) => x.id === id)
      if (idx !== -1) s.loadouts[idx] = { ...s.loadouts[idx], ...patch }
    })
    return state.loadouts
  }

  async removeLoadout(id: string): Promise<Loadout[]> {
    const state = this.mutate((s) => {
      s.loadouts = s.loadouts.filter((x) => x.id !== id)
    })
    return state.loadouts
  }

  async getServerStatus(): Promise<ServerStatus[]> {
    return sampleServers()
  }

  async getPlatformStatus(): Promise<PlatformStatus[] | null> {
    // Live platform status needs the backend proxy (browsers can't fetch the
    // RSI status page cross-origin). Demo mode simply doesn't show it.
    return null
  }
}
