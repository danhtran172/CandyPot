import { describe, expect, it } from 'vitest'
import { POT } from '../types'
import { act, award, pots, raiseOptions, startHand, toCall, undoLast, type HandState, type PokerAction } from './pokerHand'

let n = 0
const newId = () => `m${n++}`
const net = (s: HandState) => {
  const out: Record<string, number> = {}
  for (const m of s.moves) {
    if (m.from !== POT) out[m.from] = (out[m.from] ?? 0) - m.amount
    if (m.to !== POT) out[m.to] = (out[m.to] ?? 0) + m.amount
  }
  return out
}
function play(s: HandState, ...steps: [string, PokerAction][]): HandState {
  for (const [id, a] of steps) {
    const r = act(s, id, a, newId)
    if (typeof r === 'string') throw new Error(`${id} ${a.type}: ${r}`)
    s = r
  }
  return s
}

describe('pokerHand', () => {
  it('mở tay: SB/BB tự bỏ, lượt đầu là người sau BB', () => {
    const s = startHand(['a', 'b', 'c', 'd'], 'a', 1, 10, newId)
    expect(s.moves.map((m) => [m.from, m.amount, m.label])).toEqual([
      ['b', 1, 'SB'],
      ['c', 2, 'BB'],
    ])
    expect([s.hand.toAct, s.hand.currentBet, toCall(s.hand, 'd')]).toEqual(['d', 2, 2])
  })

  it('hai người: người chia là SB và nói trước ở preflop, sau flop thì BB nói trước', () => {
    let s = startHand(['a', 'b'], 'a', 1, 10, newId)
    expect(s.moves.map((m) => m.from)).toEqual(['a', 'b'])
    expect(s.hand.toAct).toBe('a')
    s = play(s, ['a', { type: 'call' }])
    expect(s.hand.toAct).toBe('b') // BB còn quyền nói
    s = play(s, ['b', { type: 'check' }])
    expect([s.hand.street, s.hand.toAct]).toEqual(['flop', 'b'])
  })

  it('tố mở lại lượt; theo hết thì sang vòng sau, qua river là showdown', () => {
    let s = startHand(['a', 'b', 'c'], 'a', 1, 20, newId)
    s = play(s, ['a', { type: 'raise', to: 6 }], ['b', { type: 'call' }])
    expect([s.hand.street, s.hand.toAct]).toEqual(['preflop', 'c'])
    s = play(s, ['c', { type: 'call' }])
    expect([s.hand.street, s.hand.toAct, s.hand.currentBet]).toEqual(['flop', 'b', 0])
    s = play(s, ['b', { type: 'check' }], ['c', { type: 'raise', to: 2 }], ['a', { type: 'call' }], ['b', { type: 'fold' }])
    expect(s.hand.street).toBe('turn')
    s = play(s, ['c', { type: 'check' }], ['a', { type: 'check' }], ['c', { type: 'check' }], ['a', { type: 'check' }])
    expect([s.hand.street, s.hand.toAct]).toEqual(['showdown', null])
    expect(pots(s)).toEqual([{ amount: 22, eligible: ['a', 'c'] }])
  })

  it('bỏ bài hết chỉ còn 1 người → người đó ăn cả pot', () => {
    let s = startHand(['a', 'b', 'c'], 'a', 1, 10, newId)
    s = play(s, ['a', { type: 'raise', to: 4 }], ['b', { type: 'fold' }], ['c', { type: 'fold' }])
    expect(s.hand.street).toBe('done')
    expect(net(s)).toEqual({ a: 3, b: -1, c: -2 })
  })

  it('all-in thiếu → pot chính + pot phụ, trao từng pot', () => {
    // cap 10; b chỉ có 4 kẹo (all-in thiếu)
    let s = startHand(['a', 'b', 'c'], 'a', 1, 10, newId)
    s = play(s, ['a', { type: 'raise', to: 10 }], ['b', { type: 'allin', amount: 3 }], ['c', { type: 'call' }])
    expect(s.hand.street).toBe('showdown')
    expect(pots(s)).toEqual([
      { amount: 12, eligible: ['a', 'b', 'c'] },
      { amount: 12, eligible: ['a', 'c'] },
    ])
    expect(award(s, 1, ['b'], newId)).toBe('Người này không được ăn pot này (đã bỏ bài hoặc all-in ít hơn).')
    s = award(s, 0, ['b'], newId) as HandState
    expect(s.hand.street).toBe('showdown')
    s = award(s, 1, ['a', 'c'], newId) as HandState
    expect(s.hand.street).toBe('done')
    expect(net(s)).toEqual({ a: -4, b: 8, c: -4 })
  })

  it('gợi ý tố: tối thiểu, ×1,5, ×2, không vượt all-in; hoàn tác thao tác cuối', () => {
    let s = startHand(['a', 'b', 'c'], 'a', 1, 10, newId)
    expect(raiseOptions(s, 'a')).toEqual([4, 6, 8])
    s = play(s, ['a', { type: 'raise', to: 4 }])
    expect(act(s, 'b', { type: 'raise', to: 5 }, newId)).toBe('Tố tối thiểu lên 6.')
    const back = undoLast(s) as HandState
    expect([back.hand.toAct, back.moves.length, back.hand.currentBet]).toEqual(['a', 2, 2])
  })
})
