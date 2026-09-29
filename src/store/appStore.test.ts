import { beforeEach, describe, expect, it } from 'vitest'
import { handOf, netOf } from '../core/ledger'
import type { TienLenInput } from '../core/games/tienlen'
import { LocalRepo, MemoryKV } from '../storage/LocalRepo'
import { createAppStore, type AppStore } from './appStore'

let repo: LocalRepo
let store: AppStore
let ids: string[]

function tl(ranking: string[]): TienLenInput {
  return { players: ranking, ranking, chay: [], toiTrang: null, thoi: [], chops: [] }
}

beforeEach(() => {
  repo = new LocalRepo(new MemoryKV())
  store = createAppStore(repo)
  store.getState().createSession('Tối thứ 7', [
    { name: 'An', emoji: '🐱' },
    { name: 'Bình', emoji: '🐶' },
  ], 50)
  ids = store.getState().session!.players.map((p) => p.id)
})

describe('appStore', () => {
  it('tạo buổi và lưu vào repo', () => {
    const s = store.getState().session!
    expect(repo.list()).toEqual([{ id: s.id, name: 'Tối thứ 7', updatedAt: s.updatedAt, playerCount: 2 }])
  })

  it('thêm game đặt tên tự động và dùng config mặc định', () => {
    const { addGame } = store.getState()
    addGame('tienlen')
    addGame('tienlen')
    expect(store.getState().session!.games.map((g) => g.name)).toEqual(['Tiến lên', 'Tiến lên 2'])
  })

  it('lưu ván hợp lệ sinh giao dịch và lưu lại', () => {
    const [a, b] = ids
    const g = store.getState().addGame('tienlen')
    expect(store.getState().saveRound(g, { participants: [a, b], bet: 3, input: tl([a, b]) })).toEqual([])
    const s = store.getState().session!
    expect(netOf(s)).toEqual({ [a]: 3, [b]: -3 })
    expect(repo.load(s.id)!.games[0].rounds).toHaveLength(1)
  })

  it('ván không hợp lệ trả lỗi và không lưu', () => {
    const [a, b] = ids
    const g = store.getState().addGame('tienlen')
    expect(store.getState().saveRound(g, { participants: [a, b], bet: 3, input: tl([a]) })).not.toEqual([])
    expect(store.getState().saveRound(g, { participants: [a, b], bet: 0, input: tl([a, b]) })).not.toEqual([])
    expect(store.getState().session!.games[0].rounds).toHaveLength(0)
  })

  it('sửa ván tính lại, giữ id và thời gian', () => {
    const [a, b] = ids
    const g = store.getState().addGame('tienlen')
    store.getState().saveRound(g, { participants: [a, b], bet: 1, input: tl([a, b]) })
    const before = store.getState().session!.games[0].rounds[0]
    store.getState().saveRound(g, { participants: [a, b], bet: 2, input: tl([b, a]) }, before.id)
    const after = store.getState().session!.games[0].rounds
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ id: before.id, at: before.at, bet: 2 })
    expect(netOf(store.getState().session!)).toEqual({ [a]: -2, [b]: 2 })
  })

  it('xóa ván', () => {
    const [a, b] = ids
    const g = store.getState().addGame('tienlen')
    store.getState().saveRound(g, { participants: [a, b], bet: 1, input: tl([a, b]) })
    const r = store.getState().session!.games[0].rounds[0]
    store.getState().deleteRound(g, r.id)
    expect(netOf(store.getState().session!)).toEqual({ [a]: 0, [b]: 0 })
  })

  it('chuyển tay', () => {
    const [a, b] = ids
    const g = store.getState().addGame('xidach')
    expect(store.getState().saveManual(g, { from: a, to: b, amount: 7, note: '' })).toEqual([])
    expect(store.getState().saveManual(g, { from: a, to: a, amount: 7, note: '' })).not.toEqual([])
    expect(netOf(store.getState().session!)).toEqual({ [a]: -7, [b]: 7 })
  })

  it('renew tăng kẹo trên tay, không đổi lời/lỗ', () => {
    const [a] = ids
    store.getState().renew(a)
    const s = store.getState().session!
    expect(handOf(s, a)).toBe(100)
    expect(netOf(s)[a]).toBe(0)
    store.getState().undoRenew(s.renews[0].id)
    expect(handOf(store.getState().session!, a)).toBe(50)
  })

  it('không xóa được người đã chơi, chỉ tắt', () => {
    const [a, b] = ids
    const g = store.getState().addGame('tienlen')
    store.getState().saveRound(g, { participants: [a, b], bet: 1, input: tl([a, b]) })
    expect(store.getState().removePlayer(a)).toBe(false)
    store.getState().addPlayer('Cường', '🐸')
    const c = store.getState().session!.players[2].id
    expect(store.getState().removePlayer(c)).toBe(true)
  })

  it('mở lại buổi từ repo', () => {
    const id = store.getState().session!.id
    const fresh = createAppStore(repo)
    expect(fresh.getState().openSession(id)).toBe(true)
    expect(fresh.getState().session!.name).toBe('Tối thứ 7')
  })

  it('preset luật nhà', () => {
    store.getState().savePreset('Nhà An', 'tienlen', { pay4Bet: 5 })
    expect(store.getState().presets()).toMatchObject([{ name: 'Nhà An', gameType: 'tienlen', config: { pay4Bet: 5 } }])
  })
})
