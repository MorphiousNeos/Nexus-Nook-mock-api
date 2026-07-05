import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field } from '../../components/ui'
import { getVehicles, UexError, type Vehicle } from '../../services/uex'
import type { WikiVehicleDetail } from '../../services/scwiki'
import ShipDetail from './ShipDetail'

/** How a ship was acquired. Folded into the Ship `notes` field — no type change. */
const ACQUIRED_OPTIONS = [
  { value: '', label: 'No tag' },
  { value: 'Pledge', label: 'Pledge' },
  { value: 'Bought in-game (aUEC)', label: 'Bought in-game (aUEC)' },
  { value: 'Rented', label: 'Rented' },
  { value: 'Other', label: 'Other' },
] as const

/** Describe a catalog ship's cargo/crew for the Ship `type` field. */
function describeVehicle(v: Vehicle): string {
  const parts: string[] = []
  if (typeof v.cargo === 'number') parts.push(`${v.cargo} SCU`)
  if (typeof v.crew === 'number') parts.push(`Crew ${v.crew}`)
  return parts.join(' · ')
}

export default function FleetCard() {
  const { state, addShip, removeShip } = useSession()
  const fleet = state!.fleet

  // Picker open/closed + custom (manual) fallback toggle.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  // Catalog cache — fetched once, kept in component state so reopening the
  // picker does not refetch.
  const [catalog, setCatalog] = useState<Vehicle[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Picker search + selected acquisition tag.
  const [query, setQuery] = useState('')
  const [acquired, setAcquired] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  // Manual add fields.
  const [name, setName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  // Detail-view state: which ship is expanded + a per-ship-id cache of the
  // wiki lookup result so reopening is instant. `null` cached means "we
  // already looked and the wiki had nothing for it".
  const [expandedShipId, setExpandedShipId] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<
    Record<string, WikiVehicleDetail | null>
  >({})

  const fetchedRef = useRef(false)

  // Load the catalog the first time the picker opens (cache afterwards).
  useEffect(() => {
    if (!pickerOpen || fetchedRef.current) return
    fetchedRef.current = true
    let active = true
    setLoading(true)
    setLoadError(null)
    getVehicles()
      .then((v) => active && setCatalog(v))
      .catch((err) => {
        if (!active) return
        // Allow a retry next open and surface the friendly message.
        fetchedRef.current = false
        setLoadError(
          err instanceof UexError
            ? err.message
            : 'Could not load the ship catalog. You can still add a ship manually.',
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [pickerOpen])

  const results = useMemo(() => {
    if (!catalog) return []
    const q = query.trim().toLowerCase()
    const base = q
      ? catalog.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            (v.manufacturer ?? '').toLowerCase().includes(q),
        )
      : catalog
    return base.slice(0, 100)
  }, [catalog, query])

  async function pickShip(v: Vehicle) {
    const key = String(v.id ?? v.name)
    setAdding(key)
    try {
      await addShip({
        name: v.name,
        manufacturer: v.manufacturer ?? '',
        type: describeVehicle(v),
        notes: acquired ? `Acquired: ${acquired}` : undefined,
      })
    } finally {
      setAdding(null)
    }
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addShip({
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        type: type.trim(),
        notes: notes.trim() || undefined,
      })
      setName('')
      setManufacturer('')
      setType('')
      setNotes('')
      setCustomOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Fleet"
      icon="🚀"
      action={
        <Button
          variant={pickerOpen ? 'ghost' : 'primary'}
          onClick={() => setPickerOpen((o) => !o)}
        >
          {pickerOpen ? 'Close' : 'Add ship'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Your personal fleet — ships you add yourself. This is your own data; Nexus Nook does
        not import from or scrape RSI.
      </p>

      {pickerOpen && (
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field
              label="Search the Star Citizen ship catalog"
              placeholder="Avenger, Aegis, cargo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Acquired
              </span>
              <select
                value={acquired}
                onChange={(e) => setAcquired(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:w-48"
              >
                {ACQUIRED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
            {loading && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                Loading ship catalog…
              </p>
            )}

            {!loading && loadError && (
              <p className="px-3 py-4 text-sm text-amber-300">{loadError}</p>
            )}

            {!loading && !loadError && catalog && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                No ships match “{query}”.
              </p>
            )}

            {!loading && !loadError && results.length > 0 && (
              <ul className="divide-y divide-slate-800/70">
                {results.map((v) => {
                  const key = String(v.id ?? v.name)
                  const meta = describeVehicle(v)
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{v.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {[v.manufacturer, meta].filter(Boolean).join(' · ') ||
                            'Unspecified'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="shrink-0"
                        disabled={adding !== null}
                        onClick={() => pickShip(v)}
                      >
                        {adding === key ? 'Adding…' : 'Add'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Ship data from UEX Corp (uexcorp.space) — community-run, not affiliated with
              CIG.
            </p>
            <Button variant="ghost" onClick={() => setCustomOpen((o) => !o)}>
              {customOpen ? 'Hide custom' : 'Add custom'}
            </Button>
          </div>

          {customOpen && (
            <form
              onSubmit={submitCustom}
              className="mt-3 grid gap-3 border-t border-slate-800 pt-3 sm:grid-cols-2"
            >
              <Field
                label="Ship name"
                placeholder="Avenger Titan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Field
                label="Manufacturer"
                placeholder="Aegis Dynamics"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
              <Field
                label="Type"
                placeholder="Light Fighter"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <Field
                label="Notes (optional)"
                placeholder="LTI, daily driver…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy || !name.trim()}>
                  {busy ? 'Adding…' : 'Add custom ship'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {fleet.length === 0 && (
          <EmptyState>No ships yet. Use “Add ship” to search the catalog.</EmptyState>
        )}
        {fleet.map((ship) => {
          const expanded = expandedShipId === ship.id
          const toggle = () =>
            setExpandedShipId((cur) => (cur === ship.id ? null : ship.id))
          const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }
          return (
            <li
              key={ship.id}
              className="rounded-lg border border-slate-800 bg-slate-950/50"
            >
              <div className="flex items-start justify-between gap-3 px-3 py-2">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  aria-controls={`ship-detail-${ship.id}`}
                  onClick={toggle}
                  onKeyDown={onKey}
                  className="min-w-0 flex-1 cursor-pointer rounded outline-none transition focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`text-xs text-slate-500 transition-transform ${
                        expanded ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                    <p className="truncate font-medium text-slate-100">{ship.name}</p>
                  </div>
                  <p className="ml-5 truncate text-xs text-slate-400">
                    {[ship.manufacturer, ship.type].filter(Boolean).join(' · ') ||
                      'Unspecified'}
                  </p>
                  {ship.notes && (
                    <p className="ml-5 mt-1 truncate text-xs text-slate-500">
                      {ship.notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="danger"
                  onClick={() => removeShip(ship.id)}
                  className="shrink-0"
                >
                  Remove
                </Button>
              </div>
              {expanded && (
                <div id={`ship-detail-${ship.id}`} className="px-3 pb-3">
                  <ShipDetail
                    ship={{ name: ship.name, manufacturer: ship.manufacturer }}
                    cached={
                      ship.id in detailCache ? detailCache[ship.id] : undefined
                    }
                    onResolved={(detail) =>
                      setDetailCache((prev) => ({ ...prev, [ship.id]: detail }))
                    }
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
