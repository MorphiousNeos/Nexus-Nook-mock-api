import SectionPage from '../SectionPage'
import ServerStatusCard from '../sections/ServerStatusCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/servers')!

export default function ServersPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <ServerStatusCard />
    </SectionPage>
  )
}
