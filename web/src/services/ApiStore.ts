import type {
  AppState,
  AuthInput,
  InventoryItem,
  ServerStatus,
  ServerStatusLevel,
  Ship,
  Store,
  UserProfile,
} from './types'

const TOKEN_KEY = 'nexus-nook:token'
const CACHE_KEY = 'nexus-nook:apistate'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/**
 * Talks to the real backend described in docs/API.md.
 *
 * The backend has no first-class fleet/inventory endpoints; instead it
 * persists an opaque `gameData` blob via /api/user/save + /api/user/load.
 * We store the user-owned fleet/inventory/profile-extras inside that blob,
 * which keeps the same Store interface the UI relies on.
 *
 * Note on auth: docs/API.md requires a password for register/login. Since the
 * web UI intentionally never collects an RSI password (and only collects a
 * display name + email for the demo), we derive a deterministic local
 * passphrase from the email so the same visitor can re-enter. This is NOT a
 * security feature — it just satisfies the contract's required field.
 */
export class ApiStore implements Store {
  readonly isDemo = false
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private token(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    }
    const token = this.token()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const body = await res.json()
        if (body?.message || body?.error) message = body.message ?? body.error
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    return (await res.json()) as T
  }

  // --- gameData blob helpers (fleet/inventory/profile extras) ---

  private cache(): { fleet: Ship[]; inventory: InventoryItem[]; rsiHandle: string } {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    return { fleet: [], inventory: [], rsiHandle: '' }
  }

  private async saveBlob(blob: {
    fleet: Ship[]
    inventory: InventoryItem[]
    rsiHandle: string
  }): Promise<void> {
    localStorage.setItem(CACHE_KEY, JSON.stringify(blob))
    await this.request('/api/user/save', {
      method: 'POST',
      body: JSON.stringify({ gameData: blob }),
    })
  }

  private async loadBlob(): Promise<{
    fleet: Ship[]
    inventory: InventoryItem[]
    rsiHandle: string
  }> {
    const data = await this.request<{ gameData: any }>('/api/user/load')
    const blob = data.gameData ?? {}
    const normalized = {
      fleet: Array.isArray(blob.fleet) ? blob.fleet : [],
      inventory: Array.isArray(blob.inventory) ? blob.inventory : [],
      rsiHandle: typeof blob.rsiHandle === 'string' ? blob.rsiHandle : '',
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(normalized))
    return normalized
  }

  private async buildState(user: {
    id: string
    username: string
    email: string
  }): Promise<AppState> {
    const blob = await this.loadBlob()
    return {
      profile: {
        id: user.id,
        displayName: user.username,
        email: user.email,
        rsiHandle: blob.rsiHandle,
      },
      fleet: blob.fleet,
      inventory: blob.inventory,
    }
  }

  // --- Store interface ---

  async getSession(): Promise<AppState | null> {
    if (!this.token()) return null
    try {
      const data = await this.request<{ user: any }>('/api/user/profile')
      const u = data.user
      return this.buildState({
        id: String(u.id),
        username: u.username,
        email: u.email,
      })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
  }

  async enter(input: AuthInput): Promise<AppState> {
    const email = input.email.trim()
    const username = input.displayName.trim()
    // Deterministic, non-secret passphrase to satisfy the required field.
    const password = `demo:${email}`

    type AuthResp = {
      token: string
      user: { id: string | number; username: string; email: string }
    }

    let resp: AuthResp
    try {
      resp = await this.request<AuthResp>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    } catch {
      // Not registered yet (or wrong creds) — register.
      resp = await this.request<AuthResp>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      })
    }

    localStorage.setItem(TOKEN_KEY, resp.token)

    const state = await this.buildState({
      id: String(resp.user.id),
      username: resp.user.username,
      email: resp.user.email,
    })

    // Persist any provided RSI handle into the blob.
    if (input.rsiHandle !== undefined && input.rsiHandle.trim() !== state.profile.rsiHandle) {
      state.profile.rsiHandle = input.rsiHandle.trim()
      await this.saveBlob({
        fleet: state.fleet,
        inventory: state.inventory,
        rsiHandle: state.profile.rsiHandle,
      })
    }
    return state
  }

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CACHE_KEY)
  }

  async updateProfile(patch: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile> {
    const blob = this.cache()
    if (patch.rsiHandle !== undefined) {
      blob.rsiHandle = patch.rsiHandle
      await this.saveBlob(blob)
    }
    // displayName/email changes are local-only (no backend endpoint for them).
    const session = await this.getSession()
    const base: UserProfile = session?.profile ?? {
      id: 'unknown',
      displayName: '',
      email: '',
      rsiHandle: blob.rsiHandle,
    }
    return { ...base, ...patch, rsiHandle: blob.rsiHandle }
  }

  async addShip(ship: Omit<Ship, 'id'>): Promise<Ship[]> {
    const blob = this.cache()
    blob.fleet = [...blob.fleet, { ...ship, id: uid() }]
    await this.saveBlob(blob)
    return blob.fleet
  }

  async removeShip(id: string): Promise<Ship[]> {
    const blob = this.cache()
    blob.fleet = blob.fleet.filter((x) => x.id !== id)
    await this.saveBlob(blob)
    return blob.fleet
  }

  async addItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem[]> {
    const blob = this.cache()
    blob.inventory = [...blob.inventory, { ...item, id: uid() }]
    await this.saveBlob(blob)
    return blob.inventory
  }

  async removeItem(id: string): Promise<InventoryItem[]> {
    const blob = this.cache()
    blob.inventory = blob.inventory.filter((x) => x.id !== id)
    await this.saveBlob(blob)
    return blob.inventory
  }

  async getServerStatus(): Promise<ServerStatus[]> {
    const data = await this.request<{ servers: any[] }>('/api/servers/status')
    return (data.servers ?? []).map((s) => ({
      region: String(s.region ?? 'Unknown'),
      status: normalizeStatus(s.status),
      players: Number(s.players ?? 0),
      latency: Number(s.latency ?? 0),
      capacity: s.capacity != null ? Number(s.capacity) : undefined,
    }))
  }
}

function normalizeStatus(raw: unknown): ServerStatusLevel {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'online' || s === 'operational' || s === 'ok') return 'online'
  if (s === 'degraded' || s === 'busy' || s === 'partial') return 'degraded'
  if (s === 'maintenance') return 'maintenance'
  if (s === 'offline' || s === 'down') return 'offline'
  return 'online'
}
