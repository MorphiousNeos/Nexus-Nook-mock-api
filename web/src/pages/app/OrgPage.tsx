import SectionPage from '../SectionPage'
import OrgCard from '../sections/OrgCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/org')!

export default function OrgPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <OrgCard />
    </SectionPage>
  )
}
