import { useId, useMemo, useState, type ReactNode } from 'react'
import { Badge, EmptyState } from '../../components/ui'
import type { TerminalPrice } from '../../services/uex'

const ALL_SYSTEMS = '__all__'
const NO_SYSTEM = '__none__'

type SortMode = 'sell' | 'buy'

function fmtPrice(value?: number): string {
  if (value === undefined) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** UEX reports 0 (or a missing field) for "not traded here", never a free trade. */
function sellPrice(t: TerminalPrice): number | undefined {
  return t.priceSell !== undefined && t.priceSell > 0 ? t.priceSell : undefined
}

function buyPrice(t: TerminalPrice): number | undefined {
  return t.priceBuy !== undefined && t.priceBuy > 0 ? t.priceBuy : undefined
}

function systemKey(t: TerminalPrice): string {
  const s = t.system?.trim()
  return s ? s : NO_SYSTEM
}

function systemLabel(key: string): string {
  return key === NO_SYSTEM ? 'Unlisted' : key
}

function where(t: TerminalPrice): string {
  const s = t.system?.trim()
  return s ? `${t.terminalName} · ${s}` : t.terminalName
}

/** Lowest strictly-positive buy price across terminals. */
function bestBuy(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  let bestValue = Infinity
  for (const r of rows) {
    const v = buyPrice(r)
    if (v === undefined) continue
    if (v < bestValue) {
      best = r
      bestValue = v
    }
  }
  return best
}

/** Highest strictly-positive sell price across terminals. */
function bestSell(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  let bestValue = -Infinity
  for (const r of rows) {
    const v = sellPrice(r)
    if (v === undefined) continue
    if (v > bestValue) {
      best = r
      bestValue = v
    }
  }
  return best
}

const CHIP_BASE =
  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition motion-reduce:transition-none focus:outline-none focus:ring-1 focus:ring-brand-500'
const CHIP_ON = 'border-brand-600/70 bg-brand-900/40 text-brand-100'
const CHIP_OFF =
  'border-hull-700 bg-hull-900/60 text-hull-400 hover:border-hull-600 hover:text-hull-200'

const TAB_BASE =
  'rounded-md px-2.5 py-1 text-[11px] font-medium transition motion-reduce:transition-none focus:outline-none focus:ring-1 focus:ring-brand-500'
const TAB_ON = 'bg-brand-600/30 text-brand-100'
const TAB_OFF = 'text-hull-400 hover:text-hull-200'

function Tile({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-hull-800 bg-hull-950/40 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-hull-500">
        {label}
      </p>
      {children}
    </div>
  )
}

export default function CommodityRoute({
  loading,
  error,
  rows,
  commodityName,
}: {
  loading: boolean
  error: string | null
  rows: TerminalPrice[] | undefined
  commodityName?: string
}) {
  const [sort, setSort] = useState<SortMode>('sell')
  const [system, setSystem] = useState<string>(ALL_SYSTEMS)
  const [open, setOpen] = useState(true)
  const tableId = useId()

  const safeRows = useMemo(() => rows ?? [], [rows])

  const systems = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of safeRows) {
      const key = systemKey(r)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts, ([key, count]) => ({ key, count })).sort((a, b) => {
      if (a.key === NO_SYSTEM) return 1
      if (b.key === NO_SYSTEM) return -1
      return systemLabel(a.key).localeCompare(systemLabel(b.key))
    })
  }, [safeRows])

  // A stale filter (commodity changed under us) falls back to showing everything.
  const activeSystem = systems.some((s) => s.key === system) ? system : ALL_SYSTEMS

  const filtered = useMemo(
    () =>
      activeSystem === ALL_SYSTEMS
        ? safeRows
        : safeRows.filter((r) => systemKey(r) === activeSystem),
    [safeRows, activeSystem],
  )

  const sorted = useMemo(() => {
    const out = filtered.slice()
    out.sort((a, b) => {
      if (sort === 'sell') {
        const av = sellPrice(a)
        const bv = sellPrice(b)
        if (av === undefined && bv === undefined)
          return a.terminalName.localeCompare(b.terminalName)
        if (av === undefined) return 1
        if (bv === undefined) return -1
        if (av !== bv) return bv - av
        return a.terminalName.localeCompare(b.terminalName)
      }
      const av = buyPrice(a)
      const bv = buyPrice(b)
      if (av === undefined && bv === undefined)
        return a.terminalName.localeCompare(b.terminalName)
      if (av === undefined) return 1
      if (bv === undefined) return -1
      if (av !== bv) return av - bv
      return a.terminalName.localeCompare(b.terminalName)
    })
    return out
  }, [filtered, sort])

  const buy = bestBuy(filtered)
  const sell = bestSell(filtered)
  const profit =
    buy !== undefined && sell !== undefined
      ? (sellPrice(sell) ?? 0) - (buyPrice(buy) ?? 0)
      : undefined

  const sellCount = filtered.filter((r) => sellPrice(r) !== undefined).length
  const buyCount = filtered.filter((r) => buyPrice(r) !== undefined).length

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-hull-400">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-hull-600 border-t-purple-400 motion-reduce:animate-none" />
        Loading terminal prices…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-3 py-3">
        <EmptyState>{error}</EmptyState>
      </div>
    )
  }

  if (!rows) return null

  if (rows.length === 0) {
    return (
      <div className="px-3 py-3">
        <EmptyState>No terminal prices reported for this commodity.</EmptyState>
      </div>
    )
  }

  const scopeNote =
    activeSystem === ALL_SYSTEMS ? 'all systems' : systemLabel(activeSystem)
  const top = sorted.length > 0 ? sorted[0] : undefined
  const highlightFirst =
    top !== undefined &&
    (sort === 'sell' ? sellPrice(top) : buyPrice(top)) !== undefined

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Best sell">
          {sell ? (
            <>
              <p className="mt-1 text-sm text-hull-100">{where(sell)}</p>
              <p className="text-sm tabular-nums text-brand-300">
                {fmtPrice(sellPrice(sell))} aUEC
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-hull-500">Nobody buying in {scopeNote}</p>
          )}
        </Tile>

        <Tile label="Best buy">
          {buy ? (
            <>
              <p className="mt-1 text-sm text-hull-100">{where(buy)}</p>
              <p className="text-sm tabular-nums text-sky-300">
                {fmtPrice(buyPrice(buy))} aUEC
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-hull-500">Nobody selling in {scopeNote}</p>
          )}
        </Tile>

        <Tile label="Profit / unit">
          <p
            className={`mt-1 text-sm tabular-nums ${
              profit === undefined
                ? 'text-hull-500'
                : profit > 0
                  ? 'text-positive-300'
                  : 'text-danger-300'
            }`}
          >
            {profit === undefined ? '—' : `${fmtPrice(profit)} aUEC`}
          </p>
        </Tile>
      </div>

      {sell && (
        <p className="text-xs text-hull-400">
          Offload{commodityName ? ` ${commodityName}` : ''} at{' '}
          <span className="text-brand-300">{where(sell)}</span> for{' '}
          {fmtPrice(sellPrice(sell))} aUEC/unit
          {buy && (
            <>
              {' '}
              · restock at <span className="text-sky-300">{where(buy)}</span> (
              {fmtPrice(buyPrice(buy))})
            </>
          )}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-lg border border-hull-700 bg-hull-950/60 p-0.5"
          role="group"
          aria-label="Sort terminals"
        >
          <button
            type="button"
            onClick={() => setSort('sell')}
            aria-pressed={sort === 'sell'}
            className={`${TAB_BASE} ${sort === 'sell' ? TAB_ON : TAB_OFF}`}
          >
            Best to sell
          </button>
          <button
            type="button"
            onClick={() => setSort('buy')}
            aria-pressed={sort === 'buy'}
            className={`${TAB_BASE} ${sort === 'buy' ? TAB_ON : TAB_OFF}`}
          >
            Best to buy
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={tableId}
          className="rounded-lg border border-hull-700 bg-hull-900/60 px-2.5 py-1 text-[11px] font-medium text-hull-300 transition hover:border-hull-600 hover:text-hull-100 motion-reduce:transition-none focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <span aria-hidden className="mr-1 text-hull-500">
            {open ? '▾' : '▸'}
          </span>
          {open ? 'Hide' : 'Show'} all {sorted.length} terminal
          {sorted.length === 1 ? '' : 's'}
        </button>

        <span className="text-[11px] text-hull-500">
          {sellCount} sell point{sellCount === 1 ? '' : 's'} · {buyCount} buy point
          {buyCount === 1 ? '' : 's'}
        </span>
      </div>

      {systems.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by system">
          <button
            type="button"
            onClick={() => setSystem(ALL_SYSTEMS)}
            aria-pressed={activeSystem === ALL_SYSTEMS}
            className={`${CHIP_BASE} ${activeSystem === ALL_SYSTEMS ? CHIP_ON : CHIP_OFF}`}
          >
            All systems ({safeRows.length})
          </button>
          {systems.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSystem(s.key)}
              aria-pressed={activeSystem === s.key}
              className={`${CHIP_BASE} ${activeSystem === s.key ? CHIP_ON : CHIP_OFF}`}
            >
              {systemLabel(s.key)} ({s.count})
            </button>
          ))}
        </div>
      )}

      {open && (
        <div id={tableId}>
          {sorted.length === 0 ? (
            <EmptyState>No terminals listed in {scopeNote}.</EmptyState>
          ) : (
            <>
              <div className="hidden max-h-64 overflow-auto rounded-lg border border-hull-800 sm:block">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-hull-900/95 text-left uppercase tracking-wider text-hull-500 backdrop-blur">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Terminal</th>
                      <th className="px-3 py-1.5 font-medium">System / location</th>
                      <th className="px-3 py-1.5 text-right font-medium">Buy</th>
                      <th className="px-3 py-1.5 text-right font-medium">Sell</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t, i) => {
                      const isBest = highlightFirst && i === 0
                      const sv = sellPrice(t)
                      const bv = buyPrice(t)
                      return (
                        <tr
                          key={`${t.terminalName}:${t.system ?? ''}:${i}`}
                          className={`border-t border-hull-800/70 ${
                            isBest ? 'bg-brand-950/25' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 text-hull-200">
                            <span className="mr-1.5 align-middle">{t.terminalName}</span>
                            {isBest && (
                              <Badge tone="purple">
                                {sort === 'sell' ? 'Best sell' : 'Best buy'}
                              </Badge>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-hull-400">
                            {t.system?.trim() ? t.system : '—'}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                              bv === undefined ? 'text-hull-600' : 'text-sky-300/90'
                            }`}
                          >
                            {fmtPrice(bv)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                              sv === undefined ? 'text-hull-600' : 'text-brand-200'
                            }`}
                          >
                            {fmtPrice(sv)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="max-h-72 space-y-2 overflow-y-auto sm:hidden">
                {sorted.map((t, i) => {
                  const isBest = highlightFirst && i === 0
                  const sv = sellPrice(t)
                  const bv = buyPrice(t)
                  return (
                    <li
                      key={`${t.terminalName}:${t.system ?? ''}:${i}`}
                      className={`rounded-lg border p-2.5 ${
                        isBest
                          ? 'border-brand-700/60 bg-brand-950/25'
                          : 'border-hull-800 bg-hull-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-hull-100">
                          {t.terminalName}
                        </p>
                        {isBest && (
                          <Badge tone="purple">
                            {sort === 'sell' ? 'Best sell' : 'Best buy'}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-hull-500">
                        {t.system?.trim() ? t.system : 'Location unlisted'}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-hull-900/60 px-2 py-1">
                          <p className="text-[10px] uppercase tracking-wider text-hull-500">
                            Buy
                          </p>
                          <p
                            className={`text-xs tabular-nums ${
                              bv === undefined ? 'text-hull-600' : 'text-sky-300/90'
                            }`}
                          >
                            {fmtPrice(bv)}
                          </p>
                        </div>
                        <div className="rounded-md bg-hull-900/60 px-2 py-1">
                          <p className="text-[10px] uppercase tracking-wider text-hull-500">
                            Sell
                          </p>
                          <p
                            className={`text-xs tabular-nums ${
                              sv === undefined ? 'text-hull-600' : 'text-brand-200'
                            }`}
                          >
                            {fmtPrice(sv)}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
