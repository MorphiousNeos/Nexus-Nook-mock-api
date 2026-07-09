import SectionPage from '../SectionPage'
import HaulingCard from '../sections/HaulingCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/hauling')!

export default function HaulingPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <HaulingCard />
    </SectionPage>
  )
}
