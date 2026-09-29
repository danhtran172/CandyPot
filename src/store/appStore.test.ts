import { beforeEach, describe, expect, it } from 'vitest'
import { netOf } from '../core/ledger'
import { openRound } from '../core/round'
import { POT } from '../core/types'
import { LocalRepo, MemoryKV } from '../storage/LocalRepo'
import { createAppStore, type AppStore } from './appStore'

let repo: LocalRepo
let store: AppStore
let a: string, b: string, c: string

const s = () => store.getState()
const session = () => s().session!

beforeEach(() => {
  repo = new LocalRepo(new MemoryKV())
  store = createAppStore(repo)
  s().createSession('Tối thứ 7', [
    { name: 'An', emoji: '🐱' },
    { name: 'Bình', emoji: '🐶' },
    { name: 'Cường', emoji: '🐸' },
  ])
  ;[a, b, c] = session().players.map((p) => p.id)
})

describe('appStore — buổi & người chơi', () => {
  it('tạo buổi và lưu vào repo', () => {
    expect(repo.list()).toEqual([{ id: session().id, name: 'Tối thứ 7', updatedAt: session().updatedAt, playerCount: 3 }])
  })

  it('thêm game đặt tên tự động', () => {
    s().addGame('tienlen')
    s().addGame('tienlen')
    expect(session().games.map((g) => g.name)).toEqual(['Tiến lên', 'Tiến lên 2'])
  })

  it('xóa người: chưa chơi thì xóa hẳn; đã chơi thì ẩn, giữ lời/lỗ; thêm lại tên cũ thì quay về', () => {
    const g = s().addGame('tienlen')
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    expect(s().removePlayer(b)).toEqual(['Bình đang trong ván chưa kết thúc — kết thúc hoặc hủy ván đó trước.'])
    expect(s().removePlayer(a)).toEqual(['An đang là host — chuyển host cho người khác trước.'])
    expect(s().removePlayer(c)).toEqual([])
    expect(session().players.map((p) => p.id)).toEqual([a, b])
    s().addMove(g, b, a, 2, '')
    s().closeRound(g)
    expect(s().removePlayer(b)).toEqual([])
    const bp = session().players.find((p) => p.id === b)!
    expect([bp.removed, bp.active]).toEqual([true, false])
    expect(netOf(session())[b]).toBe(-2)
    s().addPlayer('bình', '🐶')
    expect(session().players.find((p) => p.id === b)).toMatchObject({ removed: false, active: true })
    expect(session().players).toHaveLength(2)
  })

  it('mở lại buổi từ repo', () => {
    const fresh = createAppStore(repo)
    expect(fresh.getState().openSession(session().id)).toBe(true)
    expect(fresh.getState().session!.name).toBe('Tối thứ 7')
  })
})

describe('appStore — ván Tiến lên', () => {
  it('mở ván → kéo → chốt', () => {
    const g = s().addGame('tienlen')
    expect(s().openRound(g, { participants: [a, b, c], bet: 5, bet2: 1, stakes: {}, dealer: null })).toEqual([])
    expect(s().addMove(g, c, a, 10, 'Bét→Nhất')).toEqual([])
    expect(netOf(session())[a]).toBe(0) // chưa chốt
    expect(s().closeRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 10, [b]: 0, [c]: -10 })
    expect(openRound(session(), g)).toBeUndefined()
  })

  it('validate khi mở ván', () => {
    const g = s().addGame('tienlen')
    expect(s().openRound(g, { participants: [a], bet: 5, bet2: 1, stakes: {}, dealer: null })).not.toEqual([])
    expect(s().openRound(g, { participants: [a, b], bet: 0, bet2: 1, stakes: {}, dealer: null })).not.toEqual([])
    expect(s().openRound(g, { participants: [a, b], bet: 4, stakes: {}, dealer: null })).not.toEqual([])
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    expect(s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })).toEqual([
      'Game này đang có ván chưa chốt.',
    ])
  })

  it('chỉ kéo giữa người trong ván, hoàn tác được', () => {
    const g = s().addGame('tienlen')
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    expect(s().addMove(g, c, a, 1, '')).not.toEqual([])
    s().addMove(g, b, a, 2, '')
    const r = openRound(session(), g)!
    s().removeMove(g, r.id, r.moves[0].id)
    expect(openRound(session(), g)!.moves).toEqual([])
  })

  it('mở lại ván đã chốt để sửa', () => {
    const g = s().addGame('tienlen')
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    s().addMove(g, b, a, 2, '')
    s().closeRound(g)
    const r = session().games[0].rounds[0]
    expect(s().reopenRound(g, r.id)).toEqual([])
    expect(netOf(session())[a]).toBe(0)
    s().addMove(g, b, a, 1, '')
    s().closeRound(g)
    expect(netOf(session())[a]).toBe(3)
  })
})

