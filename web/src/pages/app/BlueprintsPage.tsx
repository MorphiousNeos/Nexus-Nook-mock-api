import SectionPage from '../SectionPage'
import BlueprintCard from '../sections/BlueprintCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/blueprints')!

export default function BlueprintsPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <BlueprintCard />
    </SectionPage>
  )
}
