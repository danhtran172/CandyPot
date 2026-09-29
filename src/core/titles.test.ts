import { describe, expect, it } from 'vitest'
import { titles } from './titles'
import type { Round, Session, Tag, Transfer } from './types'

let clock = 0
function round(transfers: [string, string, number][], participants: string[], tags: Tag[] = []): Round {
  return {
    id: `r${clock}`,
    at: clock++,
    kind: 'play',
    status: 'closed',
    participants,
    bet: 1,
    stakes: {},
    dealer: null,
    moves: [],
    transfers: transfers.map(([from, to, amount]): Transfer => ({ from, to, amount, reason: '' })),
    tags,
  }
}

function session(rounds: Round[]): Session {
  return {
    id: 's',
    name: '',
    createdAt: 0,
    updatedAt: 0,
    requests: [],
    undos: [],
    hostVotes: {},
    hostId: null,
    players: ['a', 'b', 'c'].map((id) => ({ id, name: id, emoji: '', active: true })),
    games: [{ id: 'g', type: 'tienlen', name: '', rounds }],
  }
}

const byKey = (s: Session) => Object.fromEntries(titles(s).map((t) => [t.key, t]))

describe('titles', () => {
  it('buổi trống: không có danh hiệu', () => {
    expect(titles(session([]))).toEqual([])
  })

  it('Vua kẹo / Thánh lỗ, đồng hạng hiện tất cả', () => {
    const t = byKey(session([round([['c', 'a', 5], ['c', 'b', 5]], ['a', 'b', 'c'])]))
    expect(t['vua-keo']).toMatchObject({ playerIds: ['a', 'b'], value: 5 })
    expect(t['thanh-lo']).toMatchObject({ playerIds: ['c'], value: -10 })
  })

  it('Nóng tay: chuỗi ≥ 3 ván thắng liên tiếp, bỏ qua ván không tham gia', () => {
    const rs = [
      round([['b', 'a', 1]], ['a', 'b']),
      round([['c', 'b', 1]], ['b', 'c']),
      round([['b', 'a', 1]], ['a', 'b']),
      round([['c', 'a', 1]], ['a', 'c']),
    ]
    expect(byKey(session(rs))['nong-tay']).toMatchObject({ playerIds: ['a'], value: 3 })
    expect(byKey(session(rs.slice(0, 3)))['nong-tay']).toBeUndefined()
  })

  it('bỏ qua ván đang mở', () => {
    const r = round([['c', 'a', 50]], ['a', 'c'])
    r.status = 'open'
    expect(titles(session([r]))).toEqual([])
  })

  it('Cái số đỏ / Cái số đen tính riêng các ván làm cái', () => {
    const cai = (id: string): Tag[] => [{ type: 'lam-cai', playerId: id }]
    const rs = [
      round([['b', 'a', 4]], ['a', 'b'], cai('a')),
      round([['b', 'c', 3]], ['b', 'c'], cai('b')),
      round([['c', 'a', 100]], ['a', 'c']), // không làm cái → không tính
    ]
    const t = byKey(session(rs))
    expect(t['cai-do']).toMatchObject({ playerIds: ['a'], value: 4 })
    expect(t['cai-den']).toMatchObject({ playerIds: ['b'], value: -3 })
  })

  it('Bất động: cần ≥ 5 ván, lấy |lời/lỗ| nhỏ nhất (kể cả 0)', () => {
    const rs = [
      round([['a', 'b', 1]], ['a', 'b', 'c']),
      round([['b', 'a', 1]], ['a', 'b', 'c']),
      round([['c', 'a', 2]], ['a', 'b', 'c']),
      round([['a', 'c', 2]], ['a', 'b', 'c']),
      round([['c', 'b', 3]], ['a', 'b']),
    ]
    expect(byKey(session(rs))['bat-dong']).toMatchObject({ playerIds: ['a'], value: 0 })
    expect(byKey(session(rs.slice(0, 4)))['bat-dong']).toBeUndefined()
  })
})
