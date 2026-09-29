import type { GameModule } from '../types'

export const tienlen: GameModule = {
  type: 'tienlen',
  label: 'Tiến lên',
  minPlayers: 2,
  maxPlayers: 4,
  stakeMode: 'common',
}
