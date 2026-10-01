import { describe, expect, it } from 'vitest'
import { colOf, generatePair, pairError, pairsFor, seeded, sheetError, sheetSet } from './lotoSheets'

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

  it('đủ giấy cho cả bàn mua tối đa', () => {
    expect(pairsFor(4, 2)).toBe(10)
    expect(pairsFor(10, 3)).toBe(15)
    expect(pairsFor(10, 2)).toBe(10)
  })
})
