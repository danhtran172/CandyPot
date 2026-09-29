import { describe, expect, it } from 'vitest'
import { MAX_PILE, pileCount, pileLayout, pileUnit } from './pile'
import type { Game, Round } from './types'

function round(partial: Partial<Round>): Round {
  return {
    id: 'r',
    at: 0,
    kind: 'play',
    status: 'closed',
    participants: [],
    bet: 1,
    stakes: {},
    dealer: null,
    moves: [],
    transfers: [],
    tags: [],
    ...partial,
  }
}

const game = (type: Game['type'], rounds: Round[]): Game => ({ id: 'g', type, name: '', rounds })

describe('pileUnit', () => {
  it('chưa có ván: 1 kẹo / icon', () => {
    expect(pileUnit(undefined)).toBe(1)
    expect(pileUnit(game('tienlen', []))).toBe(1)
  })

  it('Tiến lên 4/2: 1 icon = 2 kẹo', () => {
    expect(pileUnit(game('tienlen', [round({ bet: 4, bet2: 2 })]))).toBe(2)
  })

  it('Xì dách / Poker: trung bình cược, lấy ván gần nhất, bỏ qua chuyển tay', () => {
    const xd = game('xidach', [round({ stakes: { a: 2 } }), round({ stakes: { a: 5, b: 10, c: 3 } }), round({ kind: 'manual' })])
    expect(pileUnit(xd)).toBe(6)
    expect(pileUnit(game('poker', [round({ bet: 3, stakes: { a: 0, b: 0 } })]))).toBe(3)
  })
})

describe('pileCount', () => {
  it('làm tròn, tối thiểu 1, tối đa MAX_PILE', () => {
    expect(pileCount(0, 2)).toBe(0)
    expect(pileCount(1, 4)).toBe(1)
    expect(pileCount(-9, 2)).toBe(5)
    expect(pileCount(1000, 1)).toBe(MAX_PILE)
  })
})

describe('pileLayout', () => {
  it('xếp tam giác từ đáy lên', () => {
    expect(pileLayout(6).map((p) => p.row)).toEqual([0, 0, 0, 1, 1, 2])
    expect(pileLayout(4).map((p) => [p.row, p.rowSize])).toEqual([
      [0, 3],
      [0, 3],
      [0, 3],
      [1, 2],
    ])
    expect(pileLayout(MAX_PILE).filter((p) => p.row === 0)).toHaveLength(5)
  })
})
