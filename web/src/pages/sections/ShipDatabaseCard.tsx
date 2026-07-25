import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import { getVehicles, UexError, type Vehicle } from '../../services/uex'
import { slugify, type WikiVehicleDetail } from '../../services/scwiki'
import ShipDetail from './ShipDetail'

/** How many ships render before the "Show more" step. */
const PAGE = 48

const CREW_BANDS = [
  { value: 'solo', label: 'Solo (1)', test: (c: number) => c <= 1 },
  { value: 'small', label: 'Small crew (2–3)', test: (c: number) => c >= 2 && c <= 3 },
  { value: 'multi', label: 'Multicrew (4+)', test: (c: number) => c >= 4 },
] as const

const CARGO_OPTIONS = [
  { value: '1', label: '1+ SCU' },
  { value: '32', label: '32+ SCU' },
  { value: '128', label: '128+ SCU' },
  { value: '512', label: '512+ SCU' },
] as const

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const SIZE_LABELS: Record<string, string> = {
  XS: 'XS — extra small',
  S: 'S — small',
  M: 'M — medium',
  L: 'L — large',
  XL: 'XL — extra large',
}

function keyOf(v: Vehicle): string {
  return String(v.id ?? v.name)
}

/** One-line summary folded into the Ship `type` field when adding to a fleet. */
function describeVehicle(v: Vehicle): string {
  const parts: string[] = []
  if (v.roles && v.roles.length > 0) parts.push(v.roles.slice(0, 2).join('/'))
  if (typeof v.cargo === 'number' && v.cargo > 0) parts.push(`${v.cargo} SCU`)
  if (typeof v.crew === 'number') parts.push(`Crew ${v.crew}`)
  if (v.size) parts.push(`Size ${v.size}`)
  return parts.join(' · ')
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a)
    const ib = SIZE_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        {children}
      </select>
    </label>
  )
}

function CatalogSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ShipDatabaseCard() {
  const { state, addShip } = useSession()
  const fleet = state?.fleet ?? []

  const [catalog, setCatalog] = useState<Vehicle[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [role, setRole] = useState('')
  const [size, setSize] = useState('')
  const [crewBand, setCrewBand] = useState('')
  const [minCargo, setMinCargo] = useState('')
  const [kind, setKind] = useState('')

  const [limit, setLimit] = useState(PAGE)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<
    Record<string, WikiVehicleDetail | null>
  >({})

  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [addedKey, setAddedKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    getVehicles()
      .then((v) => {
        if (!active) return
        setCatalog(v)
      })
      .catch((err) => {
        if (!active) return
        setCatalog(null)
        setError(
          err instanceof UexError
            ? err.message
            : 'Could not load the ship catalog right now.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 150)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLimit(PAGE)
  }, [query, manufacturer, role, size, crewBand, minCargo, kind])

  // Clear the "added" confirmation on its own so it stays subtle.
  useEffect(() => {
    if (!addedKey) return
    const t = setTimeout(() => setAddedKey(null), 4000)
    return () => clearTimeout(t)
  }, [addedKey])

  const fleetNames = useMemo(
    () => new Set(fleet.map((s) => s.name.trim().toLowerCase())),
    [fleet],
  )

  const manufacturers = useMemo(() => {
    if (!catalog) return []
    const set = new Set<string>()
    for (const v of catalog) if (v.manufacturer) set.add(v.manufacturer)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [catalog])

  const roleOptions = useMemo(() => {
    if (!catalog) return []
    const set = new Set<string>()
    for (const v of catalog) for (const r of v.roles ?? []) set.add(r)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [catalog])

  const sizeOptions = useMemo(() => {
    if (!catalog) return []
    const set = new Set<string>()
    for (const v of catalog) if (v.size) set.add(v.size)
    return sortSizes(Array.from(set))
  }, [catalog])

  const hasCrewData = useMemo(
    () => Boolean(catalog?.some((v) => typeof v.crew === 'number')),
    [catalog],
  )
  const hasCargoData = useMemo(
    () => Boolean(catalog?.some((v) => typeof v.cargo === 'number')),
    [catalog],
  )
  const hasKindData = useMemo(
    () => Boolean(catalog?.some((v) => v.isGroundVehicle !== undefined)),
    [catalog],
  )

  const filtered = useMemo(() => {
    if (!catalog) return []
    const q = query.trim().toLowerCase()
    const band = CREW_BANDS.find((b) => b.value === crewBand)
    const cargoFloor = minCargo ? Number(minCargo) : undefined

    const rows = catalog.filter((v) => {
      if (q) {
        const haystack = [v.name, v.manufacturer ?? '', ...(v.roles ?? [])]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (manufacturer && v.manufacturer !== manufacturer) return false
      if (role && !(v.roles ?? []).includes(role)) return false
      if (size && v.size !== size) return false
      if (band) {
        if (typeof v.crew !== 'number' || !band.test(v.crew)) return false
      }
      if (cargoFloor !== undefined) {
        if (typeof v.cargo !== 'number' || v.cargo < cargoFloor) return false
      }
      if (kind === 'ships' && v.isGroundVehicle === true) return false
      if (kind === 'ground' && v.isGroundVehicle !== true) return false
      return true
    })

    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog, query, manufacturer, role, size, crewBand, minCargo, kind])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])

  const filtersActive = Boolean(
    search || query || manufacturer || role || size || crewBand || minCargo || kind,
  )

  function clearFilters() {
    setSearch('')
    setQuery('')
    setManufacturer('')
    setRole('')
    setSize('')
    setCrewBand('')
    setMinCargo('')
    setKind('')
  }

  async function addToFleet(v: Vehicle) {
    const key = keyOf(v)
    setAddingKey(key)
    try {
      await addShip({
        name: v.name,
        manufacturer: v.manufacturer ?? '',
        type: describeVehicle(v),
      })
      setAddedKey(key)
    } finally {
      setAddingKey(null)
    }
  }

  return (
    <Card
      title="Ship database"
      icon="🛸"
      action={
        catalog ? (
          <span className="text-xs text-slate-500">{catalog.length} entries</span>
        ) : undefined
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Every ship and vehicle in the community catalog. Search, filter, open one for full
        specs, and add it straight to your fleet.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <Field
            label="Search ships"
            placeholder="Avenger, Aegis, mining…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!catalog}
          />
        </div>

        {manufacturers.length > 1 && (
          <Select label="Manufacturer" value={manufacturer} onChange={setManufacturer}>
            <option value="">All manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}

        {roleOptions.length > 1 && (
          <Select label="Role" value={role} onChange={setRole}>
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}

        {sizeOptions.length > 1 && (
          <Select label="Size" value={size} onChange={setSize}>
            <option value="">All sizes</option>
            {sizeOptions.map((s) => (
              <option key={s} value={s}>
                {SIZE_LABELS[s] ?? s}
              </option>
            ))}
          </Select>
        )}

        {hasCrewData && (
          <Select label="Crew" value={crewBand} onChange={setCrewBand}>
            <option value="">Any crew</option>
            {CREW_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        )}

        {hasCargoData && (
          <Select label="Cargo" value={minCargo} onChange={setMinCargo}>
            <option value="">Any cargo</option>
            {CARGO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}

        {hasKindData && (
          <Select label="Kind" value={kind} onChange={setKind}>
            <option value="">Ships & vehicles</option>
            <option value="ships">Spaceships only</option>
            <option value="ground">Ground vehicles only</option>
          </Select>
        )}
      </div>

      {loading && <CatalogSkeleton />}

      {!loading && error && (
        <div className="space-y-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-300">{error}</p>
          <Button variant="ghost" onClick={() => setAttempt((a) => a + 1)}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && catalog && filtered.length === 0 && (
        <EmptyState icon="🛰️">
          {filtersActive ? (
            <>
              No ships match your filters.{' '}
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-purple-300 hover:text-purple-200"
              >
                Clear filters
              </button>
            </>
          ) : (
            'The catalog came back empty. Try again in a moment.'
          )}
        </EmptyState>
      )}

      {!loading && !error && visible.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Showing {visible.length} of {filtered.length}
              {catalog && filtered.length !== catalog.length
                ? ` (filtered from ${catalog.length})`
                : ''}
              .
            </p>
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((v) => {
              const key = keyOf(v)
              const domId = `ship-db-${slugify(key) || 'entry'}`
              const selected = selectedKey === key
              const inFleet = fleetNames.has(v.name.trim().toLowerCase())
              const toggle = () => setSelectedKey((cur) => (cur === key ? null : key))
              const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }
              return (
                <Fragment key={key}>
                  <li className="min-w-0">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={selected}
                      aria-controls={domId}
                      onClick={toggle}
                      onKeyDown={onKey}
                      className={`flex h-full cursor-pointer flex-col gap-2 rounded-xl border p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-purple-500 ${
                        selected
                          ? 'border-purple-700/70 bg-purple-950/25'
                          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={`mt-0.5 text-xs text-slate-500 motion-safe:transition-transform ${
                            selected ? 'rotate-90' : ''
                          }`}
                        >
                          ▶
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-100">{v.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {v.manufacturer ?? 'Unknown manufacturer'}
                          </p>
                        </div>
                        {inFleet && (
                          <span className="shrink-0">
                            <Badge tone="green" dot>
                              In fleet
                            </Badge>
                          </span>
                        )}
                      </div>

                      <div className="ml-5 flex flex-wrap gap-1.5">
                        {typeof v.cargo === 'number' && v.cargo > 0 && (
                          <Badge>{v.cargo} SCU</Badge>
                        )}
                        {typeof v.crew === 'number' && <Badge>Crew {v.crew}</Badge>}
                        {v.size && <Badge>Size {v.size}</Badge>}
                        {(v.roles ?? []).slice(0, 2).map((r) => (
                          <Badge key={r} tone="purple">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </li>

                  {selected && (
                    <li
                      id={domId}
                      className="min-w-0 sm:col-span-2 xl:col-span-3"
                    >
                      <div className="rounded-xl border border-purple-900/50 bg-purple-950/10 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wider text-purple-300">
                              {v.name}
                            </p>
                            {describeVehicle(v) && (
                              <p className="truncate text-[11px] text-slate-500">
                                Catalog: {describeVehicle(v)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              onClick={() => addToFleet(v)}
                              disabled={addingKey !== null}
                            >
                              {addingKey === key
                                ? 'Adding…'
                                : inFleet
                                  ? 'Add another'
                                  : 'Add to fleet'}
                            </Button>
                            <Button variant="ghost" onClick={() => setSelectedKey(null)}>
                              Close
                            </Button>
                          </div>
                        </div>

                        {addedKey === key && (
                          <p
                            role="status"
                            className="mt-2 text-xs text-emerald-300"
                          >
                            ✓ Added to your fleet — find it on the Fleet page.
                          </p>
                        )}

                        <ShipDetail
                          ship={{ name: v.name, manufacturer: v.manufacturer }}
                          cached={key in detailCache ? detailCache[key] : undefined}
                          onResolved={(detail) =>
                            setDetailCache((prev) => ({ ...prev, [key]: detail }))
                          }
                        />
                      </div>
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ul>

          {filtered.length > visible.length && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ships
              </Button>
            </div>
          )}
        </>
      )}

      <p className="mt-5 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
        Ship catalog from UEX Corp (uexcorp.space); detailed specs from Star Citizen Wiki
        (star-citizen.wiki), content licensed CC BY-SA 4.0. Both community-run — not
        affiliated with CIG.
      </p>
    </Card>
  )
}
