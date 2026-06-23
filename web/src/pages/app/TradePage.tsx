import SectionPage from '../SectionPage'
import TradeCard from '../sections/TradeCard'
import { NAV_ITEMS } from '../../nav'

const item = NAV_ITEMS.find((i) => i.to === '/trade')!

export default function TradePage() {
  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <TradeCard />
    </SectionPage>
  )
}
