import SectionPage from '../SectionPage'
import ProfileCard from '../sections/ProfileCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/profile')!

export default function ProfilePage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <ProfileCard />
    </SectionPage>
  )
}
