import { describe, expect, it } from 'vitest'
import type { Card } from './tienlenPlay'
import { check, checkAll, compare, dealXidach, draw, newPayouts, score, stand, type XidachCards } from './xidachPlay'

const R = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const S = ['♠', '♣', '♦', '♥']
const c = (s: string): Card => R.indexOf(s.slice(0, -1)) * 4 + S.indexOf(s.slice(-1))
const cs = (s: string) => s.split(' ').map(c)
const ok = (r: XidachCards | string) => {
  if (typeof r === 'string') throw new Error(r)
  return r
}
/** Bộ bài để chia: lá rút trước nằm cuối mảng. `deal` = thứ tự lá được chia ra / rút. */
const deckOf = (deal: string) => cs(deal).reverse()

describe('xidach — tính điểm', () => {
  it('xì bàn, xì dách, ngũ linh, quắc, A linh hoạt', () => {
    expect(score(cs('A♠ A♥')).kind).toBe('xiban')
    expect(score(cs('A♠ K♥')).kind).toBe('xidach')
    expect(score(cs('2♠ 3♥ 4♦ 5♣ 6♠'))).toEqual({ kind: 'ngulinh', points: 20 })
    expect(score(cs('K♠ Q♥ 5♦')).kind).toBe('quac')
    expect(score(cs('A♠ 7♥'))).toEqual({ kind: 'points', points: 18 })
    expect(score(cs('A♠ 7♥ 9♦'))).toEqual({ kind: 'points', points: 17 })
  })
  it('so bài: điểm, non, quắc, đặc biệt nhân cược', () => {
    expect(compare(cs('10♠ 9♥'), cs('10♦ 7♣'))).toMatchObject({ outcome: 'win', mult: 1 })
    expect(compare(cs('10♠ 5♥'), cs('10♦ 7♣'))).toMatchObject({ outcome: 'lose', note: 'Non' })
    expect(compare(cs('10♠ 5♥ K♦'), cs('10♦ 6♣ K♣'))).toMatchObject({ outcome: 'draw' })
    expect(compare(cs('10♠ 8♥'), cs('10♦ 6♣ K♣'))).toMatchObject({ outcome: 'win', note: 'Cái quắc' })
    expect(compare(cs('A♠ K♥'), cs('10♦ 9♣'))).toMatchObject({ outcome: 'win', mult: 2 })
    expect(compare(cs('10♠ 9♥'), cs('A♦ A♣'))).toMatchObject({ outcome: 'lose', mult: 3 })
    expect(compare(cs('9♠ 9♥'), cs('9♦ 9♣'))).toMatchObject({ outcome: 'draw' })
  })
})

describe('xidach — thứ tự lượt', () => {
  it('các con đi theo vòng quanh bàn, bắt đầu từ người ngồi ngay sau cái', () => {
    expect(dealXidach(['a', 'b', 'D', 'c', 'd'], 'D').order).toEqual(['c', 'd', 'a', 'b'])
    expect(dealXidach(['D', 'a', 'b'], 'D').order).toEqual(['a', 'b'])
  })
})

describe('xidach — một ván', () => {
  it('con rút / dằn lần lượt, cái xét từng người rồi xét tất, tự tính kẹo', () => {
    // Chia: a, b, cái (D) — vòng 1 rồi vòng 2
    let s = dealXidach(['a', 'b', 'D'], 'D', deckOf('10♠ 9♠ 10♦ 6♥ 8♣ 7♦ 5♣ K♥ 3♠'))
    expect(s.hands).toEqual({ a: cs('10♠ 6♥'), b: cs('9♠ 8♣'), D: cs('10♦ 7♦') })
    expect(s.turn).toBe('a')
    expect(typeof check(s, 'D', 'a')).toBe('string')
    s = ok(draw(s, 'a')) // a: 10 6 5 = 21
    s = ok(stand(s, 'a'))
    expect(s.turn).toBe('b')
    s = ok(stand(s, 'b')) // b: 17
    expect(s.turn).toBe('D')
    const before = s
    s = ok(check(s, 'D', 'b')) // cái 17 vs b 17 → hòa
    expect(s.settled.b.outcome).toBe('draw')
    expect(s.dealerShown).toBe(true)
    s = ok(checkAll(s, 'D')) // a 21 thắng
    expect(s.settled.a).toMatchObject({ outcome: 'win', mult: 1 })
    expect(s.turn).toBeNull()
    expect(newPayouts(before, s, { a: 2, b: 3 })).toEqual([{ from: 'D', to: 'a', amount: 2, label: 'Bài: 21 vs 17' }])
  })
  it('cái chưa đủ 15 không xét lẻ được; rút quắc thì tự xét tất', () => {
    let s = dealXidach(['a', 'D'], 'D', deckOf('10♠ 10♦ 9♠ 3♦ K♥'))
    s = ok(stand(s, 'a')) // a 19
    expect(typeof check(s, 'D', 'a')).toBe('string') // cái 13
    s = ok(draw(s, 'D')) // 13 + 10 = quắc
    expect(s.turn).toBeNull()
    expect(s.settled.a).toMatchObject({ outcome: 'win', note: 'Cái quắc' })
  })
  it('vừa chia: con xì dách ăn luôn; cái xì dách xét cả bàn', () => {
    const s1 = dealXidach(['a', 'b', 'D'], 'D', deckOf('A♠ 9♠ 10♦ K♥ 8♣ 7♦'))
    expect(s1.settled.a).toMatchObject({ outcome: 'win', mult: 2 })
    expect(s1.turn).toBe('b')
    const s2 = dealXidach(['a', 'b', 'D'], 'D', deckOf('9♠ 9♦ A♦ K♥ 8♣ Q♦'))
    expect(s2.turn).toBeNull()
    expect(s2.dealerShown).toBe(true)
    expect(s2.settled.a).toMatchObject({ outcome: 'lose', mult: 2 })
  })
})

describe('xidach — xì dách vừa chia khi cái còn non', () => {
  it('ghi là Xì dách ×2, không phải "Cái non"', () => {
    expect(compare(cs('A♣ 10♦'), cs('5♠ 9♣'))).toMatchObject({ outcome: 'win', mult: 2, note: 'Xì dách' })
  })
})
