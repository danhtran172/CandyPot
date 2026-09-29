import { MAX_PLAYERS, type Game, type GameModule } from '../types'

/**
 * Lô tô: host đặt giá mỗi tờ; mọi người kéo vào Pot để mua tờ (số tờ × giá);
 * Chốt → host kéo Pot cho người thắng (xác nhận) → ván kết thúc → ván mới.
 */
export const loto: GameModule = {
  type: 'loto',
  label: 'Lô tô',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'pot',
  phases: true,
}

/** Giá mỗi tờ mặc định. */
export const LOTO_PRICE = 5

/** Giá mỗi tờ đang dùng: ván đang mở → giá host đặt → ván gần nhất → mặc định. */
export function lotoPrice(game: Game): number {
  const open = game.rounds.find((r) => r.status === 'open' && r.kind === 'play')
  if (open) return open.bet
  if (game.price) return game.price
  const last = [...game.rounds].reverse().find((r) => r.kind === 'play')
  return last?.bet || LOTO_PRICE
}
