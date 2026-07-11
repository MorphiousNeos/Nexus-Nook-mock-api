/** Authenticated in-app navigation. Each item is its own route. */
export interface NavItem {
  /** Route path under the HashRouter (e.g. "/fleet"). */
  to: string
  /** Visible label. */
  label: string
  /** Emoji icon, matching the existing section card icons. */
  icon: string
  /** One-line description used in page headers and overview quick links. */
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/overview',
    label: 'Overview',
    icon: '🛸',
    description: 'Your launchpad — a glance at everything across the Nook.',
  },
  {
    to: '/fleet',
    label: 'Fleet',
    icon: '🚀',
    description: 'Track the ships you own and the ones on your wishlist.',
  },
  {
    to: '/trade',
    label: 'Trade',
    icon: '💱',
    description: 'Find profitable commodity routes across the verse.',
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: '📦',
    description: 'A personal manifest of components, cargo, and gear.',
  },
  {
    to: '/blueprints',
    label: 'Blueprints',
    icon: '📐',
    description: 'Track blueprints, gather materials, and see what your next craft needs.',
  },
  {
    to: '/hauling',
    label: 'Hauling',
    icon: '🚚',
    description: 'Stack cargo contracts into one efficient route and check off stops.',
  },
  {
    to: '/mining',
    label: 'Mining Ops',
    icon: '⛏️',
    description: 'Run crew sessions, log the take, and split profits fairly.',
  },
  {
    to: '/news',
    label: 'News',
    icon: '📰',
    description: 'Official Comm-Links and announcements from the verse.',
  },
  {
    to: '/org',
    label: 'Org',
    icon: '🌌',
    description: 'Coordinate with your crew. Organizations are on the way.',
  },
  {
    to: '/community',
    label: 'Community',
    icon: '👥',
    description: 'Find a group, share updates, and trade in the marketplace.',
  },
  {
    to: '/servers',
    label: 'Servers',
    icon: '📡',
    description: 'Regional shard health, population, and latency.',
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: '🛰️',
    description: 'Manage your account details and public RSI handle.',
  },
]
