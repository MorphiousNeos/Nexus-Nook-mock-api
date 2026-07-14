import SectionPage from '../SectionPage'
import FleetCard from '../sections/FleetCard'
import LoadoutCard from '../sections/LoadoutCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/fleet')!

export default function FleetPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <div className="space-y-6">
        <FleetCard />
        <LoadoutCard />
      </div>
    </SectionPage>
  )
}
