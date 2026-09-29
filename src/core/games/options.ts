import type { Option } from '../types'

/** Hệ số gợi ý trong popup kéo kẹo. */
export const MULTIPLIERS = [1, 1.5, 2]

/** base × 1 / 1,5 / 2, làm tròn thành số kẹo nguyên. */
export function scaledOptions(base: number): Option[] {
  return dedupe(MULTIPLIERS.map((m) => ({ amount: Math.round(base * m), label: `×${String(m).replace('.', ',')}` })))
}

/** Bỏ mức ≤ 0 và mức trùng (giữ nhãn đầu tiên). */
export function dedupe(options: Option[]): Option[] {
  const seen = new Set<number>()
  return options.filter((o) => {
    if (o.amount <= 0 || seen.has(o.amount)) return false
    seen.add(o.amount)
    return true
  })
}
