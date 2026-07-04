import type {
  AppState,
  AuthInput,
  BlueprintEntry,
  InventoryItem,
  PlatformStatus,
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
 * Called once at app start (see main.tsx). If the backend redirected here
 * after a Discord OAuth flow, the URL hash carries `#/auth?token=…` (or
 * `?error=…`). Stash the token in localStorage and scrub it from the URL so
 * it never lingers in the address bar or browser history.
 * Returns an error message to surface on the landing page, if any.
 */
export function captureOAuthRedirect(): string | null {
  const hash = window.location.hash
  if (!hash.startsWith('#/auth')) return null

  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const params = new URLSearchParams(query)
  const token = params.get('token')
  const error = params.get('error')

  if (token) localStorage.setItem(TOKEN_KEY, token)
  // Scrub the sensitive hash whether we got a token or an error.
  window.history.replaceState(null, '', window.location.pathname + '#/overview')
  return token ? null : error
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

  private cache(): { fleet: Ship[]; inventory: InventoryItem[]; blueprints: BlueprintEntry[]; rsiHandle: string } {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed.blueprints)) parsed.blueprints = []
        return parsed
      }
    } catch {
      /* ignore */
    }
    return { fleet: [], inventory: [], blueprints: [], rsiHandle: '' }
  }

  private async saveBlob(blob: {
    fleet: Ship[]
    inventory: InventoryItem[]
    blueprints: BlueprintEntry[]
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
    blueprints: BlueprintEntry[]
    rsiHandle: string
  }> {
    const data = await this.request<{ gameData: any }>('/api/user/load')
    const blob = data.gameData ?? {}
    const normalized = {
      fleet: Array.isArray(blob.fleet) ? blob.fleet : [],
      inventory: Array.isArray(blob.inventory) ? blob.inventory : [],
      blueprints: Array.isArray(blob.blueprints) ? blob.blueprints : [],
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
      blueprints: blob.blueprints,
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
    const password = input.password ?? ''
    if (password.length < 8) {
      throw new Error('Please use a password of at least 8 characters.')
    }

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
      // No account with these credentials — try to create one. If the email
      // is already registered the backend answers 409, which means the
      // password above was simply wrong; say so clearly instead of leaking
      // the confusing "User already exists" message.
      try {
        resp = await this.request<AuthResp>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (/exists/i.test(msg)) {
          throw new Error(
            'That email already has an account but the password did not match.',
          )
        }
        throw err
      }
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
        blueprints: state.blueprints,
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
      await this.saveBlob({ ...blob, rsiHandle: patch.rsiHandle })
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

  async addBlueprint(entry: Omit<BlueprintEntry, 'id'>): Promise<BlueprintEntry[]> {
    const blob = this.cache()
    blob.blueprints = [...blob.blueprints, { ...entry, id: uid() }]
    await this.saveBlob(blob)
    return blob.blueprints
  }

  async updateBlueprint(
    id: string,
    patch: Partial<Omit<BlueprintEntry, 'id'>>,
  ): Promise<BlueprintEntry[]> {
    const blob = this.cache()
    const idx = blob.blueprints.findIndex((x) => x.id === id)
    if (idx !== -1) blob.blueprints[idx] = { ...blob.blueprints[idx], ...patch }
    await this.saveBlob(blob)
    return blob.blueprints
  }

  async removeBlueprint(id: string): Promise<BlueprintEntry[]> {
    const blob = this.cache()
    blob.blueprints = blob.blueprints.filter((x) => x.id !== id)
    await this.saveBlob(blob)
    return blob.blueprints
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

  async getPlatformStatus(): Promise<PlatformStatus[] | null> {
    const data = await this.request<{ platform?: any[] | null }>('/api/servers/status')
    if (!Array.isArray(data.platform) || data.platform.length === 0) return null
    return data.platform
      .map((p) => ({
        name: String(p?.name ?? ''),
        status: normalizeStatus(p?.status),
        category: p?.category ? String(p.category) : undefined,
      }))
      .filter((p) => p.name)
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
