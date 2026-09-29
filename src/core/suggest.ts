import { genericOptions } from './games/options'
import { pokerBetOptions, pokerWinOptions } from './games/poker'
import { tienlenOptions, type TienLenConfig } from './games/tienlen'
import { xidachOptions, type XiDachConfig } from './games/xidach'
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

/** 4 mức kẹo gợi ý khi kéo từ `from` sang `to`. */
export function suggestOptions({ game, round, from, to }: DragContext): Option[] {
  if (!round) return genericOptions(lastBet(game))

  switch (game.type) {
    case 'tienlen':
      return tienlenOptions(game.config as TienLenConfig, round.bet)
    case 'xidach': {
      const con = from === round.dealer ? to : from
      return xidachOptions(game.config as XiDachConfig, round.stakes[con] ?? round.bet)
    }
    case 'poker':
      if (to === POT) return pokerBetOptions(round, from)
      if (from === POT) return pokerWinOptions(round, to)
      return genericOptions(round.bet)
  }
}
