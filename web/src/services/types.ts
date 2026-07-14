// Shared domain types for the Nexus Nook web app.
// The same shapes are used by both the LocalStore (demo) and ApiStore backends.

export interface UserProfile {
  id: string
  /** Display name shown in the app. */
  displayName: string
  email: string
  /** Public RSI citizen handle — display only. Never a password. */
  rsiHandle: string
}

export interface Ship {
  id: string
  name: string
  manufacturer: string
  type: string
  notes?: string
}

export interface InventoryItem {
  id: string
  name: string
  qty: number
  notes?: string
}

/** Status of a blueprint in the player's crafting tracker. */
export type BlueprintStatus = 'wanted' | 'found' | 'crafted'

/** One material line on a blueprint's bill of materials. */
export interface BlueprintMaterial {
  id: string
  name: string
  /** Quantity the recipe needs. */
  need: number
  /** Quantity currently gathered. */
  have: number
}

export interface BlueprintEntry {
  id: string
  name: string
  category?: string
  status: BlueprintStatus
  notes?: string
  /** Where the blueprint drops / rep gate (free text). */
  source?: string
  /** Bill of materials for crafting this blueprint. */
  materials?: BlueprintMaterial[]
}

/** One component slot in a saved ship loadout. */
export interface LoadoutComponent {
  id: string
  name: string
  category?: string
  /** UEX item id, kept so we can look up buy locations later. */
  uexId?: number | string
  notes?: string
}

/** A named component build for one ship. */
export interface Loadout {
  id: string
  name: string
  ship: string
  /** Saved via in-game Item Recovery (Alpha 4.9+). */
  savedInGame: boolean
  components: LoadoutComponent[]
  notes?: string
}

/** One pickup or dropoff leg of a hauling contract. */
export interface HaulingStop {
  id: string
  kind: 'pickup' | 'dropoff'
  location: string
  commodity: string
  /** Cargo units for this stop. */
  scu: number
  done: boolean
}

export type HaulingStatus = 'active' | 'delivered'

export interface HaulingContract {
  id: string
  name: string
  /** Contract payout in aUEC. */
  reward?: number
  notes?: string
  status: HaulingStatus
  stops: HaulingStop[]
}

/** One crew member's share weight in an ops session. */
export interface CrewShare {
  id: string
  name: string
  /** Relative share weight (1 = a normal cut, 2 = double, 0.5 = half). */
  shares: number
}

/** One income (+) or expense (−) line in an ops session ledger. */
export interface OpsLedgerEntry {
  id: string
  label: string
  /** aUEC. Positive = income (a sold haul), negative = expense (fees, fuel). */
  amount: number
}

export type OpsActivity = 'mining' | 'salvage' | 'cargo' | 'other'

/** A collaborative earnings session (mining run, salvage op…) with splits. */
export interface OpsSession {
  id: string
  name: string
  activity: OpsActivity
  crew: CrewShare[]
  entries: OpsLedgerEntry[]
  closed?: boolean
}

export type ServerStatusLevel = 'online' | 'degraded' | 'maintenance' | 'offline'

export interface ServerStatus {
  region: string
  status: ServerStatusLevel
  players: number
  /** Latency in milliseconds. */
  latency: number
  /** Optional capacity percentage (0-100). */
  capacity?: number
}

/** One system from CIG's official public status page (proxied by the backend). */
export interface PlatformStatus {
  name: string
  status: ServerStatusLevel
  category?: string
}

/** Everything the UI needs to render once a session is established. */
export interface AppState {
  profile: UserProfile
  fleet: Ship[]
  inventory: InventoryItem[]
  blueprints: BlueprintEntry[]
  hauling: HaulingContract[]
  opsSessions: OpsSession[]
  loadouts: Loadout[]
}

export interface AuthInput {
  displayName: string
  email: string
  rsiHandle?: string
  /** Real account password. Required in API mode; unused in local demo mode. */
  password?: string
}

/**
 * One interface, two implementations (LocalStore / ApiStore).
 * The UI only ever talks to this interface — it does not know or care
 * which backend is active.
 */
export interface Store {
  /** True when running fully client-side against localStorage (demo mode). */
  readonly isDemo: boolean

  /** Return the current session's state, or null if nobody is signed in. */
  getSession(): Promise<AppState | null>

  /** Create/enter a local-or-remote session. Returns the loaded state. */
  enter(input: AuthInput): Promise<AppState>

  /** Clear the active session. */
  logout(): Promise<void>

  /** Permanently delete the account and all its data, then clear the session. */
  deleteAccount(): Promise<void>

  updateProfile(patch: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile>

  addShip(ship: Omit<Ship, 'id'>): Promise<Ship[]>
  removeShip(id: string): Promise<Ship[]>

  addItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem[]>
  removeItem(id: string): Promise<InventoryItem[]>

  addBlueprint(entry: Omit<BlueprintEntry, 'id'>): Promise<BlueprintEntry[]>
  updateBlueprint(id: string, patch: Partial<Omit<BlueprintEntry, 'id'>>): Promise<BlueprintEntry[]>
  removeBlueprint(id: string): Promise<BlueprintEntry[]>

  addHauling(contract: Omit<HaulingContract, 'id'>): Promise<HaulingContract[]>
  updateHauling(id: string, patch: Partial<Omit<HaulingContract, 'id'>>): Promise<HaulingContract[]>
  removeHauling(id: string): Promise<HaulingContract[]>

  addOpsSession(session: Omit<OpsSession, 'id'>): Promise<OpsSession[]>
  updateOpsSession(id: string, patch: Partial<Omit<OpsSession, 'id'>>): Promise<OpsSession[]>
  removeOpsSession(id: string): Promise<OpsSession[]>

  addLoadout(loadout: Omit<Loadout, 'id'>): Promise<Loadout[]>
  updateLoadout(id: string, patch: Partial<Omit<Loadout, 'id'>>): Promise<Loadout[]>
  removeLoadout(id: string): Promise<Loadout[]>

  getServerStatus(): Promise<ServerStatus[]>

  /**
   * Official platform status from CIG's public status page, proxied by the
   * backend. Null when unavailable (demo mode, or the feed is unreachable).
   */
  getPlatformStatus(): Promise<PlatformStatus[] | null>
}
