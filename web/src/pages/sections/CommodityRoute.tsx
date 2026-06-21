import { EmptyState } from '../../components/ui'
import type { TerminalPrice } from '../../services/uex'

function fmtPrice(value?: number): string {
  if (value === undefined) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** Lowest strictly-positive buy price across terminals. */
function bestBuy(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  for (const r of rows) {
    if (r.priceBuy === undefined || r.priceBuy <= 0) continue
    if (best === undefined || r.priceBuy < (best.priceBuy ?? Infinity)) best = r
  }
  return best
}

/** Highest sell price across terminals. */
function bestSell(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  for (const r of rows) {
    if (r.priceSell === undefined || r.priceSell <= 0) continue
    if (best === undefined || r.priceSell > (best.priceSell ?? -Infinity)) best = r
  }
  return best
}

function where(t: TerminalPrice): string {
  return t.system ? `${t.terminalName} · ${t.system}` : t.terminalName
}

export default function CommodityRoute({
  loading,
  error,
  rows,
}: {
  loading: boolean
  error: string | null
  rows: TerminalPrice[] | undefined
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-purple-400" />
        Loading best route…
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

  const buy = bestBuy(rows)
  const sell = bestSell(rows)
  const profit =
    buy?.priceBuy !== undefined && sell?.priceSell !== undefined
      ? sell.priceSell - buy.priceBuy
      : undefined

  const bySell = rows
    .slice()
    .sort((a, b) => (b.priceSell ?? -Infinity) - (a.priceSell ?? -Infinity))

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Best buy
          </p>
          {buy ? (
            <>
              <p className="mt-1 text-sm text-slate-100">{where(buy)}</p>
              <p className="text-sm tabular-nums text-sky-300">
                {fmtPrice(buy.priceBuy)} aUEC
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No buy location</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Best sell
          </p>
          {sell ? (
            <>
              <p className="mt-1 text-sm text-slate-100">{where(sell)}</p>
              <p className="text-sm tabular-nums text-purple-300">
                {fmtPrice(sell.priceSell)} aUEC
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No sell location</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Profit / unit
          </p>
          <p
            className={`mt-1 text-sm tabular-nums ${
              profit === undefined
                ? 'text-slate-500'
                : profit > 0
                  ? 'text-emerald-300'
                  : 'text-red-300'
            }`}
          >
            {profit === undefined ? '—' : `${fmtPrice(profit)} aUEC`}
          </p>
        </div>
      </div>

      {buy && sell && (
        <p className="text-xs text-slate-400">
          Buy at <span className="text-sky-300">{where(buy)}</span> (
          {fmtPrice(buy.priceBuy)}) → sell at{' '}
          <span className="text-purple-300">{where(sell)}</span> (
          {fmtPrice(sell.priceSell)}).
        </p>
      )}

      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-900/95 text-left uppercase tracking-wider text-slate-500 backdrop-blur">
            <tr>
              <th className="px-3 py-1.5 font-medium">Terminal</th>
              <th className="px-3 py-1.5 font-medium">System</th>
              <th className="px-3 py-1.5 text-right font-medium">Buy</th>
              <th className="px-3 py-1.5 text-right font-medium">Sell</th>
            </tr>
          </thead>
          <tbody>
            {bySell.map((t, i) => (
              <tr key={`${t.terminalName}:${i}`} className="border-t border-slate-800/70">
                <td className="px-3 py-1.5 text-slate-200">{t.terminalName}</td>
                <td className="px-3 py-1.5 text-slate-400">{t.system ?? '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                  {fmtPrice(t.priceBuy)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                  {fmtPrice(t.priceSell)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
