import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getStore } from './services/store'
import type {
  AppState,
  AuthInput,
  BlueprintEntry,
  InventoryItem,
  PlatformStatus,
  ServerStatus,
  Ship,
  UserProfile,
} from './services/store'

interface SessionContextValue {
  ready: boolean
  isDemo: boolean
  state: AppState | null
  enter: (input: AuthInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<Omit<UserProfile, 'id'>>) => Promise<void>
  addShip: (ship: Omit<Ship, 'id'>) => Promise<void>
  removeShip: (id: string) => Promise<void>
  addItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  addBlueprint: (entry: Omit<BlueprintEntry, 'id'>) => Promise<void>
  updateBlueprint: (id: string, patch: Partial<Omit<BlueprintEntry, 'id'>>) => Promise<void>
  removeBlueprint: (id: string) => Promise<void>
  getServerStatus: () => Promise<ServerStatus[]>
  getPlatformStatus: () => Promise<PlatformStatus[] | null>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), [])
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    let active = true
    store
      .getSession()
      .then((s) => active && setState(s))
      .catch(() => active && setState(null))
      .finally(() => active && setReady(true))
    return () => {
      active = false
    }
  }, [store])

  const enter = useCallback(
    async (input: AuthInput) => {
      const s = await store.enter(input)
      setState(s)
    },
    [store],
  )

  const logout = useCallback(async () => {
    await store.logout()
    setState(null)
  }, [store])

  const updateProfile = useCallback(
    async (patch: Partial<Omit<UserProfile, 'id'>>) => {
      const profile = await store.updateProfile(patch)
      setState((prev) => (prev ? { ...prev, profile } : prev))
    },
    [store],
  )

  const addShip = useCallback(
    async (ship: Omit<Ship, 'id'>) => {
      const fleet = await store.addShip(ship)
      setState((prev) => (prev ? { ...prev, fleet } : prev))
    },
    [store],
  )

  const removeShip = useCallback(
    async (id: string) => {
      const fleet = await store.removeShip(id)
      setState((prev) => (prev ? { ...prev, fleet } : prev))
    },
    [store],
  )

  const addItem = useCallback(
    async (item: Omit<InventoryItem, 'id'>) => {
      const inventory = await store.addItem(item)
      setState((prev) => (prev ? { ...prev, inventory } : prev))
    },
    [store],
  )

  const removeItem = useCallback(
    async (id: string) => {
      const inventory = await store.removeItem(id)
      setState((prev) => (prev ? { ...prev, inventory } : prev))
    },
    [store],
  )

  const addBlueprint = useCallback(
    async (entry: Omit<BlueprintEntry, 'id'>) => {
      const blueprints = await store.addBlueprint(entry)
      setState((prev) => (prev ? { ...prev, blueprints } : prev))
    },
    [store],
  )

  const updateBlueprint = useCallback(
    async (id: string, patch: Partial<Omit<BlueprintEntry, 'id'>>) => {
      const blueprints = await store.updateBlueprint(id, patch)
      setState((prev) => (prev ? { ...prev, blueprints } : prev))
    },
    [store],
  )

  const removeBlueprint = useCallback(
    async (id: string) => {
      const blueprints = await store.removeBlueprint(id)
      setState((prev) => (prev ? { ...prev, blueprints } : prev))
    },
    [store],
  )

  const getServerStatus = useCallback(() => store.getServerStatus(), [store])
  const getPlatformStatus = useCallback(() => store.getPlatformStatus(), [store])

  const value: SessionContextValue = {
    ready,
    isDemo: store.isDemo,
    state,
    enter,
    logout,
    updateProfile,
    addShip,
    removeShip,
    addItem,
    removeItem,
    addBlueprint,
    updateBlueprint,
    removeBlueprint,
    getServerStatus,
    getPlatformStatus,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
