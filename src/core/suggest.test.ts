import { describe, expect, it } from 'vitest'
import { eligibleShare } from './games/poker'
import { tienlen } from './games/tienlen'
import { xidach } from './games/xidach'
import { suggestOptions } from './suggest'
import { POT, type Game, type Move, type Round } from './types'

let n = 0
const mv = (from: string, to: string, amount: number): Move => ({ id: `m${n++}`, from, to, amount, label: '' })

function game(type: Game['type'], config: unknown, rounds: Round[] = []): Game {
  return { id: 'g', type, name: '', config, rounds }
}

function round(partial: Partial<Round>): Round {
  return {
    id: 'r',
    at: 0,
    kind: 'play',
    status: 'open',
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

const amounts = (o: { amount: number }[]) => o.map((x) => x.amount)

describe('suggestOptions', () => {
  it('Tiến lên: 1u–4u, gắn tên tình huống theo luật', () => {
    const o = suggestOptions({ game: game('tienlen', tienlen.defaultConfig), round: round({ bet: 5 }), from: 'a', to: 'b' })
    expect(amounts(o)).toEqual([5, 10, 15, 20])
    expect(o[1].label).toContain('Bét→Nhất')
    expect(o[1].label).toContain('Heo đỏ')
    expect(o[2].label).toContain('Cháy')
    expect(o[3].label).toContain('4 đôi thông')
  })

  it('Tiến lên: đổi luật thì gợi ý đổi theo', () => {
    const cfg = { ...tienlen.defaultConfig, chay: 5 }
    const o = suggestOptions({ game: game('tienlen', cfg), round: round({ bet: 1 }), from: 'a', to: 'b' })
    expect(amounts(o)).toEqual([1, 2, 3, 4])
    expect(o[2].label).not.toContain('Cháy')
  })

  it('Xì dách: bội số cược của con, dù kéo chiều nào', () => {
    const r = round({ dealer: 'd', stakes: { a: 10 } })
    const g = game('xidach', xidach.defaultConfig)
    expect(amounts(suggestOptions({ game: g, round: r, from: 'a', to: 'd' }))).toEqual([10, 20, 30, 40])
    const o = suggestOptions({ game: g, round: r, from: 'd', to: 'a' })
    expect(amounts(o)).toEqual([10, 20, 30, 40])
    expect(o[1].label).toBe('×2 · Xì bàn · Xì dách · Ngũ linh')
  })

  it('Poker, kéo vào pot: theo / tố gấp đôi / ½ pot / cả pot', () => {
    const r = round({ bet: 2, moves: [mv('a', POT, 10), mv('b', POT, 4)] })
    const o = suggestOptions({ game: game('poker', {}), round: r, from: 'b', to: POT })
    expect(o).toEqual([
      { amount: 6, label: 'Theo' },
      { amount: 16, label: 'Tố gấp đôi' },
      { amount: 7, label: '½ pot' },
      { amount: 14, label: 'Cả pot' },
    ])
  })

  it('Poker, kéo pot cho người thắng: phần được ăn tính side pot', () => {
    const r = round({ moves: [mv('a', POT, 5), mv('b', POT, 20), mv('c', POT, 20)] })
    expect(eligibleShare(r, 'a')).toBe(15)
    const o = suggestOptions({ game: game('poker', {}), round: r, from: POT, to: 'a' })
    expect(o).toEqual([
      { amount: 45, label: 'Cả pot' },
      { amount: 15, label: 'Phần được ăn' },
      { amount: 22, label: '½ pot' },
    ])
  })

  it('Không có ván đang mở: gợi ý theo cược ván gần nhất', () => {
    const g = game('tienlen', tienlen.defaultConfig, [round({ status: 'closed', bet: 3 })])
    expect(amounts(suggestOptions({ game: g, round: null, from: 'a', to: 'b' }))).toEqual([3, 6, 15, 30])
  })
})
