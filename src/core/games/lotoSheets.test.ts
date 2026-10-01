import { describe, expect, it } from 'vitest'
import { colOf, generatePair, MAX_SHARED, pairError, pairsFor, rowNumbers, seeded, sheetError, sheetSet } from './lotoSheets'

describe('lotoSheets — bộ giấy đúng quy tắc', () => {
  it('cột theo chục: 1–9, 10–19, …, 80–90', () => {
    expect([1, 9, 10, 19, 79, 80, 89, 90].map(colOf)).toEqual([0, 0, 1, 1, 7, 8, 8, 8])
  })

  it('200 cặp ngẫu nhiên: mỗi tờ 9 × 9, mỗi hàng 5 số, đúng cột, tăng dần trong khối; cặp đủ 1–90', () => {
    for (let k = 0; k < 200; k++) {
      const [a, b] = generatePair(seeded(`test:${k}`))
      expect(sheetError(a)).toBeNull()
      expect(sheetError(b)).toBeNull()
      expect(pairError(a, b)).toBeNull()
    }
  })

  it('cùng mã game thì cùng bộ giấy; khác mã thì khác', () => {
    expect(sheetSet('g1', 3)).toEqual(sheetSet('g1', 3))
    expect(sheetSet('g1', 3)).not.toEqual(sheetSet('g2', 3))
    // Thêm cặp không đổi các tờ cũ
    expect(sheetSet('g1', 4).slice(0, 6)).toEqual(sheetSet('g1', 3))
  })

  it('cả bộ: đúng luật, không hai hàng (ở hai tờ khác nhau) chung quá 2 số, ít số trùng đúng ô', () => {
    for (const [id, pairs] of [
      ['bo-1', 10],
      ['bo-2', 15],
    ] as const) {
      const set = sheetSet(id, pairs)
      for (let k = 0; k < pairs; k++) {
        expect(sheetError(set[2 * k])).toBeNull()
        expect(sheetError(set[2 * k + 1])).toBeNull()
        expect(pairError(set[2 * k], set[2 * k + 1])).toBeNull()
      }
      const rows = set.flatMap((sheet, i) => Array.from({ length: 9 }, (_, r) => ({ i, nums: rowNumbers(sheet, r) })))
      let worst = 0
      for (let a = 0; a < rows.length; a++)
        for (let b = a + 1; b < rows.length; b++)
          if (rows[a].i !== rows[b].i) worst = Math.max(worst, rows[a].nums.filter((n) => rows[b].nums.includes(n)).length)
      expect(worst).toBeLessThanOrEqual(MAX_SHARED)
      // Trùng đúng ô: trung bình dưới 2 số mỗi cặp tờ (ngẫu nhiên thuần ≈ 2.5)
      let same = 0
      for (let a = 0; a < set.length; a++)
        for (let b = a + 1; b < set.length; b++) same += set[a].flat().filter((x, k) => x !== null && x === set[b].flat()[k]).length
      expect(same / ((set.length * (set.length - 1)) / 2)).toBeLessThan(2)
    }
  })

  it('đủ giấy cho cả bàn mua tối đa', () => {
    expect(pairsFor(4, 2)).toBe(10)
    expect(pairsFor(10, 3)).toBe(15)
    expect(pairsFor(10, 2)).toBe(10)
  })
})
