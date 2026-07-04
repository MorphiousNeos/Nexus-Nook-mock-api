import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui'
import type { PlatformStatus, ServerStatus, ServerStatusLevel } from '../../services/store'

const TONE: Record<ServerStatusLevel, 'green' | 'amber' | 'slate' | 'red'> = {
  online: 'green',
  degraded: 'amber',
  maintenance: 'slate',
  offline: 'red',
}

const LABEL: Record<ServerStatusLevel, string> = {
  online: 'Online',
  degraded: 'Degraded',
  maintenance: 'Maintenance',
  offline: 'Offline',
}

export default function ServerStatusCard() {
  const { getServerStatus, getPlatformStatus, isDemo } = useSession()
  const [servers, setServers] = useState<ServerStatus[]>([])
  const [platform, setPlatform] = useState<PlatformStatus[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [shards, official] = await Promise.all([
        getServerStatus(),
        getPlatformStatus().catch(() => null),
      ])
      setServers(shards)
      setPlatform(official)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load server status.')
    } finally {
      setLoading(false)
    }
  }, [getServerStatus, getPlatformStatus])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Card title="Server Status" icon="📡">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Official platform status and regional shard overview.
        </p>
        <Button variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && <EmptyState icon="⚠️">{error}</EmptyState>}

      {!error && (
        <div className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Official platform status
          </h3>
          {platform && platform.length > 0 ? (
            <>
              <ul className="space-y-2">
                {platform.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-100">{p.name}</span>
                    <Badge tone={TONE[p.status]} dot>
                      {LABEL[p.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                Source:{' '}
                <a
                  href="https://status.robertsspaceindustries.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-300"
                >
                  status.robertsspaceindustries.com
                </a>{' '}
                (CIG's public status page), refreshed every few minutes.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs text-slate-500">
              {isDemo
                ? 'Live platform status is available on the hosted app (it needs the backend proxy).'
                : loading
                  ? 'Checking the official status page…'
                  : 'The official status page could not be reached just now — try Refresh.'}
            </p>
          )}
        </div>
      )}

      {!error && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Regional shards{' '}
          <span className="font-normal normal-case text-slate-600">
            (illustrative — CIG publishes no per-shard numbers)
          </span>
        </h3>
      )}

      {!error && loading && servers.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {!error && (servers.length > 0 || !loading) && (
        <ul className="space-y-2">
          {servers.map((s) => (
            <li
              key={s.region}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 transition hover:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <Badge tone={TONE[s.status]} dot>
                  {LABEL[s.status]}
                </Badge>
                <span className="text-sm font-medium text-slate-100">{s.region}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{s.players.toLocaleString()} players</span>
                <span>{s.latency} ms</span>
              </div>
            </li>
          ))}
          {!loading && servers.length === 0 && (
            <EmptyState>No server data available.</EmptyState>
          )}
        </ul>
      )}
    </Card>
  )
}
