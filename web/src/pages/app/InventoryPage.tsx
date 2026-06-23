import SectionPage from '../SectionPage'
import InventoryCard from '../sections/InventoryCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/inventory')!

export default function InventoryPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <InventoryCard />
    </SectionPage>
  )
}
