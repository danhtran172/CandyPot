import { MAX_PLAYERS, type Game, type GameModule } from '../types'

export const xidach: GameModule = {
  type: 'xidach',
  label: 'Xì dách',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'dealer',
  phases: true,
}

/** Cược tối đa mặc định = 5 × cược tối thiểu. */
export const XIDACH_MAX_MULTIPLIER = 5

/** Mức cược min/max của game (mặc định 1 và 5). */
export function xidachLimits(game: Game): { min: number; max: number } {
  return game.xidachLimits ?? { min: 1, max: XIDACH_MAX_MULTIPLIER }
}

/** Gợi ý đặt cược: tối thiểu, cược cũ (nếu trong khoảng), tối đa. */
export function xidachBetOptions(game: Game, previous?: number): number[] {
  const { min, max } = xidachLimits(game)
  const mid = previous && previous > min && previous < max ? previous : Math.round((min + max) / 2)
  return [...new Set([min, mid, max])].sort((a, b) => a - b)
}
