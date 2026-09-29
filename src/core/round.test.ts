import { describe, expect, it } from 'vitest'
import { netOfTransfers } from './ledger'
import { closeTransfers, contributions, movesNet, normalizeSession, potOf } from './round'
import { POT, type Move, type Round, type Session } from './types'

let n = 0
const mv = (from: string, to: string, amount: number, label = ''): Move => ({ id: `m${n++}`, from, to, amount, label })

function round(moves: Move[], status: Round['status'] = 'open'): Round {
  return { id: 'r', at: 0, kind: 'play', status, participants: [], bet: 1, stakes: {}, dealer: null, moves, transfers: [], tags: [] }
}

describe('round', () => {
  it('movesNet bỏ qua pot', () => {
    expect(movesNet([mv('a', POT, 5), mv(POT, 'b', 5), mv('c', 'a', 2)])).toEqual({ a: -3, b: 5, c: -2 })
  })

  it('potOf và contributions', () => {
    const r = round([mv('a', POT, 5), mv('b', POT, 10), mv('a', POT, 5), mv(POT, 'b', 8)])
    expect(potOf(r)).toBe(12)
    expect(contributions(r)).toEqual({ a: 10, b: 10 })
  })

  it('chốt ván không có pot: mỗi lần kéo là một giao dịch', () => {
    const t = closeTransfers(round([mv('b', 'a', 4, 'Bét→Nhất'), mv('c', 'a', 2, 'Thối')]))
    expect(t).toEqual([
      { from: 'b', to: 'a', amount: 4, reason: 'Bét→Nhất' },
      { from: 'c', to: 'a', amount: 2, reason: 'Thối' },
    ])
  })

  it('chốt ván có pot: gộp thành ít lượt trả nhất', () => {
    const r = round([mv('a', POT, 10), mv('b', POT, 10), mv('c', POT, 10), mv(POT, 'a', 30)])
    const t = closeTransfers(r)
    expect(netOfTransfers(t)).toEqual({ a: 20, b: -10, c: -10 })
    expect(t).toHaveLength(2)
  })

  it('không chốt được khi pot còn kẹo', () => {
    expect(() => closeTransfers(round([mv('a', POT, 10)]))).toThrow(/Pot còn 10/)
  })

  it('normalizeSession chuyển dữ liệu cũ sang dạng mới', () => {
    const legacy = {
      games: [
        {
          rounds: [
            {
              id: 'old',
              transfers: [{ from: 'a', to: 'b', amount: 2, reason: 'Bét trả Nhất' }],
              tags: [
                { type: 'thoi', playerId: 'a' },
                { type: 'lam-cai', playerId: 'b' },
              ],
            },
          ],
        },
      ],
    } as unknown as Session
    const r = normalizeSession(legacy).games[0].rounds[0]
    expect(r).toMatchObject({ status: 'closed', stakes: {}, dealer: null, tags: [{ type: 'lam-cai', playerId: 'b' }] })
    expect(r.moves).toEqual([{ id: 'old-0', from: 'a', to: 'b', amount: 2, label: 'Bét trả Nhất' }])
  })

  it('normalizeSession giữ kiểu bàn, mã bàn và game đang chơi', () => {
    const s = { players: [], games: [], mode: 'multi', code: '12345', currentGameId: 'g1' } as unknown as Session
    expect(normalizeSession(s)).toMatchObject({ mode: 'multi', code: '12345', currentGameId: 'g1' })
  })
})
