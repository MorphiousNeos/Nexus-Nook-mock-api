import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field } from '../../components/ui'
import type { BlueprintStatus } from '../../services/types'
import {
  getCategories,
  getItemsByCategory,
  UexError,
  type Item,
  type ItemCategory,
} from '../../services/uex'

const STATUS_LABELS: Record<BlueprintStatus, string> = {
  wanted: 'Wanted',
  found: 'Blueprint Found',
  crafted: 'Crafted',
}

const STATUS_COLORS: Record<BlueprintStatus, string> = {
  wanted: 'text-amber-400 border-amber-700 bg-amber-950/40',
  found: 'text-blue-300 border-blue-700 bg-blue-950/40',
  crafted: 'text-emerald-400 border-emerald-700 bg-emerald-950/40',
}

const STATUS_ORDER: BlueprintStatus[] = ['wanted', 'found', 'crafted']

export default function BlueprintCard() {
  const { state, addBlueprint, updateBlueprint, removeBlueprint } = useSession()
  const blueprints = state!.blueprints

  const [pickerOpen, setPickerOpen] = useState(false)

  // UEX category state
  const [categories, setCategories] = useState<ItemCategory[] | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState('')

  // Per-category item cache
  const [itemsByCat, setItemsByCat] = useState<Record<string, Item[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Search
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  // Selection form
  const [selected, setSelected] = useState<Item | null>(null)
  const [pickStatus, setPickStatus] = useState<BlueprintStatus>('wanted')
  const [pickNotes, setPickNotes] = useState('')
  const [pickBusy, setPickBusy] = useState(false)

  // Custom entry
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customStatus, setCustomStatus] = useState<BlueprintStatus>('wanted')
  const [customNotes, setCustomNotes] = useState('')
  const [customBusy, setCustomBusy] = useState(false)

  const catsFetchedRef = useRef(false)

  useEffect(() => {
    if (!pickerOpen || catsFetchedRef.current) return
    catsFetchedRef.current = true
    let active = true
    setCatLoading(true)
    setCatError(null)
    getCategories()
      .then((cats) => active && setCategories(cats))
      .catch((err) => {
        if (!active) return
        catsFetchedRef.current = false
        setCatError(
          err instanceof UexError
            ? err.message
            : 'Could not load item categories. You can still add a blueprint manually.',
        )
      })
      .finally(() => active && setCatLoading(false))
    return () => { active = false }
  }, [pickerOpen])

  useEffect(() => {
    if (!selectedCat || itemsByCat[selectedCat]) return
    let active = true
    setLoading(true)
    setLoadError(null)
    getItemsByCategory(selectedCat)
      .then((items) => active && setItemsByCat((prev) => ({ ...prev, [selectedCat]: items })))
      .catch((err) => {
        if (!active) return
        setLoadError(
          err instanceof UexError ? err.message : 'Could not load items for this category.',
        )
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [selectedCat, itemsByCat])

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 150)
    return () => clearTimeout(t)
  }, [search])

  const catalog = selectedCat ? itemsByCat[selectedCat] ?? null : null

  const filtered = useMemo(() => {
    if (!catalog) return []
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.manufacturer ?? '').toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q),
    )
  }, [catalog, query])

  const visible = useMemo(() => filtered.slice(0, 100), [filtered])

  function cancelSelection() {
    setSelected(null)
    setPickStatus('wanted')
    setPickNotes('')
  }

  async function confirmSelection(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setPickBusy(true)
    try {
      await addBlueprint({
        name: selected.name,
        category: selected.category,
        status: pickStatus,
        notes: pickNotes.trim() || undefined,
      })
      cancelSelection()
      setPickerOpen(false)
    } finally {
      setPickBusy(false)
    }
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault()
    if (!customName.trim()) return
    setCustomBusy(true)
    try {
      await addBlueprint({
        name: customName.trim(),
        status: customStatus,
        notes: customNotes.trim() || undefined,
      })
      setCustomName('')
      setCustomStatus('wanted')
      setCustomNotes('')
      setCustomOpen(false)
      setPickerOpen(false)
    } finally {
      setCustomBusy(false)
    }
  }

  const grouped = useMemo(() => {
    const map: Record<BlueprintStatus, typeof blueprints> = {
      wanted: [],
      found: [],
      crafted: [],
    }
    for (const bp of blueprints) {
      map[bp.status].push(bp)
    }
    return map
  }, [blueprints])

  return (
    <Card
      title="Blueprint Tracker"
      icon="📐"
      action={
        <Button
          variant={pickerOpen ? 'ghost' : 'primary'}
          onClick={() => setPickerOpen((o) => !o)}
        >
          {pickerOpen ? 'Close' : 'Track blueprint'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        Track crafting blueprints you want, have found, or have already used to craft gear.
      </p>

      {pickerOpen && (
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Category
            </span>
            <select
              value={selectedCat}
              onChange={(e) => {
                setSelectedCat(e.target.value)
                cancelSelection()
                setSearch('')
              }}
              disabled={catLoading || !!catError || !categories}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-60"
            >
              <option value="">
                {catLoading
                  ? 'Loading categories…'
                  : categories
                    ? 'Choose a category…'
                    : 'Categories unavailable'}
              </option>
              {categories?.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {catError && <p className="mt-2 text-sm text-amber-300">{catError}</p>}

          {selectedCat && (
            <div className="mt-3">
              <Field
                label="Search this category"
                placeholder="Helmet, medpen, armor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {selectedCat && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
              {loading && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">Loading items…</p>
              )}
              {!loading && loadError && (
                <p className="px-3 py-4 text-sm text-amber-300">{loadError}</p>
              )}
              {!loading && !loadError && catalog && filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  {query ? `No items match "${query}".` : 'No items in this category.'}
                </p>
              )}
              {!loading && !loadError && visible.length > 0 && (
                <ul className="divide-y divide-slate-800/70">
                  {visible.map((item) => {
                    const key = String(item.id ?? item.name)
                    const isSelected =
                      selected !== null && String(selected.id ?? selected.name) === key
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{item.name}</p>
                          {item.manufacturer && (
                            <p className="truncate text-xs text-slate-400">{item.manufacturer}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          className="shrink-0"
                          disabled={pickBusy}
                          onClick={() => setSelected(item)}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {selected && (
            <form
              onSubmit={confirmSelection}
              className="mt-3 rounded-lg border border-purple-900/50 bg-purple-950/20 p-3 space-y-3"
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-300">Tracking</p>
                <p className="truncate font-medium text-slate-100">{selected.name}</p>
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPickStatus(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-opacity ${STATUS_COLORS[s]} ${pickStatus === s ? 'opacity-100 ring-1 ring-purple-400' : 'opacity-50'}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Notes (optional)"
                placeholder="Found at Levski, dropped by NPC…"
                value={pickNotes}
                onChange={(e) => setPickNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={pickBusy}>
                  {pickBusy ? 'Saving…' : 'Add to tracker'}
                </Button>
                <Button type="button" variant="ghost" disabled={pickBusy} onClick={cancelSelection}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Item data from UEX Corp (uexcorp.space) — community-run, not affiliated with CIG.
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
                label="Blueprint name"
                placeholder="Devastator Twelve Shotgun"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div>
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </span>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomStatus(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-opacity ${STATUS_COLORS[s]} ${customStatus === s ? 'opacity-100 ring-1 ring-purple-400' : 'opacity-50'}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Notes (optional)"
                placeholder="Found at Levski, researching…"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="sm:col-span-2"
              />
              <div className="flex items-end sm:col-span-2">
                <Button
                  type="submit"
                  disabled={customBusy || !customName.trim()}
                  className="w-full"
                >
                  {customBusy ? 'Saving…' : 'Add custom blueprint'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {blueprints.length === 0 && (
        <EmptyState>
          No blueprints tracked yet. Use "Track blueprint" to start your crafting list.
        </EmptyState>
      )}

      {STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => (
        <div key={status} className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {STATUS_LABELS[status]}
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
              {grouped[status].length}
            </span>
          </h3>
          <ul className="space-y-2">
            {grouped[status].map((bp) => (
              <li
                key={bp.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-100">{bp.name}</p>
                    {bp.category && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {bp.category}
                      </span>
                    )}
                  </div>
                  {bp.notes && <p className="mt-0.5 text-xs text-slate-500">{bp.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <select
                    value={bp.status}
                    onChange={(e) =>
                      updateBlueprint(bp.id, { status: e.target.value as BlueprintStatus })
                    }
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:border-purple-500 focus:outline-none"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="danger"
                    onClick={() => removeBlueprint(bp.id)}
                    className="text-xs"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}
