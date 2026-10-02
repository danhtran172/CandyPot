import type { Round } from '../core/types'
import type { MusicMood } from './music'

/** Lô tô: hơn bấy nhiêu người cùng đợi thì nhạc kịch tính. */
export const LOTO_TENSE_WAITING = 5

/**
 * Nhạc kịch tính khi ván tới hồi gay cấn, còn lại là nhạc êm:
 * - Tiến lên: chưa ai về mà có người sắp hết bài (≤ 2 lá), hoặc chỉ còn 2 người cuối (bàn từ 3 người);
 * - Xì dách: tới lượt cái xét;
 * - Lô tô: hơn 5 người đang đợi.
 */
export function musicMood(round: Round | undefined): MusicMood {
  if (!round || round.status !== 'open') return 'calm'
  const tl = round.tienlen
  if (tl && tl.turn !== null) {
    const left = tl.order.filter((id) => !tl.finished.includes(id))
    if (tl.order.length > 2 && left.length === 2) return 'tense'
    if (!tl.finished.length && left.some((id) => (tl.hands[id]?.length ?? 0) <= 2)) return 'tense'
  }
  const xd = round.xidach
  if (xd && xd.turn !== null && xd.turn === xd.dealer) return 'tense'
  const lo = round.loto
  if (lo && !lo.winner && (lo.waiting?.length ?? 0) > LOTO_TENSE_WAITING) return 'tense'
  return 'calm'
}
