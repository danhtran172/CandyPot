import { contributions } from './round'
import type { Game, ID, Round, Session } from './types'

/**
 * Kiểm tra trước khi chốt cược / chốt mua (Xì dách, Lô tô, Tự do) — chỉ để cảnh báo, không chặn:
 * - `missing`: người đang chơi (không nghỉ, không phải nhà cái) mà chưa bet / mua / cược;
 * - `resting`: người đang nghỉ 💤 mà đã bet / mua / cược trong ván này.
 */
export function lockWarnings(session: Session, game: Game, round: Round): { missing: ID[]; resting: ID[] } {
  const paid: Record<ID, number> =
    game.type === 'xidach'
      ? Object.fromEntries(round.participants.map((id) => [id, round.stakes[id] ?? 0]))
      : contributions(round)
  const inRoom = session.players.filter((p) => !p.removed && p.id !== round.dealer)
  return {
    // Người vào bàn giữa ván (không có trong ván) đang chờ ván sau — không nhắc
    missing: inRoom.filter((p) => p.active && round.participants.includes(p.id) && !(paid[p.id] > 0)).map((p) => p.id),
    resting: inRoom.filter((p) => !p.active && paid[p.id] > 0).map((p) => p.id),
  }
}
