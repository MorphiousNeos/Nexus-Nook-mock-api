import { useMemo } from 'react'
import { useSession } from '../../SessionContext'
import PageContainer from '../../components/PageContainer'
import {
  AlertModule,
  HeroModule,
  SummaryModule,
  type SummaryStat,
} from '../../components/modules'
import { SectionLabel } from '../../components/ui'
import FleetCard from '../sections/FleetCard'
import LoadoutCard from '../sections/LoadoutCard'
import {
  ROLE_LABEL,
  attentionItems,
  readiness,
  roleBreakdown,
  shipsWithoutLoadout,
} from '../../services/fleetInsights'

/**
 * Fleet.
 *
 * Ordered by the questions a player actually arrives with: what is my fleet
 * status, what needs attention, what do I own, what can I do. Inventory comes
 * third rather than first, because a list of hulls is the least decision-
 * shaped thing on the page.
 *
 * Every figure is derived from the stored model. There is no timestamp on a
 * ship record, so "recently modified" is not offered — an invented ordering
 * would be worse than its absence.
 */
export default function FleetPage() {
  const { state } = useSession()
  const fleet = state?.fleet ?? []
  const loadouts = state?.loadouts ?? []

  const view = useMemo(() => {
    const r = readiness(fleet)
    const attention = attentionItems(fleet, loadouts)
    const unconfigured = shipsWithoutLoadout(fleet, loadouts)
    const roles = roleBreakdown(fleet)

    const stats: SummaryStat[] = [
      {
        label: 'Available now',
        value: r.operationalCount ? `${r.ready}/${r.operationalCount}` : '—',
        note: r.ready ? 'Ready to fly' : 'Nothing marked ready',
        tone: r.ready > 0 ? 'positive' : 'default',
      },
      {
        label: 'Needs attention',
        value: String(r.claiming + r.maintenance),
        note:
          r.claiming + r.maintenance === 0
            ? 'All clear'
            : `${r.claiming} claiming · ${r.maintenance} in maintenance`,
        tone: r.claiming > 0 ? 'danger' : r.maintenance > 0 ? 'caution' : 'default',
      },
      {
        label: 'Without a build',
        value: r.operationalCount ? String(unconfigured.length) : '—',
        note: unconfigured.length === 0 ? 'Every hull configured' : 'Loadout not set',
        tone: unconfigured.length > 0 ? 'caution' : 'positive',
      },
      {
        label: 'Planned',
        value: String(r.wishlist),
        note: r.wishlist === 0 ? 'No wishlist hulls' : 'On the wishlist',
      },
    ]

    return { r, attention, roles, stats }
  }, [fleet, loadouts])

  const { r, attention, roles, stats } = view

  const headline = !fleet.length
    ? 'Your hangar is empty'
    : r.ready > 0
      ? `${r.ready} of ${r.operationalCount} ready to fly`
      : `Nothing ready to fly yet`

  const lede = !fleet.length
    ? 'Add the ships you own or want. Mark what you can fly, and Nexus Nook keeps the rest straight.'
    : r.primary
      ? `Primary hull is ${r.primary.name}${r.primary.name !== r.primary.model ? ` — a ${r.primary.model}` : ''}.`
      : 'Set a primary hull to pin the one you fly most to the top of this briefing.'

  return (
    <PageContainer>
      <HeroModule eyebrow="Fleet status" title={headline} lede={lede}>
        <SummaryModule stats={stats} />
      </HeroModule>

      {attention.length > 0 && (
        <section className="mb-8 sm:mb-10">
          <SectionLabel>Needs attention</SectionLabel>
          <div className="space-y-2">
            {attention.slice(0, 5).map((item) => (
              <AlertModule key={item.id} tone={item.tone} title={item.title}>
                {item.detail}
              </AlertModule>
            ))}
            {attention.length > 5 && (
              <p className="pl-4 text-xs text-hull-400">
                and {attention.length - 5} more
              </p>
            )}
          </div>
        </section>
      )}

      {/* Composition only earns its place once there is a shape to see. With
          one or two hulls the answer is already visible in the list below. */}
      {roles.length > 1 && (
        <section className="mb-8 sm:mb-10">
          <SectionLabel>Mission coverage</SectionLabel>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {roles.map(({ role, count }) => (
              <li key={role} className="min-w-0">
                <p className="font-mono text-label uppercase text-hull-400">
                  {ROLE_LABEL[role]}
                </p>
                <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-hull-100">
                  {count}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-6 sm:space-y-8">
        <FleetCard />
        <LoadoutCard />
      </div>
    </PageContainer>
  )
}
