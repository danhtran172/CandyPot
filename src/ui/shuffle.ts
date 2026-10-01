/** Các kiểu xào bài; mỗi ván chọn ngẫu nhiên một kiểu. */
export type ShuffleKind = 'riffle' | 'bridge'
const KINDS: ShuffleKind[] = ['riffle', 'bridge']

/** Chọn kiểu xào theo mã ván — ngẫu nhiên giữa các ván nhưng máy nào trong phòng cũng thấy cùng một kiểu. */
export function shuffleKindOf(roundId: string): ShuffleKind {
  // FNV-1a rồi trộn bit — chia đều 50/50 giữa các kiểu
  let h = 0x811c9dc5
  for (const ch of roundId) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return KINDS[(h >>> 0) % KINDS.length]
}

/** Máy bật giảm chuyển động → bỏ màn xào / chia bài. */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Xào bài: số lượt và độ dài một lượt theo kiểu. */
export const SHUFFLE_PASSES = 2
export const PASS_MS: Record<ShuffleKind, number> = { riffle: 1500, bridge: 1750 }
/** Sau lượt cuối, xấp bài nằm yên một chút rồi mới chia. */
const SETTLE_MS = 300
export const shuffleMs = (kind: ShuffleKind) => SHUFFLE_PASSES * PASS_MS[kind] + SETTLE_MS
/** Chia bài theo vòng: mỗi lá rời xấp cách nhau DEAL_STEP_MS, bay (vòng cung) mất DEAL_FLY_MS. */
export const DEAL_STEP_MS = 70
export const DEAL_FLY_MS = 460

/** Số lá chia (Tiến lên mỗi người 13, Xì dách 2; tối đa cả bộ 52). */
export const dealCount = (players: number, perSeat = 13) => Math.min(52, players * perSeat)

/** Cả màn xào + chia bài kéo dài bao lâu. */
export function introMs(kind: ShuffleKind, players: number, perSeat = 13): number {
  return shuffleMs(kind) + dealCount(players, perSeat) * DEAL_STEP_MS + DEAL_FLY_MS + 250
}
