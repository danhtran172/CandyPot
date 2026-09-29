import { describe, expect, it } from 'vitest'
import { ladderStep } from './ladder'

const walk = (anchor: number, start: number, dir: 1 | -1, n: number, min = 1) => {
  const out = [start]
  for (let i = 0; i < n; i++) out.push(ladderStep(anchor, out[out.length - 1], dir, min))
  return out
}

describe('ladderStep — nút +/− theo ×1,5 · ×2 · ×3', () => {
  it('tăng: ×1,5 → ×2 → ×3 rồi lặp lại', () => {
    expect(walk(4, 4, 1, 6)).toEqual([4, 6, 8, 12, 18, 24, 36])
    expect(walk(2, 2, 1, 4)).toEqual([2, 3, 4, 6, 9])
  })

  it('giảm đi lùi đúng các bậc, không dưới min', () => {
    expect(walk(4, 12, -1, 5)).toEqual([12, 8, 6, 4, 3, 2])
    expect(walk(4, 2, -1, 3)).toEqual([2, 1, 1, 1])
    expect(ladderStep(4, 1, -1, 0)).toBe(0)
  })

  it('từ 0 thì + lên 1', () => {
    expect(ladderStep(0, 0, 1, 0)).toBe(1)
  })
})