describe('appStore — Xì dách', () => {
  it('đặt cược → chốt → trả kẹo → ván mới giữ cược cũ, gắn tag làm cái', () => {
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 10 }, dealer: a })
    expect(openRound(session(), g)!.phase).toBe('betting')
    expect(s().addMove(g, b, a, 10, '')).toEqual(['Đang đặt cược — bấm Chốt cược rồi mới trả kẹo.'])
    expect(s().lockBets(g)).toEqual([])
    expect(s().setStake(g, b, 20)).toEqual(['Đã chốt cược — bấm Kết thúc để sang ván mới rồi cược lại.'])
    expect(s().setDealer(g, b)).not.toEqual([])
    expect(s().addMove(g, b, a, 10, '')).toEqual([])
    expect(s().nextRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 10, [b]: -10, [c]: 0 })
    expect(openRound(session(), g)).toMatchObject({ phase: 'betting', dealer: a, stakes: { [b]: 5, [c]: 10 } })
  })

  it('bỏ chốt cược: được khi chưa trả kẹo, bị chặn khi đã có lượt', () => {
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [a, b], bet: 1, stakes: { [b]: 5 }, dealer: a })
    s().lockBets(g)
    expect(s().unlockBets(g)).toEqual([])
    expect(openRound(session(), g)!.phase).toBe('betting')
    s().setStake(g, b, 8)
    s().lockBets(g)
    s().addMove(g, b, a, 8, '')
    expect(s().unlockBets(g)).toEqual(['Ván đã có lượt trả kẹo — hoàn tác hết rồi mới bỏ chốt được.'])
    expect(openRound(session(), g)!.phase).toBe('playing')
  })

  it('chốt ván Xì dách gắn tag làm cái', () => {
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 10 }, dealer: a })
    s().lockBets(g)
    s().addMove(g, b, a, 10, '')
    s().closeRound(g)
    expect(netOf(session())).toEqual({ [a]: 10, [b]: -10, [c]: 0 })
    expect(session().games[0].rounds[0].tags).toEqual([{ type: 'lam-cai', playerId: a }])
  })

  it('đặt cược qua ô Bet: đổi cược của con, cái không đặt được, ván sau gợi ý lại mức cũ', () => {
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 5 }, dealer: a })
    expect(s().setStake(g, b, 20)).toEqual([])
    expect(s().setStake(g, a, 20)).toEqual(['Nhà cái không đặt cược.'])
    expect(s().setStake(g, b, 0)).not.toEqual([])
    expect(openRound(session(), g)!.stakes).toEqual({ [b]: 20, [c]: 5 })
    s().closeRound(g)
    expect(s().setStake(g, b, 5)).toEqual(['Chưa có ván nào đang mở.'])
  })

  it('mở nhanh lấy lại người chơi, cái và cược của ván trước; đổi cái chuyển cược', () => {
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 8 }, dealer: a })
    s().closeRound(g)
    expect(s().quickOpen(g)).toEqual([])
    expect(openRound(session(), g)).toMatchObject({ dealer: a, participants: [a, b, c], stakes: { [b]: 5, [c]: 8 } })
    expect(s().setDealer(g, b)).toEqual([])
    expect(openRound(session(), g)).toMatchObject({ dealer: b, stakes: { [a]: 5, [c]: 8 } })
  })

  it('cần cái và cược của mọi con', () => {
    const g = s().addGame('xidach')
    expect(s().openRound(g, { participants: [a, b], bet: 1, stakes: { [b]: 5 }, dealer: null })).not.toEqual([])
    expect(s().openRound(g, { participants: [a, b], bet: 1, stakes: {}, dealer: a })).not.toEqual([])
  })
})

