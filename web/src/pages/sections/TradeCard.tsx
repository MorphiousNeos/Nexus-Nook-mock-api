import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, EmptyState, Field } from '../../components/ui'
import {
  getCommodities,
  getCommodityPrices,
  UexError,
  type Commodity,
  type TerminalPrice,
} from '../../services/uex'
import CommodityRoute from './CommodityRoute'

const ATTRIBUTION =
  'Trade data courtesy of UEX Corp (uexcorp.space) — community-run, not affiliated with CIG or Nexus Nook.'

const MAX_ROWS = 100

type SortKey = 'margin' | 'name'

function fmtPrice(value?: number): string {
  if (value === undefined) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function margin(c: Commodity): number | undefined {
  if (c.priceBuy === undefined || c.priceSell === undefined) return undefined
  return c.priceSell - c.priceBuy
}

function Attribution() {
  return <p className="mt-4 text-[11px] leading-snug text-slate-600">{ATTRIBUTION}</p>
}

export default function TradeCard() {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('margin')

  // Per-commodity "best route" detail, fetched on demand and cached by id.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [priceCache, setPriceCache] = useState<Record<string, TerminalPrice[]>>({})
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  const selectCommodity = useCallback(
    async (c: Commodity) => {
      if (c.id === undefined || c.id === null) return
      const key = String(c.id)

      // Toggle off if already selected.
      if (selectedId === key) {
        setSelectedId(null)
        return
      }

      setSelectedId(key)
      setRouteError(null)

      // Cached — no refetch.
      if (priceCache[key]) {
        setRouteLoading(false)
        return
      }

      setRouteLoading(true)
      try {
        const prices = await getCommodityPrices(c.id)
        setPriceCache((prev) => ({ ...prev, [key]: prices }))
      } catch (err) {
        const msg =
          err instanceof UexError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Something went wrong loading this route.'
        setRouteError(msg)
      } finally {
        setRouteLoading(false)
      }
    },
    [selectedId, priceCache],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCommodities(await getCommodities())
    } catch (err) {
      const msg =
        err instanceof UexError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong loading trade data.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSorted = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const rows = q
      ? commodities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.code?.toLowerCase().includes(q) ?? false),
        )
      : commodities.slice()

    rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      // margin desc; undefined margins sink to the bottom
      const ma = margin(a)
      const mb = margin(b)
      if (ma === undefined && mb === undefined) return a.name.localeCompare(b.name)
      if (ma === undefined) return 1
      if (mb === undefined) return -1
      return mb - ma
    })
    return rows
  }, [commodities, filter, sort])

  const visible = filteredSorted.slice(0, MAX_ROWS)

  return (
    <Card title="Trade" icon="💱">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Live Star Citizen commodity prices — no login needed.
        </p>
        <Button variant="ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="space-y-3">
          <EmptyState>{error}</EmptyState>
          <div className="flex items-center justify-center">
            <Button onClick={load} disabled={loading}>
              {loading ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </div>
      )}

      {!error && loading && commodities.length === 0 && (
        <EmptyState>Loading commodities…</EmptyState>
      )}

      {!error && (!loading || commodities.length > 0) && (
        <>
          <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field
              label="Filter"
              placeholder="Search by name or code"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="margin">Margin (high → low)</option>
                <option value="name">Name (A → Z)</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <EmptyState>
              {commodities.length === 0
                ? 'No commodities returned by UEX.'
                : 'No commodities match your filter.'}
            </EmptyState>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 text-left text-xs uppercase tracking-wider text-slate-400 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 text-right font-medium">Buy</th>
                    <th className="px-3 py-2 text-right font-medium">Sell</th>
                    <th className="px-3 py-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c, i) => {
                    const m = margin(c)
                    const expandable = c.id !== undefined && c.id !== null
                    const key = expandable ? String(c.id) : undefined
                    const isSelected = key !== undefined && key === selectedId
                    return (
                      <React.Fragment key={(c.id ?? c.code ?? c.name) + ':' + i}>
                        <tr
                          className={`border-t border-slate-800/70 ${
                            expandable
                              ? 'cursor-pointer hover:bg-slate-800/40 focus:bg-slate-800/40 focus:outline-none'
                              : ''
                          } ${isSelected ? 'bg-slate-800/50' : ''}`}
                          {...(expandable
                            ? {
                                role: 'button',
                                tabIndex: 0,
                                'aria-expanded': isSelected,
                                onClick: () => void selectCommodity(c),
                                onKeyDown: (e: React.KeyboardEvent) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    void selectCommodity(c)
                                  }
                                },
                              }
                            : {})}
                        >
                          <td className="px-3 py-2 text-slate-100">
                            {expandable && (
                              <span className="mr-1 inline-block text-xs text-slate-500">
                                {isSelected ? '▾' : '▸'}
                              </span>
                            )}
                            {c.name}
                            {c.code && (
                              <span className="ml-1 text-xs text-slate-500">{c.code}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                            {fmtPrice(c.priceBuy)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                            {fmtPrice(c.priceSell)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums ${
                              m === undefined
                                ? 'text-slate-500'
                                : m >= 0
                                  ? 'text-emerald-300'
                                  : 'text-red-300'
                            }`}
                          >
                            {m === undefined ? '—' : fmtPrice(m)}
                          </td>
                        </tr>
                        {isSelected && (
                          <tr className="border-t border-slate-800/70 bg-slate-950/30">
                            <td colSpan={4} className="p-0">
                              <CommodityRoute
                                loading={routeLoading}
                                error={routeError}
                                rows={key !== undefined ? priceCache[key] : undefined}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredSorted.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Showing {visible.length} of {filteredSorted.length}
              {filter.trim() ? ' matching' : ''} commodit
              {filteredSorted.length === 1 ? 'y' : 'ies'}
              {filteredSorted.length > MAX_ROWS && ` (capped at ${MAX_ROWS})`}.
            </p>
          )}
        </>
      )}

      <Attribution />
    </Card>
  )
}
