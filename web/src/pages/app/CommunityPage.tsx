import { useState } from 'react'
import SectionPage from '../SectionPage'
import { NAV_ITEMS } from '../../nav'
import LfgBoard from '../community/LfgBoard'
import CommunityFeed from '../community/CommunityFeed'
import Marketplace from '../community/Marketplace'

const item = NAV_ITEMS.find((i) => i.to === '/community')!

type Tab = 'lfg' | 'feed' | 'market'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'lfg', label: 'Looking for Group', icon: '🎯' },
  { id: 'feed', label: 'Feed', icon: '🌠' },
  { id: 'market', label: 'Marketplace', icon: '🛒' },
]

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('lfg')

  return (
    <SectionPage icon={item.icon} title={item.label} description={item.description}>
      <div
        role="tablist"
        aria-label="Community sections"
        className="mb-5 flex flex-wrap gap-2"
      >
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'border-brand-700/60 bg-brand-950/40 text-brand-100 shadow-inner shadow-brand-950/40'
                  : 'border-hull-700/70 bg-hull-800/40 text-hull-300 hover:border-hull-600 hover:bg-hull-700/50 hover:text-hull-100'
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'lfg' && <LfgBoard />}
      {tab === 'feed' && <CommunityFeed />}
      {tab === 'market' && <Marketplace />}
    </SectionPage>
  )
}
