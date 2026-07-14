// Minimal client for the UEX Corp community API (https://uexcorp.space).
// Read endpoints (e.g. /commodities, /commodities_prices) are PUBLIC and need
// no authentication — UEX credentials are only required for posting trades,
// which this app does not do. So we make plain GET requests with no token.

export const UEX_BASE = 'https://api.uexcorp.space/2.0'

/** Distinguishes failure modes so the UI can render the right guidance. */
export type UexErrorKind = 'network' | 'http' | 'parse'

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
 * Fetch a public UEX endpoint and return the parsed JSON body. Throws a typed
 * UexError on a network/CORS failure, an HTTP error, or an unreadable body.
 */
export async function uexGet<T>(path: string): Promise<T> {
  const url = `${UEX_BASE}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch {
    // fetch rejects on DNS/network failure and on CORS rejections.
    throw new UexError(
      'network',
      "Couldn't reach UEX from your browser — this may be a temporary CORS or network issue. Try again shortly.",
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

// Accept either `{ data: [...] }` or a bare array; ignore anything else.
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

export type TerminalPrice = {
  terminalName: string
  system?: string
  priceBuy?: number
  priceSell?: number
}

/**
 * Fetch and normalize the per-terminal prices for a single commodity. Field
 * names on the live API are not fully confirmed, so every access is optional
 * and tolerant of renames; a row with neither a terminal name nor any price is
 * dropped rather than rendered blank.
 */
export async function getCommodityPrices(
  idCommodity: number | string,
): Promise<TerminalPrice[]> {
  const body = await uexGet<unknown>(
    `/commodities_prices?id_commodity=${encodeURIComponent(String(idCommodity))}`,
  )
  const rows = unwrap(body)

  const out: TerminalPrice[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>

    const idTerminal = r.id_terminal ?? r.terminal_id
    const terminalName =
      toStr(r.terminal_name) ??
      toStr(r.terminal) ??
      toStr(r.name_terminal) ??
      (idTerminal !== undefined && idTerminal !== null
        ? `Terminal #${toStr(idTerminal)}`
        : undefined)

    const system =
      toStr(r.star_system_name) ??
      toStr(r.system_name) ??
      toStr(r.star_system) ??
      toStr(r.planet_name) ??
      toStr(r.planet) ??
      toStr(r.space_station_name) ??
      toStr(r.orbit_name)

    const priceBuy = toNumber(r.price_buy ?? r.priceBuy)
    const priceSell = toNumber(r.price_sell ?? r.priceSell)

    // Drop rows with no terminal name AND no prices.
    if (!terminalName && priceBuy === undefined && priceSell === undefined) {
      continue
    }

    out.push({
      terminalName: terminalName ?? 'Unknown terminal',
      system,
      priceBuy,
      priceSell,
    })
  }
  return out
}

export type Vehicle = {
  id?: number | string
  name: string
  manufacturer?: string
  cargo?: number
  crew?: number
}

/**
 * Fetch and normalize the ship/vehicle catalog from `/vehicles`. Live field
 * names are not fully confirmed, so every access is tolerant of renames and
 * nested shapes; an entry with no usable name is dropped rather than rendered
 * blank. The catalog is a few hundred rows — fine to filter client-side.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const body = await uexGet<unknown>('/vehicles')
  const rows = unwrap(body)

  const out: Vehicle[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>

    const name = toStr(r.name_full) ?? toStr(r.name) ?? toStr(r.vehicle_name)
    if (!name) continue

    // Manufacturer may be a flat field or nested under a company object.
    const company =
      r.company && typeof r.company === 'object'
        ? (r.company as Record<string, unknown>)
        : undefined
    const manufacturer =
      toStr(r.company_name) ??
      toStr(r.manufacturer) ??
      toStr(r.manufacturer_name) ??
      (company ? toStr(company.name) ?? toStr(company.name_full) : undefined)

    const cargo = toNumber(r.scu) ?? toNumber(r.cargo) ?? toNumber(r.cargo_capacity)
    const crew =
      toNumber(r.crew) ??
      toNumber(r.crew_max) ??
      toNumber(r.crew_min) ??
      toNumber(r.crew_size)

    const id =
      typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined

    out.push({ id, name, manufacturer, cargo, crew })
  }
  return out
}

export type Item = {
  id?: number | string
  name: string
  manufacturer?: string
  category?: string
  kind?: string
}

/** Map one raw UEX item row onto our normalized Item, or null if unusable. */
function mapItem(raw: unknown): Item | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const name = toStr(r.name_full) ?? toStr(r.name) ?? toStr(r.item_name)
  if (!name) return null

  // Manufacturer may be flat or nested under a company object.
  const company =
    r.company && typeof r.company === 'object'
      ? (r.company as Record<string, unknown>)
      : undefined
  const manufacturer =
    toStr(r.company_name) ??
    toStr(r.manufacturer) ??
    toStr(r.manufacturer_name) ??
    (company ? toStr(company.name) ?? toStr(company.name_full) : undefined)

  const category =
    toStr(r.category) ?? toStr(r.section_name) ?? toStr(r.group_name)
  const kind = toStr(r.kind) ?? toStr(r.type) ?? toStr(r.section_name)

  const id =
    typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined

  return { id, name, manufacturer, category, kind }
}