describe('appStore — Poker', () => {
  it('cược mở ván vào pot, chia pot rồi mới chốt được', () => {
    const g = s().addGame('poker')
    s().openRound(g, { participants: [a, b, c], bet: 2, stakes: { [a]: 2, [b]: 2, [c]: 0 }, dealer: null })
    s().addMove(g, c, POT, 2, 'Theo')
    expect(s().closeRound(g)).toEqual(['Pot còn 6 kẹo — kéo pot cho người thắng trước khi chốt.'])
    s().addMove(g, POT, b, 6, 'Cả pot')
    expect(s().closeRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: -2, [b]: 4, [c]: -2 })
  })
})

describe('appStore — kéo khi không có ván', () => {
  it('ghi thành chuyển tay', () => {
    const g = s().addGame('tienlen')
    expect(s().addMove(g, a, b, 7, '')).toEqual([])
    expect(s().addMove(g, a, POT, 7, '')).not.toEqual([])
    expect(netOf(session())).toEqual({ [a]: -7, [b]: 7, [c]: 0 })
    expect(session().games[0].rounds[0]).toMatchObject({ kind: 'manual', status: 'closed' })
  })
})


describe('appStore — đòi kẹo', () => {
  it('đòi kẹo chờ người bị đòi bấm OK rồi mới chuyển', () => {
    const g = s().addGame('xidach')
    expect(s().requestCandy(g, b, a, 5)).toEqual([])
    expect(session().requests).toMatchObject([{ from: b, to: a, amount: 5 }])
    expect(netOf(session())[a]).toBe(0)
    expect(s().answerRequest(session().requests[0].id, true)).toEqual([])
    expect(session().requests).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 5, [b]: -5, [c]: 0 })
  })

  it('từ chối hoặc hủy thì không chuyển', () => {
    const g = s().addGame('xidach')
    s().requestCandy(g, b, a, 5)
    s().answerRequest(session().requests[0].id, false)
    s().requestCandy(g, c, a, 3)
    s().cancelRequest(session().requests[0].id)
    expect(session().requests).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 0, [b]: 0, [c]: 0 })
  })

  it('có ván đang mở thì kẹo đòi được ghi vào ván', () => {
    const g = s().addGame('tienlen')
    s().openRound(g, { participants: [a, b], bet: 4, bet2: 2, stakes: {}, dealer: null })
    s().requestCandy(g, b, a, 4)
    s().answerRequest(session().requests[0].id, true)
    expect(openRound(session(), g)!.moves).toMatchObject([{ from: b, to: a, amount: 4, label: 'Đòi kẹo' }])
  })

  it('không đòi được pot hoặc số kẹo sai; xóa game thì xóa lời đòi', () => {
    const g = s().addGame('xidach')
    expect(s().requestCandy(g, POT, a, 5)).not.toEqual([])
    expect(s().requestCandy(g, b, a, 0)).not.toEqual([])
    s().requestCandy(g, b, a, 5)
    s().removeGame(g)
    expect(session().requests).toEqual([])
  })
})

