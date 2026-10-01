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

/** Xào bài: số lượt và độ dài một lượt theo kiểu. */
export const SHUFFLE_PASSES = 2
export const PASS_MS: Record<ShuffleKind, number> = { riffle: 1500, bridge: 1750 }
/** Sau lượt cuối, xấp bài nằm yên một chút rồi mới chia. */
const SETTLE_MS = 300
export const shuffleMs = (kind: ShuffleKind) => SHUFFLE_PASSES * PASS_MS[kind] + SETTLE_MS
/** Chia bài theo vòng: mỗi lá rời xấp cách nhau DEAL_STEP_MS, bay (vòng cung) mất DEAL_FLY_MS. */
export const DEAL_STEP_MS = 70
export const DEAL_FLY_MS = 460

/** Số lá chia (mỗi người 13, tối đa cả bộ 52). */
export const dealCount = (players: number) => Math.min(52, players * 13)

/** Cả màn xào + chia bài kéo dài bao lâu. */
export function introMs(kind: ShuffleKind, players: number): number {
  return shuffleMs(kind) + dealCount(players) * DEAL_STEP_MS + DEAL_FLY_MS + 250
}
