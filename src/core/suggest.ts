import { scaledOptions } from './games/options'
import { pokerBetOptions, pokerWinOptions } from './games/poker'
import { POT, type Game, type ID, type Option, type Round } from './types'

export interface DragContext {
  game: Game
  /** Ván đang mở; null = kéo tự do (chuyển tay). */
  round: Round | null
  from: ID
  to: ID
}

/** Cược gần nhất của game, dùng khi không có ván đang mở. */
export function lastBet(game: Game): number {
  const last = [...game.rounds].reverse().find((r) => r.kind === 'play')
  return last?.bet || 1
}

/** Các mức kẹo gợi ý khi kéo hũ kẹo từ `from` sang `to`: cược × 1 / 1,5 / 2. */
export function suggestOptions({ game, round, from, to }: DragContext): Option[] {
  if (!round) return scaledOptions(lastBet(game))

  switch (game.type) {
    case 'tienlen':
      return scaledOptions(round.bet)
    case 'xidach': {
      const con = from === round.dealer ? to : from
      return scaledOptions(round.stakes[con] ?? round.bet)
    }
    case 'poker':
      if (to === POT) return pokerBetOptions(round, from)
      if (from === POT) return pokerWinOptions(round, to)
      return scaledOptions(round.bet)
  }
}
