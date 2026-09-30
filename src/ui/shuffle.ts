/** Các kiểu xào bài; mỗi ván chọn ngẫu nhiên một kiểu. */
export type ShuffleKind = 'riffle' | 'bridge'
const KINDS: ShuffleKind[] = ['riffle', 'bridge']

/** Chọn kiểu xào theo mã ván — ngẫu nhiên giữa các ván nhưng máy nào trong phòng cũng thấy cùng một kiểu. */
export function shuffleKindOf(roundId: string): ShuffleKind {
  let h = 0
  for (const ch of roundId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return KINDS[Math.abs(h) % KINDS.length]
}
