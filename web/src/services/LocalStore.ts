import type {
  AppState,
  AuthInput,
  BlueprintEntry,
  InventoryItem,
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
    // Normalize missing blueprints field for sessions stored before this feature.
    if (!Array.isArray(parsed.blueprints)) parsed.blueprints = []
    return parsed
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

    const state: AppState = {
      profile: {
        id: uid(),
        displayName: input.displayName.trim(),
        email: input.email.trim(),
        rsiHandle: (input.rsiHandle ?? '').trim(),
      },
      fleet: [],
      inventory: [],
      blueprints: [],
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

  async getServerStatus(): Promise<ServerStatus[]> {
    return sampleServers()
  }

  async getPlatformStatus(): Promise<PlatformStatus[] | null> {
    // Live platform status needs the backend proxy (browsers can't fetch the
    // RSI status page cross-origin). Demo mode simply doesn't show it.
    return null
  }
}
