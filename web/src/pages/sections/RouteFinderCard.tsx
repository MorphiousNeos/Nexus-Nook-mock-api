import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Badge, Button, Card, EmptyState, Field } from '../../components/ui'
import {
  getCommodities,
  getCommodityPrices,
  UexError,
  type Commodity,
  type TerminalPrice,
} from '../../services/uex'

const ATTRIBUTION =
  'Trade data from UEX Corp (uexcorp.space) — community-run, not affiliated with CIG.'

/** How many top-spread commodities to fetch per-terminal prices for. */
const CANDIDATE_COUNT = 8
/** Max concurrent per-commodity price requests — be polite to the community API. */
const CONCURRENCY = 4
/** How many routes to render. */
const MAX_RESULTS = 10

type RouteResult = {
  key: string
  name: string
  code?: string
  buyTerminal: string
  buySystem?: string
  buyPrice: number
  sellTerminal: string
  sellSystem?: string
  sellPrice: number
  units: number
  investment: number
  grossProfit: number
  roi: number
}

type Progress = { scanning: string; done: number; total: number }

function fmtAuec(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** Galaxy-average spread used to pick candidates; undefined when unusable. */
function avgSpread(c: Commodity): number | undefined {
  if (c.priceBuy === undefined || c.priceSell === undefined) return undefined
  if (c.priceBuy <= 0 || c.priceSell <= 0) return undefined
  return c.priceSell - c.priceBuy
}

/** Terminal with the lowest strictly-positive buy price. */
function lowestBuy(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  for (const r of rows) {
    if (r.priceBuy === undefined || r.priceBuy <= 0) continue
    if (best === undefined || r.priceBuy < (best.priceBuy ?? Infinity)) best = r
  }
  return best
}

/** Terminal with the highest strictly-positive sell price. */
function highestSell(rows: TerminalPrice[]): TerminalPrice | undefined {
  let best: TerminalPrice | undefined
  for (const r of rows) {
    if (r.priceSell === undefined || r.priceSell <= 0) continue
    if (best === undefined || r.priceSell > (best.priceSell ?? -Infinity)) best = r
  }
  return best
}

/** Turn one commodity's terminal prices into a route, or null if not viable. */
function buildRoute(
  c: Commodity,
  rows: TerminalPrice[],
  cargoScu: number,
  budget: number,
): RouteResult | null {
  const buy = lowestBuy(rows)
  const sell = highestSell(rows)
  if (!buy || !sell) return null

  const buyPrice = buy.priceBuy
  const sellPrice = sell.priceSell
  if (buyPrice === undefined || sellPrice === undefined) return null
  if (sellPrice <= buyPrice) return null

  // UEX prices are per SCU, so 1 unit = 1 SCU.
  const unitsAffordable = Math.floor(budget / buyPrice)
  const units = Math.min(Math.floor(cargoScu), unitsAffordable)
  if (units <= 0) return null

  const investment = units * buyPrice
  const grossProfit = units * (sellPrice - buyPrice)

  return {
    key: String(c.id ?? c.code ?? c.name),
    name: c.name,
    code: c.code,
    buyTerminal: buy.terminalName,
    buySystem: buy.system,
    buyPrice,
    sellTerminal: sell.terminalName,
    sellSystem: sell.system,
    sellPrice,
    units,
    investment,
    grossProfit,
    roi: investment > 0 ? (grossProfit / investment) * 100 : 0,
  }
}

function locationLine(terminal: string, system?: string): string {
  return system ? `${terminal} · ${system}` : terminal
}

function RouteRow({ route, rank }: { route: RouteResult; rank: number }) {
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-700/70 bg-slate-800/60 text-xs tabular-nums text-slate-300">
            {rank}
          </span>
          <p className="truncate font-medium text-slate-100">
            {route.name}
            {route.code && (
              <span className="ml-1.5 text-xs text-slate-500">{route.code}</span>
            )}
          </p>
        </div>
        <Badge tone="green">+{fmtAuec(route.grossProfit)} aUEC</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-slate-800/70 bg-slate-900/40 px-2.5 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Buy
          </p>
          <p className="truncate text-sm text-slate-200">
            {locationLine(route.buyTerminal, route.buySystem)}
          </p>
          <p className="text-sm tabular-nums text-sky-300">
            {fmtAuec(route.buyPrice)} aUEC/SCU
          </p>
        </div>
        <div className="rounded-md border border-slate-800/70 bg-slate-900/40 px-2.5 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Sell
          </p>
          <p className="truncate text-sm text-slate-200">
            {locationLine(route.sellTerminal, route.sellSystem)}
          </p>
          <p className="text-sm tabular-nums text-purple-300">
            {fmtAuec(route.sellPrice)} aUEC/SCU
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Haul <span className="tabular-nums text-slate-200">{route.units} SCU</span>
        </span>
        <span>
          Invest{' '}
          <span className="tabular-nums text-slate-200">
            {fmtAuec(route.investment)} aUEC
          </span>
        </span>
        <span>
          Profit{' '}
          <span className="tabular-nums text-emerald-300">
            {fmtAuec(route.grossProfit)} aUEC
          </span>
        </span>
        <span>
          ROI{' '}
          <span className="tabular-nums text-slate-200">{route.roi.toFixed(1)}%</span>
        </span>
      </div>
    </li>
  )
}

