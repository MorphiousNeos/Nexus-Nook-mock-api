// Client for the Nexus Nook community API (LFG / Feed / Marketplace).
//
// All list endpoints are public GETs. Create/delete require a bearer token,
// which the app stores in localStorage under `nexus-nook:token` (see ApiStore).
//
// The community features only work against the live backend. In the local demo
// (no VITE_API_URL configured) there is no community server to talk to, so
// `communityAvailable` is false and every call throws a friendly explanation.

const API_BASE = import.meta.env.VITE_API_URL as string | undefined

/** True when a backend is configured; false in the offline demo build. */
export const communityAvailable = !!API_BASE

const TOKEN_KEY = 'nexus-nook:token'

function token(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Defensive fetch wrapper. Prefixes the API base, sends/receives JSON, attaches
 * the bearer token when present, and throws an Error carrying a human-friendly
 * message for HTTP errors, unreadable bodies, and network failures.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!communityAvailable || !API_BASE) {
    throw new Error(
      'Community needs the live server — open the hosted site and sign in.',
    )
  }

  const base = API_BASE.replace(/\/$/, '')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const t = token()
  if (t) headers.Authorization = `Bearer ${t}`

  let res: Response
  try {
    res = await fetch(`${base}${path}`, { ...init, headers })
  } catch {
    throw new Error(
      "Couldn't reach the community server — check your connection and try again.",
    )
  }

  if (!res.ok) {
    let message = `Request failed (${res.status}).`
    if (res.status === 401 || res.status === 403) {
      message = 'You need to be signed in to do that.'
    }
    try {
      const body = await res.json()
      if (body?.error || body?.message) message = body.error ?? body.message
    } catch {
      /* keep the default message */
    }
    throw new Error(message)
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new Error('The community server returned a response we could not read.')
  }
}

// --- shared helpers -------------------------------------------------------

function toStr(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function toOptNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

// --- LFG ------------------------------------------------------------------

export interface LfgPost {
  id: string
  title: string
  activity: string
  region: string
  playersNeeded?: number
  body: string
  createdAt: string
  author: string
}

export interface LfgInput {
  title: string
  activity?: string
  region?: string
  playersNeeded?: number
  body?: string
}

function mapLfg(raw: unknown): LfgPost {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: toStr(r.id),
    title: toStr(r.title),
    activity: toStr(r.activity),
    region: toStr(r.region),
    playersNeeded: toOptNum(r.players_needed ?? r.playersNeeded),
    body: toStr(r.body),
    createdAt: toStr(r.created_at ?? r.createdAt),
    author: toStr(r.author),
  }
}

export async function listLfg(): Promise<LfgPost[]> {
  const data = await request<{ posts?: unknown[] }>('/api/lfg')
  return (data.posts ?? []).map(mapLfg)
}

export async function createLfg(input: LfgInput): Promise<void> {
  await request('/api/lfg', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      activity: input.activity ?? '',
      region: input.region ?? '',
      playersNeeded: input.playersNeeded,
      body: input.body ?? '',
    }),
  })
}

export async function deleteLfg(id: string): Promise<void> {
  await request(`/api/lfg/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- Feed -----------------------------------------------------------------

export interface FeedPost {
  id: string
  body: string
  imageUrl?: string
  createdAt: string
  author: string
}

export interface FeedInput {
  body: string
  imageUrl?: string
}

function mapPost(raw: unknown): FeedPost {
  const r = (raw ?? {}) as Record<string, unknown>
  const imageUrl = toStr(r.image_url ?? r.imageUrl)
  return {
    id: toStr(r.id),
    body: toStr(r.body),
    imageUrl: imageUrl || undefined,
    createdAt: toStr(r.created_at ?? r.createdAt),
    author: toStr(r.author),
  }
}

export async function listPosts(): Promise<FeedPost[]> {
  const data = await request<{ posts?: unknown[] }>('/api/posts')
  return (data.posts ?? []).map(mapPost)
}

export async function createPost(input: FeedInput): Promise<void> {
  await request('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ body: input.body, imageUrl: input.imageUrl ?? '' }),
  })
}

export async function deletePost(id: string): Promise<void> {
  await request(`/api/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- Marketplace ----------------------------------------------------------

export type ListingKind = 'sell' | 'buy' | 'trade'

export interface Listing {
  id: string
  kind: ListingKind
  title: string
  price?: number
  body: string
  createdAt: string
  author: string
}

export interface ListingInput {
  kind: ListingKind
  title: string
  price?: number
  body?: string
}

function mapKind(raw: unknown): ListingKind {
  const k = toStr(raw).toLowerCase()
  if (k === 'buy') return 'buy'
  if (k === 'trade') return 'trade'
  return 'sell'
}

function mapListing(raw: unknown): Listing {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: toStr(r.id),
    kind: mapKind(r.kind),
    title: toStr(r.title),
    price: toOptNum(r.price),
    body: toStr(r.body),
    createdAt: toStr(r.created_at ?? r.createdAt),
    author: toStr(r.author),
  }
}

export async function listMarket(): Promise<Listing[]> {
  const data = await request<{ listings?: unknown[] }>('/api/market')
  return (data.listings ?? []).map(mapListing)
}

export async function createListing(input: ListingInput): Promise<void> {
  await request('/api/market', {
    method: 'POST',
    body: JSON.stringify({
      kind: input.kind,
      title: input.title,
      price: input.price,
      body: input.body ?? '',
    }),
  })
}

export async function deleteListing(id: string): Promise<void> {
  await request(`/api/market/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- presentation helpers -------------------------------------------------

/** Render an ISO timestamp as a compact relative time, e.g. "3h ago". */
export function relativeTime(iso: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

/** True if a string looks like an http(s) URL we can render as an image. */
export function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
