import SectionPage from '../SectionPage'
import ServerStatusCard from '../sections/ServerStatusCard'
import ExecHangarCard from '../sections/ExecHangarCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/servers')!

export default function ServersPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <div className="space-y-6 xl:grid xl:grid-cols-2 xl:items-start xl:gap-6 xl:space-y-0">
        <ServerStatusCard />
        <ExecHangarCard />
      </div>
    </SectionPage>
  )
}
