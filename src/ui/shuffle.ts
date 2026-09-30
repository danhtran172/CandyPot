/** Các kiểu xào bài; mỗi ván chọn ngẫu nhiên một kiểu. */
export type ShuffleKind = 'riffle' | 'bridge'
const KINDS: ShuffleKind[] = ['riffle', 'bridge']

/** Chọn kiểu xào theo mã ván — ngẫu nhiên giữa các ván nhưng máy nào trong phòng cũng thấy cùng một kiểu. */
export function shuffleKindOf(roundId: string): ShuffleKind {
  let h = 0
  for (const ch of roundId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return KINDS[Math.abs(h) % KINDS.length]
}

/** Máy bật giảm chuyển động → bỏ màn xào / chia bài. */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Xào bài: 2 lượt, dài nhất là bridge (2 × 1,9 s + lá cuối trễ ~0,5 s). */
export const SHUFFLE_MS = 4300
/** Chia bài: mỗi lá bay cách nhau DEAL_STEP_MS, bay mất DEAL_FLY_MS. */
export const DEAL_STEP_MS = 40
export const DEAL_FLY_MS = 380

/** Số lá chia (mỗi người 13, tối đa cả bộ 52). */
export const dealCount = (players: number) => Math.min(52, players * 13)

/** Cả màn xào + chia bài kéo dài bao lâu. */
export function introMs(players: number): number {
  return SHUFFLE_MS + dealCount(players) * DEAL_STEP_MS + DEAL_FLY_MS + 250
}