describe('appStore — hoàn tác cần host', () => {
  it('host mặc định là người đầu tiên, đổi được', () => {
    expect(session().hostId).toBe(a)
    s().setHost(b)
    expect(session().hostId).toBe(b)
  })

  it('xin hoàn tác → host OK → bỏ lượt và tính lại ván đã kết thúc', () => {
    const g = s().addGame('tienlen')
    s().openRound(g, { participants: [a, b, c], bet: 4, bet2: 2, stakes: {}, dealer: null })
    s().addMove(g, c, a, 4, '')
    s().addMove(g, b, a, 2, '')
    s().closeRound(g)
    const r = session().games[0].rounds[0]
    expect(s().requestUndo(g, r.id, r.moves[1].id, b)).toEqual([])
    expect(s().requestUndo(g, r.id, r.moves[1].id, b)).toEqual(['Lượt này đang chờ host xác nhận.'])
    expect(netOf(session())[a]).toBe(6)
    expect(s().answerUndo(session().undos[0].id, true)).toEqual([])
    expect(session().undos).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 4, [b]: 0, [c]: -4 })
  })

  it('host từ chối thì giữ nguyên; hoàn tác chuyển tay cuối cùng thì xóa luôn lượt', () => {
    const g = s().addGame('xidach')
    s().addMove(g, a, b, 3, '')
    const r = session().games[0].rounds[0]
    s().requestUndo(g, r.id, r.moves[0].id, b)
    s().answerUndo(session().undos[0].id, false)
    expect(netOf(session())[b]).toBe(3)
    expect(s().undoMove(g, r.id, r.moves[0].id)).toEqual([])
    expect(session().games[0].rounds).toEqual([])
  })

  it('không hoàn tác được lượt pot làm lệch ván Poker đã kết thúc', () => {
    const g = s().addGame('poker')
    s().openRound(g, { participants: [a, b], bet: 2, stakes: { [a]: 2, [b]: 2 }, dealer: null })
    s().addMove(g, POT, a, 4, '')
    s().closeRound(g)
    const r = session().games[0].rounds[0]
    const win = r.moves.find((m) => m.from === POT)!
    expect(s().undoMove(g, r.id, win.id)[0]).toMatch(/Không hoàn tác được/)
  })
})

describe('appStore — Tiến lên: host đặt mức cược ở ô Bet', () => {
  it('chưa mở ván: lưu cho ván sau; đang mở: đổi luôn ván đó', () => {
    const g = s().addGame('tienlen')
    expect(s().setTienlenBets(g, 6, 3)).toEqual([])
    expect(s().quickOpen(g)).toEqual([])
    const open = () => openRound(session(), g)!
    expect([open().bet, open().bet2]).toEqual([6, 3])
    expect(s().setTienlenBets(g, 10, 4)).toEqual([])
    expect([open().bet, open().bet2]).toEqual([10, 4])
    s().closeRound(g)
    s().quickOpen(g)
    expect([open().bet, open().bet2]).toEqual([10, 4])
  })

  it('từ chối số không hợp lệ và Nhì lớn hơn Nhất', () => {
    const g = s().addGame('tienlen')
    expect(s().setTienlenBets(g, 0, 1)).toEqual(['Mức cược phải là số nguyên lớn hơn 0.'])
    expect(s().setTienlenBets(g, 2, 4)).toEqual(['Cược Nhì không được lớn hơn cược Nhất.'])
  })
})

describe('appStore — bầu host', () => {
  it('đủ 2 phiếu thì thành host; phiếu bầu được xóa', () => {
    s().addPlayer('Dũng', '🦊')
    s().addPlayer('Em', '🐯')
    const d = session().players[3].id
    expect(session().hostId).toBe(a)
    expect(s().voteHost(b, c)).toEqual({ errors: [], elected: false })
    expect(session().hostVotes).toEqual({ [b]: c })
    expect(s().voteHost(d, c)).toEqual({ errors: [], elected: true })
    expect(session().hostId).toBe(c)
    expect(session().hostVotes).toEqual({})
  })

  it('bấm lại để rút phiếu; đổi phiếu sang người khác; người nghỉ không tính', () => {
    expect(s().voteHost(b, c).elected).toBe(false)
    s().voteHost(b, c)
    expect(session().hostVotes).toEqual({})
    s().voteHost(b, c)
    s().voteHost(b, b)
    expect(session().hostVotes).toEqual({ [b]: b })
    s().updatePlayer(c, { active: false })
    expect(s().voteHost(c, b).errors).toEqual(['Người đang nghỉ không bầu được.'])
    expect(s().voteHost(b, a).errors).toEqual(['An đang là host rồi.'])
  })

  it('host đổi host trực tiếp thì bỏ các phiếu đang có', () => {
    s().voteHost(b, c)
    s().setHost(b)
    expect(session().hostVotes).toEqual({})
  })
})
