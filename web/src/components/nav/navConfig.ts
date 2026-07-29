import { NAV_ITEMS, type NavItem } from '../../nav'

/**
 * Navigation structure, kept separate from the components that render it.
 *
 * Every surface — rail, bottom bar, drawer — reads from here, so a destination
 * is added or reordered in one place and appears everywhere consistently.
 */

export type NavGroup = {
  id: string
  /** Rail caption. Also the drawer's section heading. */
  caption: string
  paths: string[]
}

/**
 * Destinations grouped by what a player is doing, not by when the feature was
 * built. Thirteen flat entries have no shape; three groups do.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operations',
    caption: 'Operations',
    paths: [
      '/overview',
      '/fleet',
      '/ships',
      '/trade',
      '/inventory',
      '/blueprints',
      '/hauling',
      '/mining',
    ],
  },
  {
    id: 'network',
    caption: 'Network',
    paths: ['/news', '/org', '/community'],
  },
  {
    id: 'system',
    caption: 'System',
    paths: ['/servers', '/profile'],
  },
]

/**
 * Thumb-reachable destinations for the bottom bar. Everything else lives
 * behind "More", which opens the full grouped list.
 */
export const PRIMARY_PATHS = ['/overview', '/fleet', '/trade', '/community']

/** Resolve paths to items, skipping any that no longer exist in NAV_ITEMS. */
export function itemsFor(paths: string[]): NavItem[] {
  return paths
    .map((to) => NAV_ITEMS.find((item) => item.to === to))
    .filter((item): item is NavItem => Boolean(item))
}

/** The index route renders Overview, so "/" counts as Overview. */
export function isActivePath(pathname: string, to: string): boolean {
  if (pathname === to) return true
  return to === '/overview' && pathname === '/'
}

/** Destinations not shown in the bottom bar — what "More" reveals. */
export function overflowGroups(): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    paths: group.paths.filter((to) => !PRIMARY_PATHS.includes(to)),
  })).filter((group) => group.paths.length > 0)
}
