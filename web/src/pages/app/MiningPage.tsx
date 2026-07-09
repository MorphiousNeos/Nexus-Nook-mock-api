import SectionPage from '../SectionPage'
import MiningOpsCard from '../sections/MiningOpsCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/mining')!

export default function MiningPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <MiningOpsCard />
    </SectionPage>
  )
}
