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

/**
 * Gợi ý đặt cược. Đầu tiên là mức nên chọn: cược cũ (nếu trong khoảng), không có thì mức giữa;
 * sau đó các mức tối thiểu / giữa / tối đa còn lại, tăng dần.
 */
export function xidachBetOptions(game: Game, previous?: number): number[] {
  const { min, max } = xidachLimits(game)
  const mid = Math.round((min + max) / 2)
  const best = previous && previous >= min && previous <= max ? previous : mid
  const rest = [...new Set([min, mid, max])].filter((x) => x !== best).sort((a, b) => a - b)
  return [best, ...rest]
}
