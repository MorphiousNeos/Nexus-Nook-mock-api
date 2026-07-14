import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field } from '../../components/ui'
import type { Loadout, LoadoutComponent } from '../../services/types'
import {
  getCategories,
  getItemPrices,
  getItemsByCategory,
  UexError,
  type Item,
  type ItemCategory,
  type ItemPrice,
} from '../../services/uex'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Buy-location list for one component, fetched on demand. */
function BuyLocations({ uexId }: { uexId: number | string }) {
  const [prices, setPrices] = useState<ItemPrice[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getItemPrices(uexId)
      .then((p) => active && setPrices(p))
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof UexError ? err.message : 'Could not load buy locations.',
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [uexId])

  if (loading) {
    return <p className="px-2 py-1.5 text-xs text-slate-500">Checking shops…</p>
  }
  if (error) return <p className="px-2 py-1.5 text-xs text-amber-300">{error}</p>
  if (!prices || prices.length === 0) {
    return (
      <p className="px-2 py-1.5 text-xs text-slate-500">
        No shop listings found — it may be loot-only or the data is pending.
      </p>
    )
  }
  return (
    <ul className="space-y-1 px-2 py-1.5">
      {prices.slice(0, 5).map((p, i) => (
        <li key={`${p.terminalName}-${i}`} className="flex items-baseline justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-slate-300">
            {p.terminalName}
            {p.system ? <span className="text-slate-500"> · {p.system}</span> : null}
          </span>
          <span className="shrink-0 tabular-nums text-emerald-300">
            {p.priceBuy !== undefined ? `${p.priceBuy.toLocaleString()} aUEC` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function LoadoutCard() {
  const { state, addLoadout, updateLoadout, removeLoadout } = useSession()
  const loadouts = state!.loadouts
  const fleet = state!.fleet

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [ship, setShip] = useState('')
  const [busy, setBusy] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Component picker state (per expanded loadout).
  const [categories, setCategories] = useState<ItemCategory[] | null>(null)
  const [catError, setCatError] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState('')
  const [itemsByCat, setItemsByCat] = useState<Record<string, Item[]>>({})
  const [itemsLoading, setItemsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [priceOpenFor, setPriceOpenFor] = useState<string | null>(null)
  const catsFetchedRef = useRef(false)

  // Load categories once, when the first picker opens.
  useEffect(() => {
    if (!expandedId || catsFetchedRef.current) return
    catsFetchedRef.current = true
    getCategories()
      .then(setCategories)
      .catch((err) => {
        catsFetchedRef.current = false
        setCatError(
          err instanceof UexError ? err.message : 'Could not load component categories.',
        )
      })
  }, [expandedId])

  useEffect(() => {
    if (!selectedCat || itemsByCat[selectedCat]) return
    let active = true
    setItemsLoading(true)
    getItemsByCategory(selectedCat)
      .then((items) => active && setItemsByCat((prev) => ({ ...prev, [selectedCat]: items })))
      .catch(() => {})
      .finally(() => active && setItemsLoading(false))
    return () => {
      active = false
    }
  }, [selectedCat, itemsByCat])

  const catalog = selectedCat ? itemsByCat[selectedCat] ?? null : null
  const filtered = useMemo(() => {
    if (!catalog) return []
    const q = search.trim().toLowerCase()
    if (!q) return catalog.slice(0, 50)
    return catalog
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.manufacturer ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50)
  }, [catalog, search])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !ship.trim() || busy) return
    setBusy(true)
    try {
      await addLoadout({
        name: name.trim(),
        ship: ship.trim(),
        savedInGame: false,
        components: [],
      })
      setName('')
      setShip('')
      setFormOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function addComponent(lo: Loadout, item: Item) {
    const component: LoadoutComponent = {
      id: uid(),
      name: item.name,
      category: item.category,
      uexId: item.id,
    }
    await updateLoadout(lo.id, { components: [...lo.components, component] })
  }

  async function removeComponent(lo: Loadout, componentId: string) {
    await updateLoadout(lo.id, {
      components: lo.components.filter((c) => c.id !== componentId),
    })
  }

  return (
    <Card
      title="Loadouts"
      icon="🎛️"
      action={
        <Button
          variant={formOpen ? 'ghost' : 'primary'}
          onClick={() => setFormOpen((o) => !o)}
        >
          {formOpen ? 'Close' : 'New loadout'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Component builds for your ships — with "where do I buy this" answers on tap.
        Mark a build saved once you store it via in-game Item Recovery.
      </p>

      {formOpen && (
        <form
          onSubmit={submit}
          className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2"
        >
          <Field
            label="Loadout name"
            placeholder="PvP shield-tank"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Ship
            </span>
            <input
              list="nn-fleet-ships"
              placeholder="Cutlass Black"
              value={ship}
              onChange={(e) => setShip(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <datalist id="nn-fleet-ships">
              {fleet.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !name.trim() || !ship.trim()}>
              {busy ? 'Creating…' : 'Create loadout'}
            </Button>
          </div>
        </form>
      )}

      {loadouts.length === 0 && (
        <EmptyState>
          No loadouts yet. Create one per ship role — bounty build, cargo build, racing
          trim…
        </EmptyState>
      )}

      <ul className="space-y-2">
        {loadouts.map((lo) => {
          const expanded = expandedId === lo.id
          return (
            <li
              key={lo.id}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(expanded ? null : lo.id)
                    setSelectedCat('')
                    setSearch('')
                    setPriceOpenFor(null)
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-100">{lo.name}</p>
                    <Badge tone="purple">{lo.ship}</Badge>
                    {lo.savedInGame && <Badge tone="green">Saved in game</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {lo.components.length}{' '}
                    {lo.components.length === 1 ? 'component' : 'components'}{' '}
                    {expanded ? '▾' : '▸'}
                  </p>
                </button>
                <Button
                  variant="danger"
                  className="shrink-0"
                  onClick={() => removeLoadout(lo.id)}
                >
                  Remove
                </Button>
              </div>

              {expanded && (
                <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={lo.savedInGame}
                      onChange={(e) =>
                        updateLoadout(lo.id, { savedInGame: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-purple-500"
                    />
                    Saved via in-game Item Recovery
                  </label>

                  {lo.components.length > 0 && (
                    <ul className="space-y-1.5">
                      {lo.components.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                            <span className="min-w-0 truncate text-sm text-slate-200">
                              {c.name}
                              {c.category && (
                                <span className="ml-1.5 text-[11px] text-slate-500">
                                  {c.category}
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              {c.uexId !== undefined && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPriceOpenFor(priceOpenFor === c.id ? null : c.id)
                                  }
                                  className="text-xs text-sky-300 hover:underline"
                                >
                                  {priceOpenFor === c.id ? 'Hide shops' : 'Where to buy?'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeComponent(lo, c.id)}
                                className="text-xs text-slate-600 hover:text-red-400"
                                aria-label={`Remove ${c.name}`}
                              >
                                ✕
                              </button>
                            </span>
                          </div>
                          {priceOpenFor === c.id && c.uexId !== undefined && (
                            <div className="border-t border-slate-800/70">
                              <BuyLocations uexId={c.uexId} />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Component picker */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                      Add component
                    </p>
                    {catError && <p className="text-xs text-amber-300">{catError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={selectedCat}
                        onChange={(e) => {
                          setSelectedCat(e.target.value)
                          setSearch('')
                        }}
                        disabled={!categories}
                        className="min-w-[10rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none disabled:opacity-60"
                      >
                        <option value="">
                          {categories ? 'Choose a category…' : 'Loading categories…'}
                        </option>
                        {categories?.map((c) => (
                          <option key={String(c.id)} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {selectedCat && (
                        <input
                          placeholder="Search…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="min-w-[8rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        />
                      )}
                    </div>

                    {selectedCat && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-800/70">
                        {itemsLoading && (
                          <p className="px-3 py-4 text-center text-xs text-slate-500">
                            Loading…
                          </p>
                        )}
                        {!itemsLoading && filtered.length === 0 && (
                          <p className="px-3 py-4 text-center text-xs text-slate-500">
                            Nothing matches.
                          </p>
                        )}
                        {!itemsLoading && filtered.length > 0 && (
                          <ul className="divide-y divide-slate-800/60">
                            {filtered.map((item) => (
                              <li
                                key={String(item.id ?? item.name)}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                              >
                                <span className="min-w-0 truncate text-sm text-slate-200">
                                  {item.name}
                                  {item.manufacturer && (
                                    <span className="ml-1.5 text-[11px] text-slate-500">
                                      {item.manufacturer}
                                    </span>
                                  )}
                                </span>
                                <Button
                                  variant="ghost"
                                  className="shrink-0"
                                  onClick={() => addComponent(lo, item)}
                                >
                                  Add
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Component data &amp; shop prices from UEX Corp (uexcorp.space). For full
                    DPS simulation, open{' '}
                    <a
                      href="https://erkul.games/calculator"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-300 underline hover:text-purple-200"
                    >
                      erkul.games ↗
                    </a>
                    .
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
