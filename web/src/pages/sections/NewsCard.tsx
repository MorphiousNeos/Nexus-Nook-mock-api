import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui'
import { getCommLinks, ScWikiError, type CommLink } from '../../services/scwiki'

const ATTRIBUTION =
  'Comm-Link data via the Star Citizen Wiki API (CC BY-SA 4.0) — content © Cloud Imperium Games.'

/** Human-friendly relative date ("3 days ago"); falls back to the raw string. */
function relativeDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso

  const diffMs = Date.now() - ts
  const future = diffMs < 0
  const s = Math.round(Math.abs(diffMs) / 1000)

  let value: number
  let unit: string
  if (s < 60) {
    return future ? 'in under a minute' : 'just now'
  } else if (s < 3600) {
    value = Math.round(s / 60)
    unit = 'minute'
  } else if (s < 86400) {
    value = Math.round(s / 3600)
    unit = 'hour'
  } else if (s < 86400 * 30) {
    value = Math.round(s / 86400)
    unit = 'day'
  } else if (s < 86400 * 365) {
    value = Math.round(s / (86400 * 30))
    unit = 'month'
  } else {
    value = Math.round(s / (86400 * 365))
    unit = 'year'
  }
  const label = `${value} ${unit}${value === 1 ? '' : 's'}`
  return future ? `in ${label}` : `${label} ago`
}

function isHttpUrl(url?: string): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

function Attribution() {
  return <p className="mt-4 text-[11px] leading-snug text-slate-600">{ATTRIBUTION}</p>
}

function LoadingList() {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li
          key={i}
          className="flex items-start gap-4 rounded-lg border border-slate-800/70 bg-slate-950/40 p-3"
        >
          <Skeleton className="h-16 w-24 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function NewsCard() {
  const [items, setItems] = useState<CommLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getCommLinks(20))
    } catch (err) {
      const msg =
        err instanceof ScWikiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong loading Comm-Links.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Newest first when dates are available; undated items sink to the bottom
  // in their original order.
  const sorted = useMemo(() => {
    const ts = (c: CommLink): number => {
      if (!c.publishedAt) return Number.NEGATIVE_INFINITY
      const t = Date.parse(c.publishedAt)
      return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
    }
    return items
      .map((item, i) => ({ item, i }))
      .sort((a, b) => ts(b.item) - ts(a.item) || a.i - b.i)
      .map(({ item }) => item)
  }, [items])

  return (
    <Card title="News" icon="📰">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          The latest official Comm-Links from the RSI network.
        </p>
        <Button variant="ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="space-y-3">
          <EmptyState icon="📡">{error}</EmptyState>
          <div className="flex items-center justify-center">
            <Button onClick={load} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      )}

      {!error && loading && items.length === 0 && <LoadingList />}

      {!error && !loading && sorted.length === 0 && (
        <EmptyState icon="📰">
          No Comm-Links right now — the verse is quiet. Try refreshing in a bit.
        </EmptyState>
      )}

      {!error && (!loading || items.length > 0) && sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((item, i) => {
            const when = relativeDate(item.publishedAt)
            return (
              <li
                key={(item.id ?? item.url ?? item.title) + ':' + i}
                className="flex items-start gap-4 rounded-lg border border-slate-800/70 bg-slate-950/40 p-3 transition hover:border-slate-700/80 hover:bg-slate-900/50"
              >
                {isHttpUrl(item.imageUrl) && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-slate-100">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="transition hover:text-purple-300 focus:text-purple-300 focus:outline-none"
                      >
                        {item.title}
                        <span aria-hidden className="ml-1 text-xs text-slate-500">
                          ↗
                        </span>
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  {(item.channel || item.series) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.channel && <Badge tone="purple">{item.channel}</Badge>}
                      {item.series && <Badge tone="slate">{item.series}</Badge>}
                    </div>
                  )}
                  {when && <p className="mt-1.5 text-xs text-slate-500">{when}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Attribution />
    </Card>
  )
}
