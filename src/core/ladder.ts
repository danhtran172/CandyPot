/**
 * Bậc tăng/giảm của nút +/−: từ số gốc nhảy ×1,5 → ×2 → ×3, rồi lặp lại từ ×3
 * (4 → 6 → 8 → 12 → 18 → 24 → 36…). Nút − đi lùi đúng các bậc đó (4 → 3 → 2 → 1).
 */
const FACTORS = [1, 1.5, 2]

/** Các giá trị trên thang của `anchor` (làm tròn, tăng dần). */
export function ladder(anchor: number): number[] {
  const a = anchor > 0 ? anchor : 1
  const values = new Set<number>()
  for (let k = -6; k <= 14; k++) for (const f of FACTORS) values.add(Math.round(a * f * 3 ** k))
  return [...values].sort((x, y) => x - y)
}

export function onLadder(anchor: number, value: number): boolean {
  return ladder(anchor).includes(value)
}

/** Bậc kế tiếp theo chiều `dir` (+1 / −1), không thấp hơn `min`. */
export function ladderStep(anchor: number, value: number, dir: 1 | -1, min = 0): number {
  const list = ladder(anchor).filter((v) => v >= min)
  if (dir > 0) return list.find((v) => v > value) ?? value
  const lower = list.filter((v) => v < value)
  return lower.length ? lower[lower.length - 1] : Math.min(value, Math.max(min, 0))
}
