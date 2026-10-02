import { describe, expect, it } from 'vitest'
import type { Round } from '../core/types'
import { musicMood } from './musicMood'

const base = {
  id: 'r',
  kind: 'play',
  at: 0,
  status: 'open',
  participants: [],
  bet: 1,
  stakes: {},
  dealer: null,
  moves: [],
  transfers: [],
  tags: [],
}
const round = (x: object) => ({ ...base, ...x }) as unknown as Round
const hand = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('musicMood — nhạc êm / kịch tính', () => {
  it('Tiến lên: có người còn ≤ 2 lá (chưa ai về) hoặc còn 2 người cuối', () => {
    const tl = (hands: number[], finished: string[] = []) => ({
      tienlen: {
        order: ['a', 'b', 'c', 'd'],
        hands: Object.fromEntries(['a', 'b', 'c', 'd'].map((id, i) => [id, hand(hands[i])])),
        turn: 'a',
        table: null,
        passed: [],
        finished,
      },
    })
    expect(musicMood(round(tl([13, 13, 13, 13])))).toBe('calm')
    expect(musicMood(round(tl([5, 2, 9, 9])))).toBe('tense')
    expect(musicMood(round(tl([0, 2, 9, 9], ['a'])))).toBe('calm')
    expect(musicMood(round(tl([0, 0, 9, 9], ['a', 'b'])))).toBe('tense')
  })

  it('Xì dách: tới lượt cái xét', () => {
    const xd = (turn: string | null) => ({
      xidach: { dealer: 'd', turn, order: ['a'], hands: {}, deck: [], stood: [], settled: {}, dealerShown: false, step: 1 },
    })
    expect(musicMood(round(xd('a')))).toBe('calm')
    expect(musicMood(round(xd('d')))).toBe('tense')
    expect(musicMood(round(xd(null)))).toBe('calm')
  })

  it('Lô tô: hơn 5 người đợi', () => {
    const lo = (n: number) => ({ loto: { sheets: {}, caller: null, called: [], waiting: hand(n).map(String) } })
    expect(musicMood(round(lo(5)))).toBe('calm')
    expect(musicMood(round(lo(6)))).toBe('tense')
  })

  it('không có ván / ván đã chốt → nhạc êm', () => {
    expect(musicMood(undefined)).toBe('calm')
    expect(musicMood(round({ status: 'closed', xidach: { dealer: 'd', turn: 'd' } }))).toBe('calm')
  })
})
