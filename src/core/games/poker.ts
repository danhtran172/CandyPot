import { contributions, potOf } from '../round'
import { MAX_PLAYERS, type GameModule, type ID, type Option, type Round } from '../types'
import { dedupe } from './options'

export type PokerConfig = Record<string, never>

export const poker: GameModule<PokerConfig> = {
  type: 'poker',
  label: 'Poker',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'pot',
  defaultConfig: {},
}

/** Phần pot tối đa một người được ăn (side pot): mỗi người góp tối đa bằng số người đó đã bỏ vào. */
export function eligibleShare(round: Round, playerId: ID): number {
  const c = contributions(round)
  const own = c[playerId] ?? 0
  return Object.values(c).reduce((s, v) => s + Math.min(v, own), 0)
}

/** Kéo kẹo vào pot: theo, tố gấp đôi, ½ pot, cả pot. */
export function pokerBetOptions(round: Round, playerId: ID): Option[] {
  const c = contributions(round)
  const top = Math.max(0, ...Object.values(c))
  const own = c[playerId] ?? 0
  const pot = potOf(round)
  return dedupe([
    { amount: top - own, label: 'Theo' },
    { amount: Math.max(2 * top, 2 * round.bet) - own, label: 'Tố gấp đôi' },
    { amount: Math.ceil(pot / 2), label: '½ pot' },
    { amount: pot, label: 'Cả pot' },
  ])
}

/** Kéo pot cho người thắng: cả pot, phần được ăn (side pot), ½, ⅓. */
export function pokerWinOptions(round: Round, playerId: ID): Option[] {
  const pot = potOf(round)
  return dedupe([
    { amount: pot, label: 'Cả pot' },
    { amount: Math.min(pot, eligibleShare(round, playerId)), label: 'Phần được ăn' },
    { amount: Math.floor(pot / 2), label: '½ pot' },
    { amount: Math.floor(pot / 3), label: '⅓ pot' },
  ])
}
