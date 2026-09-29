import { contributions, potOf } from '../round'
import { MAX_PLAYERS, type GameModule, type ID, type Option, type Round } from '../types'
import { dedupe, scaledOptions } from './options'

export const poker: GameModule = {
  type: 'poker',
  label: 'Poker',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'pot',
}

/** Phần pot tối đa một người được ăn (side pot): mỗi người góp tối đa bằng số người đó đã bỏ vào. */
export function eligibleShare(round: Round, playerId: ID): number {
  const c = contributions(round)
  const own = c[playerId] ?? 0
  return Object.values(c).reduce((s, v) => s + Math.min(v, own), 0)
}

/** Kéo kẹo vào pot: ×1 / ×1,5 / ×2 số kẹo cần theo (chưa ai tố thì theo cược mở ván). */
export function pokerBetOptions(round: Round, playerId: ID): Option[] {
  const c = contributions(round)
  const top = Math.max(0, ...Object.values(c))
  const toCall = top - (c[playerId] ?? 0)
  return scaledOptions(toCall > 0 ? toCall : round.bet)
}

/** Kéo pot cho người thắng: cả pot, phần được ăn (side pot), ½ pot. */
export function pokerWinOptions(round: Round, playerId: ID): Option[] {
  const pot = potOf(round)
  return dedupe([
    { amount: pot, label: 'Cả pot' },
    { amount: Math.min(pot, eligibleShare(round, playerId)), label: 'Phần được ăn' },
    { amount: Math.floor(pot / 2), label: '½ pot' },
  ])
}
