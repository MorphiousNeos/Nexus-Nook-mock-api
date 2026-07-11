import SectionPage from '../SectionPage'
import NewsCard from '../sections/NewsCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/news')!

export default function NewsPage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <NewsCard />
    </SectionPage>
  )
}