export type ItemCategory = {
  id: number | string
  name: string
  section?: string
}

/**
 * Fetch the item categories (UEX groups items by category, and `/items`
 * requires an `id_category`). Defensive about field names.
 */
export async function getCategories(): Promise<ItemCategory[]> {
  const body = await uexGet<unknown>('/categories')
  const rows = unwrap(body)

  const out: ItemCategory[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const id = r.id
    if (typeof id !== 'number' && typeof id !== 'string') continue
    const name =
      toStr(r.name) ?? toStr(r.section_name) ?? toStr(r.type) ?? `Category ${id}`
    // Keep only categories that actually hold items where the API exposes a flag.
    out.push({ id, name, section: toStr(r.section) ?? toStr(r.type) })
  }
  // Stable alphabetical order for the dropdown.
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

/** Fetch the items within a single category (`/items?id_category=<id>`). */
export async function getItemsByCategory(idCategory: number | string): Promise<Item[]> {
  const body = await uexGet<unknown>(
    `/items?id_category=${encodeURIComponent(String(idCategory))}`,
  )
  const rows = unwrap(body)
  const out: Item[] = []
  for (const raw of rows) {
    const item = mapItem(raw)
    if (item) out.push(item)
  }
  return out
}

export type ItemPrice = {
  terminalName: string
  system?: string
  priceBuy?: number
}

/**
 * Where an item/component can be bought (`/items_prices?id_item=<id>`), with
 * prices. Field names on the live API are not fully confirmed — every access
 * is defensive, and rows with neither a terminal nor a price are dropped.
 */
export async function getItemPrices(idItem: number | string): Promise<ItemPrice[]> {
  const body = await uexGet<unknown>(
    `/items_prices?id_item=${encodeURIComponent(String(idItem))}`,
  )
  const rows = unwrap(body)

  const out: ItemPrice[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>

    const idTerminal = r.id_terminal ?? r.terminal_id
    const terminalName =
      toStr(r.terminal_name) ??
      toStr(r.terminal) ??
      toStr(r.name_terminal) ??
      (idTerminal !== undefined && idTerminal !== null
        ? `Terminal #${toStr(idTerminal)}`
        : undefined)

    const system =
      toStr(r.star_system_name) ??
      toStr(r.system_name) ??
      toStr(r.planet_name) ??
      toStr(r.space_station_name) ??
      toStr(r.orbit_name)

    const priceBuy = toNumber(r.price_buy ?? r.priceBuy)

    if (!terminalName && priceBuy === undefined) continue
    out.push({ terminalName: terminalName ?? 'Unknown terminal', system, priceBuy })
  }
  // Cheapest first; unpriced listings sink to the bottom.
  out.sort((a, b) => (a.priceBuy ?? Infinity) - (b.priceBuy ?? Infinity))
  return out
}

/**
 * Fetch and normalize the commodity list. Field accesses are tolerant of the
 * live API's naming; a commodity with no usable name is dropped rather than
 * crashing the table.
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
