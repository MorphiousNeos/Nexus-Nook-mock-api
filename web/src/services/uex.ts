// Minimal client for the UEX Corp community API (https://uexcorp.space).
// The user supplies their own "application token" from their UEX account; we
// store it only in this browser's localStorage and send it as a Bearer header.

export const UEX_BASE = 'https://api.uexcorp.space/2.0'

const TOKEN_KEY = 'nexus.uex.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token.trim())
  } catch {
    // Ignore storage failures (e.g. private mode); the app still works for the
    // current session via the value the caller already holds.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/** Distinguishes failure modes so the UI can render the right guidance. */
export type UexErrorKind = 'no-token' | 'auth' | 'network' | 'http' | 'parse'

export class UexError extends Error {
  kind: UexErrorKind
  status?: number

  constructor(kind: UexErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'UexError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Fetch a UEX endpoint with the Bearer header and return the parsed JSON body.
 * Throws a typed UexError on missing token, auth failure, HTTP error, or a
 * network/CORS failure.
 */
export async function uexGet<T>(path: string): Promise<T> {
  const token = getToken()
  if (!token) {
    throw new UexError('no-token', 'No UEX token saved. Add your token to continue.')
  }

  const url = `${UEX_BASE}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
  } catch {
    // fetch rejects on DNS/network failure and on CORS rejections.
    throw new UexError(
      'network',
      "Couldn't reach UEX from your browser — this may be a CORS restriction; we may need to route it through a backend.",
    )
  }

  if (res.status === 401 || res.status === 403) {
    throw new UexError(
      'auth',
      'UEX rejected the token (it may be invalid or expired). Try changing your token.',
      res.status,
    )
  }

  if (!res.ok) {
    throw new UexError('http', `UEX request failed (HTTP ${res.status}).`, res.status)
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new UexError('parse', 'UEX returned a response we could not read.')
  }
}

export type Commodity = {
  id?: number | string
  name: string
  code?: string
  kind?: string
  priceBuy?: number
  priceSell?: number
}

// The live envelope is uncertain; accept either `{ data: [...] }` or a bare
// array, and ignore anything that isn't an array of objects.
function unwrap(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data
    if (Array.isArray(data)) return data
  }
  return []
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function toStr(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value
  if (typeof value === 'number') return String(value)
  return undefined
}

/**
 * Fetch and normalize the commodity list. Field names on the live API are not
 * confirmed, so every access is optional and tolerant of renames; a commodity
 * with no usable name is dropped rather than crashing the table.
 */
export async function getCommodities(): Promise<Commodity[]> {
  const body = await uexGet<unknown>('/commodities')
  const rows = unwrap(body)

  const out: Commodity[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>

    const name = toStr(r.name) ?? toStr(r.commodity_name) ?? toStr(r.code)
    if (!name) continue

    const id =
      typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined

    out.push({
      id,
      name,
      code: toStr(r.code),
      kind: toStr(r.kind) ?? toStr(r.type),
      priceBuy: toNumber(r.price_buy ?? r.priceBuy),
      priceSell: toNumber(r.price_sell ?? r.priceSell),
    })
  }
  return out
}
