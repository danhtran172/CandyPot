import { dedupe, scaledOptions } from './games/options'
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

/** Tiến lên: mức cược Nhất/Nhì đang dùng — ván đang mở, rồi mức host đặt, rồi ván gần nhất, mặc định 4/2. */
export function tienlenBets(game: Game): { bet: number; bet2?: number } {
  const open = game.rounds.find((r) => r.status === 'open' && r.kind === 'play')
  if (open) return { bet: open.bet, bet2: open.bet2 }
  if (game.bets) return game.bets
  const last = [...game.rounds].reverse().find((r) => r.kind === 'play')
  return last ? { bet: last.bet, bet2: last.bet2 } : { bet: 4, bet2: 2 }
}

/** Tiến lên: giá heo đỏ / heo đen — chưa đặt riêng thì bằng Nhất / Nhì. */
export function tienlenPigs(game: Game, bet: number, bet2: number): { red: number; black: number } {
  return { red: game.bets?.red ?? bet, black: game.bets?.black ?? bet2 }
}

/** Tiến lên: cược Nhì, cược Nhất, Nhất × 1,5, Nhất × 2 — tăng dần. */
function tienlenOptions(first: number, second: number, pigs?: { red: number; black: number }): Option[] {
  const main = dedupe([
    { amount: second, label: 'Nhì' },
    { amount: first, label: 'Nhất' },
    ...(pigs
      ? [
          { amount: pigs.black, label: 'Heo đen' },
          { amount: pigs.red, label: 'Heo đỏ' },
        ]
      : []),
  ])
  // Heo trùng giá Nhất/Nhì thì bù bằng Nhất × 1,5 / × 2 cho đủ 4 mức
  return dedupe([...main, ...scaledOptions(first).slice(1)])
    .slice(0, 4)
    .sort((a, b) => a.amount - b.amount)
}

/** Các mức kẹo gợi ý khi kéo hũ kẹo từ `from` sang `to`: cược × 1 / 1,5 / 2. */
export function suggestOptions({ game, round, from, to }: DragContext): Option[] {
  if (game.type === 'tienlen') {
    const { bet, bet2 } = round ?? tienlenBets(game)
    return bet2 ? tienlenOptions(bet, bet2, tienlenPigs(game, bet, bet2)) : scaledOptions(bet)
  }
  if (!round) return scaledOptions(lastBet(game))

  switch (game.type) {
    case 'xidach': {
      const con = from === round.dealer ? to : from
      return scaledOptions(round.stakes[con] ?? round.bet)
    }
    case 'poker':
    case 'free':
      if (to === POT) return pokerBetOptions(round, from)
      if (from === POT) return pokerWinOptions(round, to)
      return scaledOptions(round.bet)
    case 'loto':
      return scaledOptions(round.bet)
    case 'uno':
      return []
  }
}
