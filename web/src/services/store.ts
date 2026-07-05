import { ApiStore } from './ApiStore'
import { LocalStore } from './LocalStore'
import type { Store } from './types'

export * from './types'

/**
 * Factory: use the real backend when VITE_API_URL is set, otherwise fall back
 * to the fully client-side demo store. The rest of the app only imports
 * `getStore()` and never references a concrete implementation.
 */
let instance: Store | null = null

export function getStore(): Store {
  if (instance) return instance
  const apiUrl = import.meta.env.VITE_API_URL
  instance = apiUrl ? new ApiStore(apiUrl) : new LocalStore()
  return instance
}

export const DISCORD_INVITE: string =
  import.meta.env.VITE_DISCORD_INVITE || 'https://discord.gg/jSf78Xxtky'
