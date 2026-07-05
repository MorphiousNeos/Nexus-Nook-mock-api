import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field } from '../../components/ui'
import {
  getCategories,
  getItemsByCategory,
  UexError,
  type Item,
  type ItemCategory,
} from '../../services/uex'

/** One-line meta string for a catalog item (category/kind), used in list rows. */
function describeItem(item: Item): string {
  const parts: string[] = []
  if (item.category) parts.push(item.category)
  if (item.kind && item.kind !== item.category) parts.push(item.kind)
  return parts.join(' · ')
}

/**
 * Fold catalog category + free-text notes into the single `notes` field on
 * InventoryItem. We deliberately do NOT change the InventoryItem type — the
 * category is only context, so a `[Category] notes…` prefix is the most
 * pragmatic place to surface it.
 */
function composeNotes(category: string | undefined, freeText: string): string | undefined {
  const tag = category ? `[${category}]` : ''
  const text = freeText.trim()
  const combined = [tag, text].filter(Boolean).join(' ')
  return combined || undefined
}

export default function InventoryCard() {
  const { state, addItem, removeItem } = useSession()
  const inventory = state!.inventory

  // Picker open/closed + custom (manual) fallback toggle.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  // Categories — UEX requires choosing a category before listing items.
  const [categories, setCategories] = useState<ItemCategory[] | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState('')

  // Per-category item cache + load state for the currently selected category.
  const [itemsByCat, setItemsByCat] = useState<Record<string, Item[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Search input + debounced query used for filtering within a category.
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  // Selection / per-item form for quantity + notes.
  const [selected, setSelected] = useState<Item | null>(null)
  const [pickQty, setPickQty] = useState('1')
  const [pickNotes, setPickNotes] = useState('')
  const [pickBusy, setPickBusy] = useState(false)

  // Manual ("Add custom") fields.
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const catsFetchedRef = useRef(false)

  // Load the category list the first time the picker opens (cache afterwards).
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
            : 'Could not load item categories. You can still add an item manually.',
        )
      })
      .finally(() => active && setCatLoading(false))
    return () => {
      active = false
    }
  }, [pickerOpen])

  // Load items for the selected category (cache per category).
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
          err instanceof UexError
            ? err.message
            : 'Could not load items for this category.',
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [selectedCat, itemsByCat])

  // Debounce the search input.
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
        (item.category ?? '').toLowerCase().includes(q) ||
        (item.kind ?? '').toLowerCase().includes(q),
    )
  }, [catalog, query])

  const visible = useMemo(() => filtered.slice(0, 100), [filtered])

  function selectItem(item: Item) {
    setSelected(item)
    setPickQty('1')
    setPickNotes('')
  }

  function cancelSelection() {
    setSelected(null)
    setPickQty('1')
    setPickNotes('')
  }

  async function confirmSelection(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setPickBusy(true)
    try {
      await addItem({
        name: selected.name,
        qty: Math.max(1, parseInt(pickQty, 10) || 1),
        notes: composeNotes(selected.category, pickNotes),
      })
      cancelSelection()
    } finally {
      setPickBusy(false)
    }
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addItem({
        name: name.trim(),
        qty: Math.max(1, parseInt(qty, 10) || 1),
        notes: notes.trim() || undefined,
      })
      setName('')
      setQty('1')
      setNotes('')
      setCustomOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Inventory"
      icon="📦"
      action={
        <Button
          variant={pickerOpen ? 'ghost' : 'primary'}
          onClick={() => setPickerOpen((o) => !o)}
        >
          {pickerOpen ? 'Close' : 'Add item'}
        </Button>
      }
    >
      <p className="mb-4 text-xs text-slate-400">
        A personal manifest of components, cargo, and gear you want to keep track of.
      </p>

      {pickerOpen && (
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          {/* Category picker — UEX lists items per category. */}
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
                placeholder="Helmet, medpen, FS-9, Behring…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {selectedCat && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
              {loading && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  Loading items…
                </p>
              )}

              {!loading && loadError && (
                <p className="px-3 py-4 text-sm text-amber-300">{loadError}</p>
              )}

              {!loading && !loadError && catalog && filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  {query ? `No items match “${query}”.` : 'No items in this category.'}
                </p>
              )}

              {!loading && !loadError && visible.length > 0 && (
                <ul className="divide-y divide-slate-800/70">
                  {visible.map((item) => {
                    const key = String(item.id ?? item.name)
                    const meta = describeItem(item)
                    const isSelected =
                      selected !== null && String(selected.id ?? selected.name) === key
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{item.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {[item.manufacturer, meta].filter(Boolean).join(' · ') ||
                              'Unspecified'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          className="shrink-0"
                          disabled={pickBusy}
                          onClick={() => selectItem(item)}
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

          {selectedCat && !loading && !loadError && catalog && filtered.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">
              Showing {visible.length} of {filtered.length}
              {filtered.length !== catalog.length ? ` (filtered from ${catalog.length})` : ''}
              .
            </p>
          )}

          {selected && (
            <form
              onSubmit={confirmSelection}
              className="mt-3 grid gap-3 rounded-lg border border-purple-900/50 bg-purple-950/20 p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <div className="min-w-0 sm:col-span-3">
                <p className="text-xs uppercase tracking-wider text-purple-300">
                  Adding
                </p>
                <p className="truncate font-medium text-slate-100">{selected.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {[selected.manufacturer, describeItem(selected)]
                    .filter(Boolean)
                    .join(' · ') || 'Unspecified'}
                </p>
              </div>
              <Field
                label="Quantity"
                type="number"
                min={1}
                value={pickQty}
                onChange={(e) => setPickQty(e.target.value)}
              />
              <Field
                label="Notes (optional)"
                placeholder="Stored at Port Olisar"
                value={pickNotes}
                onChange={(e) => setPickNotes(e.target.value)}
              />
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={pickBusy}>
                  {pickBusy ? 'Adding…' : 'Add to manifest'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pickBusy}
                  onClick={cancelSelection}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Item data from UEX Corp (uexcorp.space) — community-run, not affiliated with
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
                label="Item name"
                placeholder="Quantum drive"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Field
                label="Quantity"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Field
                label="Notes (optional)"
                placeholder="Stored at Port Olisar"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex items-end">
                <Button type="submit" disabled={busy || !name.trim()} className="w-full">
                  {busy ? 'Adding…' : 'Add custom item'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {inventory.length === 0 && (
          <EmptyState>Your manifest is empty. Use “Add item” to search the catalog.</EmptyState>
        )}
        {inventory.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
          >
            <div>
              <p className="font-medium text-slate-100">
                {item.name}{' '}
                <span className="text-xs font-normal text-purple-300">×{item.qty}</span>
              </p>
              {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
            </div>
            <Button variant="danger" onClick={() => removeItem(item.id)} className="shrink-0">
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
