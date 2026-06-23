import { useEffect, useState } from 'react'
import { Badge, Button, Skeleton } from '../../components/ui'
import {
  getVehicleDetail,
  ScWikiError,
  searchVehicles,
  slugify,
  type WikiVehicleDetail,
} from '../../services/scwiki'

/** Props for the inline ship detail panel. */
type Props = {
  ship: { name: string; manufacturer?: string }
  /** Cached detail (or `null` meaning "we looked, nothing found"). */
  cached?: WikiVehicleDetail | null
  /** Called when a fresh fetch resolves so the parent can cache it. */
  onResolved: (detail: WikiVehicleDetail | null) => void
}

/**
 * Renders a defensive detail panel that fetches a ship's specs from the
 * community Star Citizen Wiki. The component owns the loading/error state but
 * delegates caching to the parent so reopening the panel is instant.
 */
export default function ShipDetail({ ship, cached, onResolved }: Props) {
  // `undefined` here distinguishes "not yet fetched" from "fetched, nothing"
  // (which is `null`).
  const [detail, setDetail] = useState<WikiVehicleDetail | null | undefined>(
    cached === undefined ? undefined : cached,
  )
  const [loading, setLoading] = useState(cached === undefined)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (cached !== undefined) {
      // Already resolved at least once — keep showing the cached result.
      setDetail(cached)
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void resolveShipDetail(ship)
      .then((result) => {
        if (!active) return
        setDetail(result)
        onResolved(result)
      })
      .catch((err) => {
        if (!active) return
        const message =
          err instanceof ScWikiError
            ? err.message
            : 'Could not load ship details from the wiki.'
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // `attempt` is included so Retry re-runs the effect. `ship` is by reference
    // from the parent fleet list, so identity-stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.name, ship.manufacturer, attempt])

  return (
    <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {loading && <DetailSkeleton />}

      {!loading && error && (
        <div className="space-y-3">
          <p className="text-sm text-amber-300">{error}</p>
          <Button variant="ghost" onClick={() => setAttempt((a) => a + 1)}>
            Retry
          </Button>
          <Attribution />
        </div>
      )}

      {!loading && !error && detail === null && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            No details available from the wiki yet for this ship.
          </p>
          <Attribution />
        </div>
      )}

      {!loading && !error && detail && (
        <DetailBody detail={detail} expanded={expanded} setExpanded={setExpanded} />
      )}
    </div>
  )
}

function DetailBody({
  detail,
  expanded,
  setExpanded,
}: {
  detail: WikiVehicleDetail
  expanded: boolean
  setExpanded: (v: boolean) => void
}) {
  const rows = buildStatRows(detail)
  const description = detail.description?.trim() ?? ''
  // Roughly "more than ~3 lines" — keep the threshold conservative.
  const isLong = description.length > 220

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-slate-100">
            {detail.name}
          </h3>
          {detail.manufacturer && (
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-400">
              {detail.manufacturer}
            </p>
          )}
        </div>
        {detail.status && (
          <Badge tone={statusTone(detail.status)} dot>
            {detail.status}
          </Badge>
        )}
      </div>

      {detail.imageUrl && (
        <img
          src={detail.imageUrl}
          alt={`${detail.name} from the Star Citizen Wiki`}
          loading="lazy"
          className="max-h-56 w-full rounded-lg border border-slate-800 object-cover"
          // If the image 404s or is hot-link blocked, hide it gracefully.
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      {description && (
        <div className="text-sm leading-relaxed text-slate-300">
          <p className={expanded || !isLong ? '' : 'line-clamp-3'}>{description}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-purple-300 hover:text-purple-200"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {detail.foci && detail.foci.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detail.foci.map((f) => (
            <Badge key={f} tone="purple">
              {f}
            </Badge>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {row.label}
              </dt>
              <dd className="truncate text-sm text-slate-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Attribution />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      <p className="pt-1 text-xs text-slate-500">Loading details…</p>
    </div>
  )
}

function Attribution() {
  return (
    <p className="border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
      Ship details from Star Citizen Wiki (star-citizen.wiki) — content licensed
      CC BY-SA 4.0. Unofficial; not affiliated with CIG.
    </p>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type StatRow = { label: string; value: string }

function buildStatRows(d: WikiVehicleDetail): StatRow[] {
  const rows: StatRow[] = []
  if (d.cargoScu !== undefined) rows.push({ label: 'Cargo', value: `${d.cargoScu} SCU` })
  rows.push(...crewRows(d))
  if (d.mass !== undefined) rows.push({ label: 'Mass', value: `${formatNumber(d.mass)} kg` })
  if (d.lengthM !== undefined) rows.push({ label: 'Length', value: `${formatNumber(d.lengthM)} m` })
  if (d.beamM !== undefined) rows.push({ label: 'Beam', value: `${formatNumber(d.beamM)} m` })
  if (d.heightM !== undefined) rows.push({ label: 'Height', value: `${formatNumber(d.heightM)} m` })
  if (d.speedScmMs !== undefined)
    rows.push({ label: 'SCM speed', value: `${formatNumber(d.speedScmMs)} m/s` })
  if (d.speedMaxMs !== undefined)
    rows.push({ label: 'Max speed', value: `${formatNumber(d.speedMaxMs)} m/s` })
  if (d.sizeClass) rows.push({ label: 'Size', value: d.sizeClass })
  return rows
}

function crewRows(d: WikiVehicleDetail): StatRow[] {
  if (d.crewMin !== undefined && d.crewMax !== undefined) {
    return [
      {
        label: 'Crew',
        value:
          d.crewMin === d.crewMax
            ? String(d.crewMin)
            : `${d.crewMin}–${d.crewMax}`,
      },
    ]
  }
  if (d.crewMax !== undefined) return [{ label: 'Crew', value: String(d.crewMax) }]
  if (d.crewMin !== undefined) return [{ label: 'Crew', value: String(d.crewMin) }]
  return []
}

function formatNumber(n: number): string {
  // Trim trailing .00 but keep up to 2 fractional digits.
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function statusTone(status: string): 'green' | 'amber' | 'slate' {
  const s = status.toLowerCase()
  if (s.includes('flight') || s.includes('flyable') || s.includes('release')) return 'green'
  if (s.includes('concept') || s.includes('progress') || s.includes('development'))
    return 'amber'
  return 'slate'
}

/**
 * Try a slug-based detail fetch first, then fall back to a name search +
 * best-match. We return `null` if neither path yields a usable record.
 */
async function resolveShipDetail(ship: {
  name: string
  manufacturer?: string
}): Promise<WikiVehicleDetail | null> {
  const slug = slugify(ship.name)

  // 1) Slug path — fast happy path for common ships.
  if (slug) {
    try {
      const direct = await getVehicleDetail(slug)
      if (direct) return direct
    } catch (err) {
      // A 404 on the slug is expected — fall through to a search. Re-throw
      // network/CORS so the caller can show the friendly error message.
      if (err instanceof ScWikiError && err.kind === 'network') throw err
      if (err instanceof ScWikiError && err.kind === 'http' && err.status && err.status !== 404) {
        throw err
      }
    }
  }

  // 2) Search by name, then best-match by lowercased name similarity.
  const matches = await searchVehicles(ship.name)
  if (matches.length === 0) return null

  const target = ship.name.toLowerCase().trim()
  const best =
    matches.find((m) => m.name.toLowerCase() === target) ??
    matches.find((m) => m.name.toLowerCase().includes(target)) ??
    matches.find((m) => target.includes(m.name.toLowerCase())) ??
    matches[0]

  const id = best.slug ?? slugify(best.name)
  if (!id) return null

  try {
    return await getVehicleDetail(id)
  } catch (err) {
    // If the detail lookup fails after a successful search, surface the
    // summary we have so the user at least sees the manufacturer.
    if (err instanceof ScWikiError && err.kind === 'http' && err.status === 404) {
      return {
        id: best.id,
        name: best.name,
        slug: best.slug,
        manufacturer: best.manufacturer,
      }
    }
    throw err
  }
}
