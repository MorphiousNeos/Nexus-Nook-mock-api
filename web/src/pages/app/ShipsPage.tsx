import SectionPage from '../SectionPage'
import ShipDatabaseCard from '../sections/ShipDatabaseCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/ships')!

export default function ShipsPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <ShipDatabaseCard />
    </SectionPage>
  )
}
