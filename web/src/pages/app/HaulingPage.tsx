import { useMemo } from 'react'
import { useSession } from '../../SessionContext'
import PageContainer from '../../components/PageContainer'
import {
  AlertModule,
  HeroModule,
  SummaryModule,
  type SummaryStat,
} from '../../components/modules'
import HaulingCard from '../sections/HaulingCard'
import {
  closeableContracts,
  haulingAlerts,
  haulingTotals,
} from '../../services/haulingInsights'

/**
 * Hauling.
 *
 * Ordered by what a hauler arrives asking: what have I committed to move,
 * what needs a decision, where do I fly, and what have I finished.
 *
 * Every figure is derived from the contracts themselves. A contract carries no
 * timestamp, so nothing here is ordered by age — an invented chronology would
 * be worse than its absence.
 */
export default function HaulingPage() {
  const { state } = useSession()
  const contracts = state?.hauling ?? []

  const view = useMemo(() => {
    const t = haulingTotals(contracts)
    const alerts = haulingAlerts(contracts)
    const closeable = closeableContracts(contracts)

    const stats: SummaryStat[] = [
      {
        label: 'Active',
        value: String(t.activeCount),
        note: t.deliveredCount
          ? `${t.deliveredCount} delivered`
          : t.activeCount
            ? 'None delivered yet'
            : 'Nothing logged',
      },
      {
        label: 'Stops remaining',
        value: t.stopsTotal ? String(t.stopsRemaining) : '—',
        note: t.stopsTotal ? `of ${t.stopsTotal} across active runs` : 'No stops logged',
        tone: t.stopsTotal > 0 && t.stopsRemaining === 0 ? 'positive' : 'default',
      },
      {
        label: 'SCU to collect',
        value: t.remainingScu > 0 ? t.remainingScu.toLocaleString() : '—',
        note: t.remainingScu > 0 ? 'Still to pick up' : 'Nothing left to collect',
      },
      {
        label: 'Pending payout',
        value: t.pendingReward > 0 ? Math.round(t.pendingReward).toLocaleString() : '—',
        note: t.pendingReward > 0 ? 'From active contracts' : 'No payouts recorded',
      },
    ]

    return { t, alerts, closeable, stats }
  }, [contracts])

  const { t, alerts, closeable, stats } = view

  const headline = contracts.length === 0
    ? 'No contracts logged'
    : closeable.length > 0
      ? `${closeable.length} ready to close out`
      : t.activeCount === 0
        ? 'Nothing active'
        : t.stopsRemaining > 0
          ? `${t.stopsRemaining} ${t.stopsRemaining === 1 ? 'stop' : 'stops'} remaining`
          : `${t.activeCount} ${t.activeCount === 1 ? 'contract' : 'contracts'} active`

  const lede = contracts.length === 0
    ? 'Take hauling missions in game, log them here, and Nexus Nook stacks every stop into one route.'
    : closeable.length > 0
      ? 'Every stop is done on the contracts below — mark them delivered to clear your board.'
      : t.activeCount === 0
        ? `${t.deliveredCount} delivered. Log a new contract when you pick one up.`
        : t.remainingScu > 0
          ? `${t.remainingScu.toLocaleString()} SCU still to collect across ${t.activeCount === 1 ? 'one contract' : `${t.activeCount} contracts`}.`
          : 'Everything left is a dropoff — the cargo is already in your hold.'

  return (
    <PageContainer>
      <HeroModule eyebrow="Hauling" title={headline} lede={lede}>
        <SummaryModule stats={stats} />
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

      <HaulingCard />
    </PageContainer>
  )
}