export default function RouteFinderCard() {
  const [cargoInput, setCargoInput] = useState('66')
  const [budgetInput, setBudgetInput] = useState('50000')
  const [validation, setValidation] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  // null = never searched; [] = searched, nothing viable.
  const [results, setResults] = useState<RouteResult[] | null>(null)

  // Bumped on every submit so a stale in-flight run can't clobber state.
  const runIdRef = useRef(0)

  const findRoutes = useCallback(async (e: FormEvent) => {
    e.preventDefault()

    const cargoScu = Number(cargoInput)
    const budget = Number(budgetInput)
    if (!Number.isFinite(cargoScu) || cargoScu <= 0) {
      setValidation('Cargo capacity must be a number greater than 0.')
      return
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      setValidation('Budget must be a number greater than 0.')
      return
    }
    setValidation(null)

    const runId = ++runIdRef.current
    const live = () => runIdRef.current === runId

    setLoading(true)
    setError(null)
    setResults(null)
    setProgress(null)

    try {
      const commodities = await getCommodities()
      if (!live()) return

      // Rank by galaxy-average spread and keep the most promising few.
      const candidates = commodities
        .filter((c) => c.id !== undefined && c.id !== null)
        .map((c) => ({ commodity: c, spread: avgSpread(c) }))
        .filter((x): x is { commodity: Commodity; spread: number } =>
          x.spread !== undefined && x.spread > 0,
        )
        .sort((a, b) => b.spread - a.spread)
        .slice(0, CANDIDATE_COUNT)
        .map((x) => x.commodity)

      if (candidates.length === 0) {
        if (live()) {
          setResults([])
          setProgress(null)
        }
        return
      }

      // Fetch per-terminal prices with a small worker pool (cap concurrency).
      const routes: RouteResult[] = []
      let started = 0
      let done = 0
      const total = candidates.length

      const worker = async () => {
        while (live()) {
          const index = started
          if (index >= total) return
          started += 1
          const commodity = candidates[index]
          setProgress({ scanning: commodity.name, done, total })
          try {
            const rows = await getCommodityPrices(commodity.id!)
            const route = buildRoute(commodity, rows, cargoScu, budget)
            if (route) routes.push(route)
          } catch {
            // A single commodity failing shouldn't sink the scan — skip it.
          }
          done += 1
          if (live()) setProgress({ scanning: commodity.name, done, total })
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()),
      )
      if (!live()) return

      routes.sort((a, b) => b.grossProfit - a.grossProfit)
      setResults(routes.slice(0, MAX_RESULTS))
    } catch (err) {
      if (!live()) return
      const msg =
        err instanceof UexError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong finding routes.'
      setError(msg)
    } finally {
      if (live()) {
        setLoading(false)
        setProgress(null)
      }
    }
  }, [cargoInput, budgetInput])

  return (
    <Card title="Route Finder" icon="🧭">
      <p className="mb-4 text-xs text-slate-400">
        Tell us your hold size and wallet — we scan the top-spread commodities for the
        best buy-low / sell-high runs.
      </p>

      <form onSubmit={findRoutes} className="mb-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field
          label="Cargo capacity (SCU)"
          type="number"
          min={1}
          inputMode="numeric"
          value={cargoInput}
          onChange={(e) => setCargoInput(e.target.value)}
        />
        <Field
          label="Budget (aUEC)"
          type="number"
          min={1}
          inputMode="numeric"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Scanning…' : 'Find routes'}
        </Button>
      </form>

      {validation && <p className="mb-3 text-xs text-red-300">{validation}</p>}

      {loading && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-purple-400" />
          {progress
            ? `Scanning ${progress.scanning}… ${progress.done}/${progress.total}`
            : 'Loading commodity list…'}
        </div>
      )}

      {!loading && error && (
        <div className="mb-3">
          <EmptyState>{error}</EmptyState>
        </div>
      )}

      {!loading && !error && results !== null && results.length === 0 && (
        <div className="mb-3">
          <EmptyState>
            No profitable routes found for that cargo and budget — try raising the
            budget or refreshing later.
          </EmptyState>
        </div>
      )}

      {!loading && !error && results !== null && results.length > 0 && (
        <ol className="space-y-2">
          {results.map((route, i) => (
            <RouteRow key={route.key} route={route} rank={i + 1} />
          ))}
        </ol>
      )}

      <p className="mt-4 text-[11px] leading-snug text-slate-600">
        {ATTRIBUTION} Prices are player-reported and can lag the live game — verify in
        the 'verse before committing your aUEC.
      </p>
    </Card>
  )
}
