import type { Option } from '../types'

/**
 * Gom các hệ số có tên theo giá trị, lấy 4 giá trị nhỏ nhất (> 0),
 * thiếu thì bù bằng số nguyên kế tiếp. amount = hệ số × base.
 */
export function multiplierOptions(named: [number, string][], base: number, count = 4): Option[] {
  const groups = new Map<number, string[]>()
  for (const [m, name] of named) {
    if (m <= 0) continue
    const names = groups.get(m) ?? []
    if (!names.includes(name)) names.push(name)
    groups.set(m, names)
  }
  const values = [...groups.keys()].sort((a, b) => a - b).slice(0, count)
  for (let m = 1; values.length < count; m++) if (!values.includes(m)) values.push(m)
  return values
    .sort((a, b) => a - b)
    .map((m) => ({ amount: m * base, label: [`×${m}`, ...(groups.get(m) ?? [])].join(' · ') }))
}

/** Gợi ý chung khi không có luật: base, 2, 5, 10 lần. */
export function genericOptions(base: number): Option[] {
  return [1, 2, 5, 10].map((m) => ({ amount: m * base, label: `×${m}` }))
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
