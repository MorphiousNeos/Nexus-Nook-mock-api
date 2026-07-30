import type { Ship } from './types'

/**
 * Defaults for a newly added hull. Conservative on availability for the same
 * reason the migration is: a ship the app claims is ready when it is not costs
 * the player more than one they have to mark ready themselves.
 */
export function newShipDefaults(): Pick<
  Ship,
  'state' | 'availability' | 'configurationRole' | 'acquisition' | 'insurance' | 'isPrimary' | 'tags'
> {
  return {
    state: 'owned',
    availability: 'stored',
    configurationRole: 'multi-role',
    acquisition: 'unknown',
    insurance: { type: 'none' },
    isPrimary: false,
    tags: [],
  }
}
