import { describe, expect, it } from 'vitest'
import { autoMove, beats, comboOf, deal, pass, payouts, play, playableCards, suggestWith, type Card, type TienlenCards } from './tienlenPlay'

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

describe('suggestWith — chạm lá tự chọn bộ chặn', () => {
  it('chặn đôi: lấy lá chạm + lá cùng hạng nhỏ nhất đủ chặn', () => {
    expect(suggestWith(cs('7♠ 9♣ 9♥ 9♦ K♠'), cs('8♠ 8♥'), c('9♥'))).toEqual(cs('9♣ 9♥'))
    expect(suggestWith(cs('7♠ 9♣ K♠'), cs('8♠ 8♥'), c('9♣'))).toBeNull()
  })
  it('chặn sảnh 3 lá: sảnh nhỏ nhất có lá chạm', () => {
    expect(suggestWith(cs('4♠ 5♣ 6♦ 7♥ 8♠'), cs('3♠ 4♥ 5♥'), c('7♥'))).toEqual(cs('5♣ 6♦ 7♥'))
  })
  it('chặn sảnh cùng lá cao nhất: chọn lá chất to hơn', () => {
    expect(suggestWith(cs('3♣ 4♣ 5♠ 5♥'), cs('3♠ 4♠ 5♦'), c('4♣'))).toEqual(cs('3♣ 4♣ 5♥'))
  })
  it('heo: tứ quý chặt', () => {
    expect(suggestWith(cs('6♠ 6♣ 6♦ 6♥ 9♠'), cs('2♠'), c('6♦'))).toEqual(cs('6♠ 6♣ 6♦ 6♥'))
  })
  it('vòng mới: không gợi ý', () => {
    expect(suggestWith(cs('6♠ 6♣'), null, c('6♠'))).toBeNull()
  })
})

describe('autoMove — hết giờ', () => {
  it('đang phải chặn thì bỏ lượt; vòng mới thì đánh lá nhỏ nhất', () => {
    const s: TienlenCards = { hands: { a: cs('3♠ 5♥'), b: cs('4♠ 9♥') }, order: ['a', 'b'], turn: 'a', table: null, passed: [], finished: [] }
    const s1 = ok(autoMove(s, 'a'))
    expect(s1.table?.cards).toEqual(cs('3♠'))
    expect(s1.step).toBe(1)
    const s2 = ok(autoMove(s1, 'b'))
    // b bỏ lượt → hết vòng, a đi vòng mới
    expect(s2.table).toBeNull()
    expect(s2.turn).toBe('a')
    expect(s2.step).toBe(2)
  })
})
