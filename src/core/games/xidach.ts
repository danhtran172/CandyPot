import { MAX_PLAYERS, type GameModule } from '../types'

export const xidach: GameModule = {
  type: 'xidach',
  label: 'Xì dách',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'dealer',
}
