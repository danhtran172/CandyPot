import { describe, expect, it } from 'vitest'
import { lockWarnings } from './lockCheck'
import { POT, type Game, type Round, type Session } from './types'

const players = [
  { id: 'a', name: 'An', emoji: '', active: true },
  { id: 'b', name: 'Bình', emoji: '', active: true },
  { id: 'c', name: 'Chi', emoji: '', active: false },
  { id: 'd', name: 'Dũng', emoji: '', active: true, removed: true },
]
const session = { players } as unknown as Session
const round = (patch: Partial<Round>): Round =>
  ({ id: 'r', at: 0, kind: 'play', status: 'open', participants: ['a', 'b', 'c'], bet: 5, stakes: {}, dealer: null, moves: [], ...patch }) as Round

describe('lockWarnings — cảnh báo khi chốt', () => {
  it('Lô tô / Tự do: người đang chơi chưa mua, người đang nghỉ đã mua (bỏ qua người đã xóa)', () => {
    const r = round({ moves: [{ id: 'm1', from: 'a', to: POT, amount: 5, label: '' }, { id: 'm2', from: 'c', to: POT, amount: 5, label: '' }] })
    expect(lockWarnings(session, { type: 'loto' } as Game, r)).toEqual({ missing: ['b'], resting: ['c'] })
  })

  it('Xì dách: nhà cái không cần bet', () => {
    const r = round({ dealer: 'a', stakes: { c: 2 } })
    expect(lockWarnings(session, { type: 'xidach' } as Game, r)).toEqual({ missing: ['b'], resting: ['c'] })
  })

  it('đủ cả thì không cảnh báo', () => {
    const r = round({ dealer: 'a', stakes: { b: 3 } })
    expect(lockWarnings(session, { type: 'xidach' } as Game, r)).toEqual({ missing: [], resting: [] })
  })
})
