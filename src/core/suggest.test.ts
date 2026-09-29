import { describe, expect, it } from 'vitest'
import { eligibleShare } from './games/poker'
import { suggestOptions, tienlenBets } from './suggest'
import { POT, type Game, type Move, type Round } from './types'

let n = 0
const mv = (from: string, to: string, amount: number): Move => ({ id: `m${n++}`, from, to, amount, label: '' })

function game(type: Game['type'], rounds: Round[] = []): Game {
  return { id: 'g', type, name: '', rounds }
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
  it('Tiến lên: cược chung × 1 / 1,5 / 2', () => {
    expect(amounts(suggestOptions({ game: game('tienlen'), round: round({ bet: 4 }), from: 'a', to: 'b' }))).toEqual([4, 6, 8])
  })

  it('Tiến lên 2 mức cược: Nhì, Nhất, Nhất × 1,5, Nhất × 2', () => {
    const r = round({ bet: 4, bet2: 2 })
    expect(amounts(suggestOptions({ game: game('tienlen'), round: r, from: 'a', to: 'b' }))).toEqual([2, 4, 6, 8])
    expect(amounts(suggestOptions({ game: game('tienlen'), round: round({ bet: 2, bet2: 2 }), from: 'a', to: 'b' }))).toEqual([2, 3, 4])
  })

  it('làm tròn ×1,5 thành số nguyên và bỏ mức trùng', () => {
    expect(amounts(suggestOptions({ game: game('tienlen'), round: round({ bet: 5 }), from: 'a', to: 'b' }))).toEqual([5, 8, 10])
    expect(amounts(suggestOptions({ game: game('tienlen'), round: round({ bet: 1 }), from: 'a', to: 'b' }))).toEqual([1, 2])
  })

  it('Xì dách: theo cược của người con, dù kéo chiều nào (cái cũng trả)', () => {
    const r = round({ dealer: 'd', stakes: { a: 10 } })
    expect(amounts(suggestOptions({ game: game('xidach'), round: r, from: 'a', to: 'd' }))).toEqual([10, 15, 20])
    expect(amounts(suggestOptions({ game: game('xidach'), round: r, from: 'd', to: 'a' }))).toEqual([10, 15, 20])
  })

  it('Poker, kéo vào pot: theo số kẹo cần theo', () => {
    const r = round({ bet: 2, moves: [mv('a', POT, 10), mv('b', POT, 4)] })
    expect(amounts(suggestOptions({ game: game('poker'), round: r, from: 'b', to: POT }))).toEqual([6, 9, 12])
  })

  it('Poker, kéo vào pot khi mọi người bằng nhau: theo cược mở ván', () => {
    const r = round({ bet: 2, moves: [mv('a', POT, 2), mv('b', POT, 2)] })
    expect(amounts(suggestOptions({ game: game('poker'), round: r, from: 'a', to: POT }))).toEqual([2, 3, 4])
  })

  it('Poker, kéo pot cho người thắng: cả pot, phần được ăn (side pot), nửa pot', () => {
    const r = round({ moves: [mv('a', POT, 5), mv('b', POT, 20), mv('c', POT, 20)] })
    expect(eligibleShare(r, 'a')).toBe(15)
    expect(amounts(suggestOptions({ game: game('poker'), round: r, from: POT, to: 'a' }))).toEqual([45, 15, 22])
  })

  it('Không có ván đang mở: theo cược ván gần nhất', () => {
    const g = game('tienlen', [round({ status: 'closed', bet: 3 })])
    expect(amounts(suggestOptions({ game: g, round: null, from: 'a', to: 'b' }))).toEqual([3, 5, 6])
  })
})

describe('tienlenBets', () => {
  it('ván đang mở > mức host đặt > ván gần nhất > 4/2', () => {
    expect(tienlenBets(game('tienlen'))).toEqual({ bet: 4, bet2: 2 })
    const closed = round({ status: 'closed', bet: 6, bet2: 3 })
    expect(tienlenBets(game('tienlen', [closed]))).toEqual({ bet: 6, bet2: 3 })
    expect(tienlenBets({ ...game('tienlen', [closed]), bets: { bet: 10, bet2: 5 } })).toEqual({ bet: 10, bet2: 5 })
    const open = round({ bet: 8, bet2: 4 })
    expect(tienlenBets({ ...game('tienlen', [closed, open]), bets: { bet: 10, bet2: 5 } })).toEqual({ bet: 8, bet2: 4 })
  })

  it('không có ván mở: gợi ý theo mức host đặt', () => {
    const g = { ...game('tienlen'), bets: { bet: 6, bet2: 3 } }
    expect(amounts(suggestOptions({ game: g, round: null, from: 'a', to: 'b' }))).toEqual([3, 6, 9, 12])
  })
})
