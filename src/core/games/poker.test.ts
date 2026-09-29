import { describe, expect, it } from 'vitest'
import { netOfTransfers } from '../ledger'
import { needsRanking, poker, pokerNet, type PokerInput } from './poker'

const cfg = poker.defaultConfig

function input(contributions: Record<string, number>, partial: Partial<PokerInput> = {}): PokerInput {
  return { players: Object.keys(contributions), contributions, folded: [], winners: [], ranks: {}, ...partial }
}

describe('poker — chia pot', () => {
  it('1 người thắng ăn cả pot', () => {
    expect(pokerNet(input({ a: 10, b: 10, c: 10 }, { winners: ['a'] }))).toEqual({ a: 20, b: -10, c: -10 })
  })

  it('hòa: chia đều', () => {
    expect(pokerNet(input({ a: 10, b: 10, c: 10 }, { winners: ['a', 'b'] }))).toEqual({ a: 5, b: 5, c: -10 })
  })

  it('kẹo lẻ cho người thắng đứng đầu danh sách', () => {
    const i = input({ a: 5, b: 5, c: 5 }, { folded: ['c'], winners: ['b', 'a'] })
    expect(pokerNet(i)).toEqual({ a: 3, b: 2, c: -5 })
  })

  it('side pot 2 tầng', () => {
    const i = input({ a: 5, b: 20, c: 20 }, { ranks: { a: 1, b: 2, c: 3 } })
    expect(needsRanking(i)).toBe(true)
    expect(pokerNet(i)).toEqual({ a: 10, b: 10, c: -20 })
  })

  it('side pot 3 tầng', () => {
    const i = input({ a: 5, b: 10, c: 20, d: 20 }, { ranks: { a: 1, b: 2, c: 3, d: 4 } })
    expect(pokerNet(i)).toEqual({ a: 15, b: 5, c: 0, d: -20 })
  })

  it('side pot có đồng hạng + kẹo lẻ', () => {
    const i = input({ a: 5, b: 20, c: 20 }, { ranks: { a: 2, b: 1, c: 1 } })
    expect(pokerNet(i)).toEqual({ a: -5, b: 3, c: 2 })
  })

  it('người fold vẫn góp vào pot nhưng không được ăn', () => {
    const i = input({ a: 20, b: 5, c: 20 }, { folded: ['a'], ranks: { b: 1, c: 2 } })
    // pot chính (mức 5): 15 → b ; pot phụ (5..20): 30 → c
    expect(pokerNet(i)).toEqual({ a: -20, b: 10, c: 10 })
  })

  it('người fold bỏ nhiều hơn mức cao nhất → được trả lại phần dư', () => {
    const i = input({ a: 30, b: 10, c: 10 }, { folded: ['a'], winners: ['b'] })
    expect(needsRanking(i)).toBe(false)
    expect(pokerNet(i)).toEqual({ a: -10, b: 20, c: -10 })
  })

  it('resolve sinh giao dịch ít lượt, khớp lời/lỗ', () => {
    const i = input({ a: 5, b: 10, c: 20, d: 20 }, { ranks: { a: 1, b: 2, c: 3, d: 4 } })
    const { transfers } = poker.resolve(i, cfg, 1)
    expect(netOfTransfers(transfers)).toEqual({ a: 15, b: 5, d: -20 })
    expect(transfers).toHaveLength(2)
  })
})

describe('poker.validate', () => {
  it('hợp lệ', () => {
    expect(poker.validate(input({ a: 10, b: 10 }, { winners: ['a'] }), cfg)).toEqual([])
  })

  it('cần ≥ 2 người, đóng góp nguyên ≥ 0, tổng > 0', () => {
    expect(poker.validate(input({ a: 10 }, { winners: ['a'] }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: -1, b: 10 }, { winners: ['b'] }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: 1.5, b: 10 }, { winners: ['b'] }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: 0, b: 0 }, { winners: ['a'] }), cfg)).not.toEqual([])
  })

  it('phải còn người chưa fold, người thắng chưa fold', () => {
    expect(poker.validate(input({ a: 10, b: 10 }, { folded: ['a', 'b'] }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: 10, b: 10 }, { folded: ['a'], winners: ['a'] }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: 10, b: 10 }), cfg)).not.toEqual([])
  })

  it('có side pot thì mọi người chưa fold phải có hạng', () => {
    expect(poker.validate(input({ a: 5, b: 20, c: 20 }, { ranks: { a: 1, b: 2 } }), cfg)).not.toEqual([])
    expect(poker.validate(input({ a: 5, b: 20, c: 20 }, { ranks: { a: 1, b: 2, c: 2 } }), cfg)).toEqual([])
  })
})
