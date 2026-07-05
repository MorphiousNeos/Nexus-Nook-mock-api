// Minimal client for the Star Citizen Wiki community API.
// Reference: https://api.star-citizen.wiki/api/v3
// Public read endpoints — no authentication required. Content under the wiki
// is licensed CC BY-SA 4.0; the UI surfaces attribution wherever results show.
//
// The exact response shapes for /vehicles and /vehicles/{slug} are not fully
// documented for this app's purposes, so every field access is defensive and
// tolerant of snake_case/camelCase, flat vs nested, etc. — mirroring the
// approach in services/uex.ts.

export const SCWIKI_BASE = 'https://api.star-citizen.wiki/api/v3'

export type ScWikiErrorKind = 'network' | 'http' | 'parse'

export class ScWikiError extends Error {
  kind: ScWikiErrorKind
  status?: number

  constructor(kind: ScWikiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ScWikiError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Fetch a public Star Citizen Wiki endpoint and return the parsed JSON body.
 * Throws a typed ScWikiError on network/CORS, HTTP errors, or an unreadable
 * body. The network/CORS path uses a friendlier message because browser
 * rejections from a third-party API are the most common failure mode here.
 */
export async function wikiGet<T>(path: string): Promise<T> {
  const url = `${SCWIKI_BASE}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch {
    throw new ScWikiError(
      'network',
      "Couldn't reach the Star Citizen Wiki API from your browser — possibly a CORS or rate-limit issue.",
    )
  }

  if (!res.ok) {
    throw new ScWikiError(
      'http',
      `Star Citizen Wiki request failed (HTTP ${res.status}).`,
      res.status,
    )
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ScWikiError('parse', 'Star Citizen Wiki returned a response we could not read.')
  }
}

export type WikiVehicleSummary = {
  id?: string | number
  name: string
  slug?: string
  manufacturer?: string
}

export type WikiVehicleDetail = WikiVehicleSummary & {
  description?: string
  cargoScu?: number
  crewMin?: number
  crewMax?: number
  mass?: number
  lengthM?: number
  beamM?: number
  heightM?: number
  sizeClass?: string
  foci?: string[]
  speedScmMs?: number
  speedMaxMs?: number
  status?: string
  imageUrl?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function unwrapArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data
    if (Array.isArray(data)) return data
  }
  return []
}

function unwrapObject(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null
  const d = (body as { data?: unknown }).data
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return d as Record<string, unknown>
  }
  if (!Array.isArray(body)) return body as Record<string, unknown>
  return null
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

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

/** Best-effort manufacturer name from a flat field or a nested object. */
function pickManufacturer(r: Record<string, unknown>): string | undefined {
  const flat =
    toStr(r.manufacturer) ??
    toStr(r.manufacturer_name) ??
    toStr(r.company_name) ??
    toStr(r.maker)
  if (flat) return flat

  const nested =
    asObject(r.manufacturer) ??
    asObject(r.company) ??
    asObject(r.maker)
  if (!nested) return undefined
  return (
    toStr(nested.name) ??
    toStr(nested.name_full) ??
    toStr(nested.code) ??
    toStr(nested.slug)
  )
}

/** Pluck a slug-like value (or fall back to a name-derived slug). */
function pickSlug(r: Record<string, unknown>, name?: string): string | undefined {
  const direct = toStr(r.slug) ?? toStr(r.url_slug) ?? toStr(r.code)
  if (direct) return direct
  if (name) return slugify(name)
  return undefined
}

/** Lowercase, hyphenate, drop punctuation — best-effort URL slug. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapSummary(raw: unknown): WikiVehicleSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const name = toStr(r.name) ?? toStr(r.name_full) ?? toStr(r.vehicle_name)
  if (!name) return null

  const id =
    typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined

  return {
    id,
    name,
    slug: pickSlug(r, name),
    manufacturer: pickManufacturer(r),
  }
}

function mapDetail(raw: unknown): WikiVehicleDetail | null {
  const r = unwrapObject(raw)
  if (!r) return null

  const name = toStr(r.name) ?? toStr(r.name_full) ?? toStr(r.vehicle_name)
  if (!name) return null

  // Cargo SCU — try the common locations first, then a `cargo` object.
  const cargoObj = asObject(r.cargo)
  const cargoScu =
    toNumber(r.scu) ??
    toNumber(r.cargo_capacity) ??
    toNumber(r.cargocapacity) ??
    (typeof r.cargo === 'number' || typeof r.cargo === 'string'
      ? toNumber(r.cargo)
      : undefined) ??
    (cargoObj ? toNumber(cargoObj.scu) ?? toNumber(cargoObj.capacity) : undefined)

  // Crew may be flat or nested.
  const crewObj = asObject(r.crew)
  const crewMin =
    toNumber(r.crew_min) ??
    toNumber(r.min_crew) ??
    (crewObj ? toNumber(crewObj.min) : undefined)
  const crewMax =
    toNumber(r.crew_max) ??
    toNumber(r.max_crew) ??
    (crewObj
      ? toNumber(crewObj.max) ?? toNumber(crewObj.weapon) ?? toNumber(crewObj.operations)
      : undefined) ??
    (typeof r.crew === 'number' || typeof r.crew === 'string'
      ? toNumber(r.crew)
      : undefined)

  // Sizes — common shape: { length, beam, height } or { length_m, beam_m, height_m }.
  const sizesObj = asObject(r.sizes) ?? asObject(r.dimensions) ?? asObject(r.size)
  const lengthM =
    toNumber(r.length) ??
    toNumber(r.length_m) ??
    (sizesObj ? toNumber(sizesObj.length) ?? toNumber(sizesObj.length_m) : undefined)
  const beamM =
    toNumber(r.beam) ??
    toNumber(r.beam_m) ??
    toNumber(r.width) ??
    (sizesObj
      ? toNumber(sizesObj.beam) ?? toNumber(sizesObj.beam_m) ?? toNumber(sizesObj.width)
      : undefined)
  const heightM =
    toNumber(r.height) ??
    toNumber(r.height_m) ??
    (sizesObj ? toNumber(sizesObj.height) ?? toNumber(sizesObj.height_m) : undefined)

  // Size / class — tolerate both naming styles.
  const sizeClass =
    toStr(r.size_class) ??
    toStr(r.class) ??
    toStr(r.size_name) ??
    (sizesObj ? toStr(sizesObj.class) ?? toStr(sizesObj.name) : undefined)

  // Foci — usually an array of strings or objects with a name field.
  const fociRaw = asArray(r.foci) ?? asArray(r.roles)
  const foci = fociRaw
    ? fociRaw
        .map((f) => {
          if (typeof f === 'string') return f
          if (f && typeof f === 'object') {
            const o = f as Record<string, unknown>
            return toStr(o.name) ?? toStr(o.label) ?? toStr(o.code)
          }
          return undefined
        })
        .filter((v): v is string => Boolean(v))
    : undefined

  // Speed — flat or nested under `speed`.
  const speedObj = asObject(r.speed)
  const speedScmMs =
    toNumber(r.scm_speed) ??
    toNumber(r.scmSpeed) ??
    (speedObj ? toNumber(speedObj.scm) ?? toNumber(speedObj.scm_speed) : undefined)
  const speedMaxMs =
    toNumber(r.max_speed) ??
    toNumber(r.maxSpeed) ??
    toNumber(r.afterburner_speed) ??
    (speedObj
      ? toNumber(speedObj.max) ?? toNumber(speedObj.max_speed) ?? toNumber(speedObj.afterburner)
      : undefined)

  // Description — sometimes a string, sometimes nested under `description.en` etc.
  let description = toStr(r.description) ?? toStr(r.summary) ?? toStr(r.flavor_text)
  if (!description) {
    const descObj = asObject(r.description)
    if (descObj) {
      description =
        toStr(descObj.en) ?? toStr(descObj.text) ?? toStr(descObj.value)
    }
  }

  // Image — `media` array of objects, or a top-level `image` / `store_image`.
  let imageUrl =
    toStr(r.store_image) ??
    toStr(r.image_url) ??
    toStr(r.image) ??
    toStr(r.thumbnail)
  if (!imageUrl) {
    const mediaArr = asArray(r.media)
    if (mediaArr && mediaArr.length > 0) {
      for (const m of mediaArr) {
        if (m && typeof m === 'object') {
          const mo = m as Record<string, unknown>
          const candidate =
            toStr(mo.source_url) ??
            toStr(mo.url) ??
            toStr(mo.original_url) ??
            toStr(mo.src)
          if (candidate) {
            imageUrl = candidate
            break
          }
        } else if (typeof m === 'string') {
          imageUrl = m
          break
        }
      }
    }
  }

  const mass = toNumber(r.mass) ?? toNumber(r.weight)
  const status =
    toStr(r.production_status) ??
    toStr(r.productionStatus) ??
    toStr(r.status) ??
    toStr(r.state)

  const id =
    typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined

  const detail: WikiVehicleDetail = {
    id,
    name,
    slug: pickSlug(r, name),
    manufacturer: pickManufacturer(r),
    description,
    cargoScu,
    crewMin,
    crewMax,
    mass,
    lengthM,
    beamM,
    heightM,
    sizeClass,
    foci,
    speedScmMs,
    speedMaxMs,
    status,
    imageUrl,
  }

  // If nothing useful came back beyond the name, treat as no detail.
  if (!hasAnyUsefulField(detail)) return null
  return detail
}

function hasAnyUsefulField(d: WikiVehicleDetail): boolean {
  return Boolean(
    d.manufacturer ||
      d.description ||
      d.imageUrl ||
      d.cargoScu !== undefined ||
      d.crewMin !== undefined ||
      d.crewMax !== undefined ||
      d.mass !== undefined ||
      d.lengthM !== undefined ||
      d.beamM !== undefined ||
      d.heightM !== undefined ||
      d.sizeClass ||
      (d.foci && d.foci.length > 0) ||
      d.speedScmMs !== undefined ||
      d.speedMaxMs !== undefined ||
      d.status,
  )
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Search the wiki's vehicle list by name. The endpoint shape is community-
 * documented but field names are not fully confirmed, so the parser accepts
 * either `{ data: [...] }` or a bare array.
 */
export async function searchVehicles(query: string): Promise<WikiVehicleSummary[]> {
  const q = query.trim()
  if (!q) return []
  // The API accepts a `filter[name]` parameter for the vehicles index; we also
  // pass a plain `q` as a hedge in case the index supports a generic search.
  const path =
    `/vehicles?filter[name]=${encodeURIComponent(q)}` +
    `&q=${encodeURIComponent(q)}&limit=25`
  const body = await wikiGet<unknown>(path)
  const rows = unwrapArray(body)

  const out: WikiVehicleSummary[] = []
  for (const raw of rows) {
    const mapped = mapSummary(raw)
    if (mapped) out.push(mapped)
  }
  return out
}

/**
 * Fetch detail for a single vehicle by slug or name. Returns null when the
 * wiki has no usable data for the identifier. The single-vehicle endpoint
 * is path-based and accepts either a slug or a URL-encoded name.
 */
export async function getVehicleDetail(
  slugOrName: string,
): Promise<WikiVehicleDetail | null> {
  const id = slugOrName.trim()
  if (!id) return null
  const path = `/vehicles/${encodeURIComponent(id)}`
  const body = await wikiGet<unknown>(path)
  return mapDetail(body)
}
