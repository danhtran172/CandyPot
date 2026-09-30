import { describe, expect, it } from 'vitest'
import { beats, comboOf, deal, pass, payouts, play, playableCards, type Card, type TienlenCards } from './tienlenPlay'

/** Lá theo hạng + chất: c('3♠') … c('2♥'). */
const R = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const S = ['♠', '♣', '♦', '♥']
const c = (s: string): Card => R.indexOf(s.slice(0, -1)) * 4 + S.indexOf(s.slice(-1))
const cs = (s: string) => s.split(' ').map(c)

const ok = (r: TienlenCards | string) => {
  if (typeof r === 'string') throw new Error(r)
  return r
}

describe('tienlenPlay', () => {
  it('nhận bộ: đôi, sảnh, đôi thông; sảnh không có 2', () => {
    expect(comboOf(cs('5♠ 5♥'))?.type).toBe('pair')
    expect(comboOf(cs('3♠ 4♦ 5♣'))?.type).toBe('straight')
    expect(comboOf(cs('K♠ A♦ 2♣'))).toBeNull()
    expect(comboOf(cs('3♠ 3♥ 4♠ 4♦ 5♣ 5♥'))).toMatchObject({ type: 'pairs', size: 3 })
  })

  it('chặn: cùng loại to hơn; tứ quý / 3 đôi thông chặt heo', () => {
    expect(beats(comboOf(cs('9♥'))!, comboOf(cs('10♠'))!)).toBe(true)
    expect(beats(comboOf(cs('9♠ 9♥'))!, comboOf(cs('9♣ 9♦'))!)).toBe(false)
    expect(beats(comboOf(cs('2♥'))!, comboOf(cs('7♠ 7♣ 7♦ 7♥'))!)).toBe(true)
    expect(beats(comboOf(cs('2♥'))!, comboOf(cs('3♠ 3♥ 4♠ 4♦ 5♣ 5♥'))!)).toBe(true)
    expect(beats(comboOf(cs('2♠ 2♥'))!, comboOf(cs('3♠ 3♥ 4♠ 4♦ 5♣ 5♥'))!)).toBe(false)
  })

  it('chia 13 lá, ván đầu người cầm 3♠ đi trước và phải đánh 3♠', () => {
    const deck = Array.from({ length: 52 }, (_, i) => 51 - i)
    const s = deal(['a', 'b', 'c', 'd'], deck)
    expect(Object.values(s.hands).map((h) => h.length)).toEqual([13, 13, 13, 13])
    expect(s.turn).toBe('d')
    expect(play(s, 'd', [c('4♠')])).toBe('Ván đầu: nước đầu tiên phải có 3♠.')
    expect(ok(play(s, 'd', [c('3♠')])).turn).toBe('a')
  })

  it('bỏ lượt hết thì người đánh cuối đi vòng mới; về hết thì xếp hạng', () => {
    let s: TienlenCards = {
      hands: { a: cs('3♠ 9♥'), b: cs('5♠'), c: cs('6♠ 7♠') },
      order: ['a', 'b', 'c'],
      turn: 'a',
      table: null,
      passed: [],
      finished: [],
    }
    s = ok(play(s, 'a', cs('9♥')))
    s = ok(pass(s, 'b'))
    s = ok(pass(s, 'c'))
    expect([s.turn, s.table]).toEqual(['a', null])
    s = ok(play(s, 'a', cs('3♠'))) // a về Nhất
    expect(s.finished).toEqual(['a'])
    s = ok(play(s, 'b', cs('5♠'))) // b về Nhì → c Bét, xong ván
    expect([s.turn, s.finished]).toEqual([null, ['a', 'b', 'c']])
    expect(payouts(s, 4, 2)).toEqual([{ from: 'c', to: 'a', amount: 4, label: 'Nhất' }])
  })
})

describe('playableCards — lá đi được', () => {
  it('chặn đôi 7: chỉ các đôi to hơn (và hàng chặt) còn sáng', () => {
    const hand = cs('4♠ 8♠ 8♥ 9♣ J♠ J♦ 2♥')
    expect([...playableCards(hand, cs('7♠ 7♥'))].sort((a, b) => a - b)).toEqual(cs('8♠ 8♥ J♠ J♦'))
  })
  it('vòng mới: mọi lá; ván đầu: chỉ bộ có 3♠', () => {
    const hand = cs('3♠ 4♦ 5♣ 9♥')
    expect(playableCards(hand, null).size).toBe(4)
    expect([...playableCards(hand, null, true)].sort((a, b) => a - b)).toEqual(cs('3♠ 4♦ 5♣'))
  })
  it('chặn sảnh 3 lá: lá trong sảnh 3 lá to hơn', () => {
    const hand = cs('6♠ 7♦ 8♣ K♥')
    expect([...playableCards(hand, cs('4♠ 5♠ 6♦'))].sort((a, b) => a - b)).toEqual(cs('6♠ 7♦ 8♣'))
  })
})
