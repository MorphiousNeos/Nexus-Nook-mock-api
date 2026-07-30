import { useMemo } from 'react'
import { useSession } from '../../SessionContext'
import PageContainer from '../../components/PageContainer'
import { HeroModule, SummaryModule, type SummaryStat } from '../../components/modules'
import FleetCard from '../sections/FleetCard'
import LoadoutCard from '../sections/LoadoutCard'

/**
 * Fleet.
 *
 * The hero answers "what do I fly, and is any of it ready" before the page
 * shows a single list row.
 *
 * Every figure below comes from data the app actually holds. A ship record has
 * a name, a manufacturer, a type and a note — there is no status, insurance or
 * wishlist field — so readiness is expressed as loadout coverage, which is
 * real, rather than as a health score, which would be invented.
 */
export default function FleetPage() {
  const { state } = useSession()
  const fleet = state?.fleet ?? []
  const loadouts = state?.loadouts ?? []

  const stats = useMemo<SummaryStat[]>(() => {
    const manufacturers = new Set(
      fleet.map((s) => s.manufacturer?.trim()).filter(Boolean) as string[],
    )
    // A ship counts as configured when a loadout names it.
    const configured = fleet.filter((ship) =>
      loadouts.some((lo) => lo.ship.trim().toLowerCase() === ship.name.trim().toLowerCase()),
    ).length
    const storedInGame = loadouts.filter((lo) => lo.savedInGame).length

    return [
      {
        label: 'Ships',
        value: String(fleet.length),
        note:
          manufacturers.size > 0
            ? `${manufacturers.size} ${manufacturers.size === 1 ? 'manufacturer' : 'manufacturers'}`
            : 'None added yet',
      },
      {
        label: 'Configured',
        value: fleet.length ? `${configured}/${fleet.length}` : '—',
        note: configured === fleet.length && fleet.length > 0
          ? 'Every ship has a build'
          : `${Math.max(fleet.length - configured, 0)} without a loadout`,
        tone: fleet.length > 0 && configured === fleet.length ? 'positive' : 'default',
      },
      {
        label: 'Loadouts',
        value: String(loadouts.length),
        note: loadouts.length
          ? `${storedInGame} stored in game`
          : 'No builds saved yet',
      },
      {
        label: 'Stored in game',
        value: loadouts.length ? `${storedInGame}/${loadouts.length}` : '—',
        note:
          loadouts.length && storedInGame < loadouts.length
            ? 'Rest need Item Recovery'
            : 'Recoverable after a claim',
        tone:
          loadouts.length > 0 && storedInGame < loadouts.length ? 'caution' : 'default',
      },
    ]
  }, [fleet, loadouts])

  const lede = fleet.length
    ? 'Your hangar and the builds that fly in it. Add a ship, give it a loadout, then mark the build stored once the game has it.'
    : 'Nothing in the hangar yet. Add the ships you own or want, then give each one a build.'

  return (
    <PageContainer>
      <HeroModule
        eyebrow="Fleet"
        title={
          fleet.length ? (
            <>
              {fleet.length} {fleet.length === 1 ? 'ship' : 'ships'} in the hangar
            </>
          ) : (
            'Your hangar is empty'
          )
        }
        lede={lede}
      >
        <SummaryModule stats={stats} />
      </HeroModule>

      <div className="space-y-6 sm:space-y-8">
        <FleetCard />
        <LoadoutCard />
      </div>
    </PageContainer>
  )
}
