import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../../SessionContext'
import PageContainer from '../../components/PageContainer'
import {
  AlertModule,
  HeroModule,
  SummaryModule,
  type SummaryStat,
} from '../../components/modules'
import MiningOpsCard from '../sections/MiningOpsCard'
import {
  communityAvailable,
  listSharedOps,
  type SharedOpsSummary,
} from '../../services/community'
import { miningAlerts, opsBoard } from '../../services/miningInsights'

/**
 * Mining & salvage ops.
 *
 * The list request lives here rather than in the card so the briefing and the
 * board are the same fetch — two requests could disagree with each other on
 * screen at the same moment.
 *
 * Every personal figure is scoped to ops this player owns. The ops endpoint
 * returns the whole community board, so an unscoped count would describe
 * everyone's activity while looking like a report on yours.
 */
export default function MiningPage() {
  const { state } = useSession()
  const me = state?.profile?.displayName ?? ''

  const [sessions, setSessions] = useState<SharedOpsSummary[]>([])
  const [loading, setLoading] = useState(communityAvailable)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSessions(await listSharedOps())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!communityAvailable) {
      setLoading(false)
      return
    }
    void refresh()
  }, [refresh])

  const board = useMemo(() => opsBoard(sessions, me), [sessions, me])
  const alerts = useMemo(() => miningAlerts(sessions, me), [sessions, me])

  const stats: SummaryStat[] = [
    {
      label: 'Your open ops',
      value: String(board.yoursOpen.length),
      note: board.yoursClosedCount
        ? `${board.yoursClosedCount} closed`
        : board.yoursOpen.length
          ? 'Running now'
          : 'None running',
      tone: board.yoursOpen.length > 0 ? 'positive' : 'default',
    },
    {
      label: 'On the board',
      value: String(board.boardOpenCount),
      note: board.boardTotal
        ? `${board.boardTotal} total, all players`
        : 'Board is empty',
    },
    {
      label: 'Logged on yours',
      value: board.loggedOnYours !== 0
        ? Math.round(board.loggedOnYours).toLocaleString()
        : '—',
      note: board.yoursOpen.length ? 'Op totals, not your cut' : 'Nothing logged',
    },
    {
      label: 'Crew on yours',
      value: board.yoursOpen.length ? String(board.crewOnYours) : '—',
      note: board.yoursOpen.length ? 'Across your open ops' : 'No ops running',
    },
  ]

  const headline = !communityAvailable
    ? 'Shared ops need an account'
    : error
      ? 'Ops board unavailable'
      : loading && sessions.length === 0
        ? 'Loading the ops board…'
        : board.yoursOpen.length > 0
          ? `${board.yoursOpen.length} of your ops ${board.yoursOpen.length === 1 ? 'is' : 'are'} running`
          : board.boardOpenCount > 0
            ? `${board.boardOpenCount} ${board.boardOpenCount === 1 ? 'op' : 'ops'} open on the board`
            : board.boardTotal > 0
              ? 'Nothing running'
              : 'No ops on the board'

  const lede = !communityAvailable
    ? 'Ops are shared with other players, so they live on the server rather than in this browser. Sign in with a real account to start or join one.'
    : error
      ? 'The board could not be reached. Your ops are safe on the server — try again in a moment.'
      : board.yoursOpen.length > 0
        ? 'Open one to log the take, set crew shares, and copy a payout summary.'
        : board.boardOpenCount > 0
          ? 'These are open crews from across the community. Join one, or start your own.'
          : 'Start an op and your crew can join it from their own devices.'

  return (
    <PageContainer>
      <HeroModule eyebrow="Mining & salvage ops" title={headline} lede={lede}>
        {communityAvailable && !error && <SummaryModule stats={stats} />}
      </HeroModule>

      {alerts.length > 0 && (
        <section className="mb-8 sm:mb-10">
          <h2 className="mb-3 font-mono text-label uppercase text-hull-400">
            Needs attention
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <AlertModule key={a.id} tone={a.tone} title={a.title}>
                {a.detail}
              </AlertModule>
            ))}
            {alerts.length > 5 && (
              <p className="pl-4 text-xs text-hull-400">and {alerts.length - 5} more</p>
            )}
          </div>
        </section>
      )}

      <MiningOpsCard
        me={me}
        sessions={sessions}
        loading={loading}
        error={error}
        onRefresh={refresh}
      />
    </PageContainer>
  )
}
