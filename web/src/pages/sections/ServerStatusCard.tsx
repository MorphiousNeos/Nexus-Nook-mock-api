import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState } from '../../components/ui'
import type { ServerStatus, ServerStatusLevel } from '../../services/store'

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
  const { getServerStatus } = useSession()
  const [servers, setServers] = useState<ServerStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setServers(await getServerStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load server status.')
    } finally {
      setLoading(false)
    }
  }, [getServerStatus])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Card title="Server Status" icon="📡">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">Regional shard health and population.</p>
        <Button variant="ghost" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && <EmptyState>{error}</EmptyState>}

      {!error && (
        <ul className="space-y-2">
          {servers.map((s) => (
            <li
              key={s.region}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Badge tone={TONE[s.status]}>{LABEL[s.status]}</Badge>
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
