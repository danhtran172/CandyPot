import { beforeEach, describe, expect, it } from 'vitest'
import { netOf } from '../core/ledger'
import { openRound, potOf } from '../core/round'
import { POT } from '../core/types'
import { LocalRepo, MemoryKV } from '../storage/LocalRepo'
import { createAppStore, pingWait, type AppStore } from './appStore'
import { seatedOf } from '../core/games/tienlen'

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
    expect(repo.list()).toEqual([{ id: session().id, name: 'Tối thứ 7', updatedAt: session().updatedAt, playerCount: 3, mode: 'solo' }])
  })

  it('vào bàn / thôi nghỉ lúc ván chưa chốt (đang mua tờ / đặt cược) thì vào ván luôn; chốt rồi thì chờ ván sau', () => {
    const lo = s().addGame('loto')
    s().openRound(lo, { participants: [a, b], bet: 5, stakes: {}, dealer: null })
    s().addPlayer('Dũng', '🐼')
    const d = session().players.find((p) => p.name === 'Dũng')!.id
    const open = () => session().games.find((g) => g.id === lo)!.rounds.at(-1)!
    expect(open().participants).toEqual([a, b, d])
    s().updatePlayer(c, { active: false })
    s().updatePlayer(c, { active: true })
    expect(open().participants).toEqual([a, b, d, c])
    s().lockBets(lo)
    s().addPlayer('Em', '🦊')
    expect(open().participants).toHaveLength(4)
  })

  it('Xì dách chưa chốt cược: người mới vào được cược mặc định bằng mức cược ván', () => {
    const xd = s().addGame('xidach')
    s().openRound(xd, { participants: [a, b], bet: 3, stakes: { [b]: 3 }, dealer: a })
    s().addPlayer('Giang', '🐯')
    const gi = session().players.find((p) => p.name === 'Giang')!.id
    const x = session().games.find((g) => g.id === xd)!.rounds.at(-1)!
    expect(x.participants).toContain(gi)
    expect(x.stakes[gi]).toBe(3)
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

  it('host quay lại ván trước: bỏ ván đang mở, mở lại ván vừa chốt', () => {
    const g = s().addGame('tienlen')
    expect(s().backRound(g)).toEqual(['Chưa có ván trước để quay lại.'])
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    s().addMove(g, b, a, 2, '')
    s().closeRound(g)
    s().addMove(g, c, a, 1, '') // chuyển tay — không phải ván để quay lại
    s().openRound(g, { participants: [a, b], bet: 1, bet2: 1, stakes: {}, dealer: null })
    s().addMove(g, a, b, 5, '')
    expect(s().backRound(g)).toEqual([])
    const rounds = session().games[0].rounds
    expect(rounds).toHaveLength(2)
    expect(openRound(session(), g)!.moves.map((m) => m.amount)).toEqual([2])
    expect(netOf(session())[a]).toBe(1) // chỉ còn lượt chuyển tay được tính
    s().closeRound(g)
    expect(netOf(session())[a]).toBe(3)
  })
})

describe('appStore — Xì dách', () => {
  it('đặt cược → chốt → trả kẹo → ván mới giữ cược cũ, gắn tag làm cái', () => {
    const g = s().addGame('xidach')
    s().setXidachLimits(g, 1, 50)
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
    s().setXidachLimits(g, 1, 50)
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
    s().setXidachLimits(g, 1, 50)
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 10 }, dealer: a })
    s().lockBets(g)
    s().addMove(g, b, a, 10, '')
    s().closeRound(g)
    expect(netOf(session())).toEqual({ [a]: 10, [b]: -10, [c]: 0 })
    expect(session().games[0].rounds[0].tags).toEqual([{ type: 'lam-cai', playerId: a }])
  })

  it('đặt cược qua ô Bet: đổi cược của con, cái không đặt được, ván sau gợi ý lại mức cũ', () => {
    const g = s().addGame('xidach')
    s().setXidachLimits(g, 1, 50)
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
    s().setXidachLimits(g, 1, 50)
    s().openRound(g, { participants: [a, b, c], bet: 1, stakes: { [b]: 5, [c]: 8 }, dealer: a })
    s().closeRound(g)
    expect(s().quickOpen(g)).toEqual([])
    expect(openRound(session(), g)).toMatchObject({ dealer: a, participants: [a, b, c], stakes: { [b]: 5, [c]: 8 } })
    expect(s().setDealer(g, b)).toEqual([])
    expect(openRound(session(), g)).toMatchObject({ dealer: b, stakes: { [a]: 5, [c]: 8 } })
  })

  it('cần cái và cược của mọi con', () => {
    const g = s().addGame('xidach')
    s().setXidachLimits(g, 1, 50)
    expect(s().openRound(g, { participants: [a, b], bet: 1, stakes: { [b]: 5 }, dealer: null })).not.toEqual([])
    expect(s().openRound(g, { participants: [a, b], bet: 1, stakes: {}, dealer: a })).not.toEqual([])
  })
})

describe('appStore — Poker', () => {
  it('blind tự bỏ, theo lượt, bỏ bài hết thì người còn lại ăn pot; chưa xong thì không chốt được', () => {
    const g = s().addGame('poker')
    expect(s().setPokerSettings(g, 1, 10)).toEqual([])
    expect(s().quickOpen(g)).toEqual([])
    const hand = () => openRound(session(), g)!.poker!
    // 3 người, nút D = An → SB Bình, BB Cường, An nói trước
    expect([hand().button, hand().toAct]).toEqual([a, a])
    expect(s().addMove(g, a, POT, 2, '')).toEqual(['Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.'])
    expect(s().closeRound(g)).toEqual(['Tay bài chưa xong — chơi hết các vòng và trao pot trước.'])
    expect(s().pokerAct(g, b, { type: 'call' })).toEqual(['Chưa tới lượt người này.'])
    s().pokerAct(g, a, { type: 'raise', to: 4 })
    s().pokerAct(g, b, { type: 'fold' })
    s().pokerAct(g, c, { type: 'fold' })
    expect(hand().street).toBe('done')
    expect(s().closeRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 3, [b]: -1, [c]: -2 })
    // Tay sau: nút D xoay sang Bình
    s().quickOpen(g)
    expect(hand().button).toBe(b)
  })

  it('↩ hoàn tác thao tác cuối; đang chơi thì không hoàn tác lẻ từng lượt', () => {
    const g = s().addGame('poker')
    s().quickOpen(g)
    s().pokerAct(g, a, { type: 'call' })
    const r = openRound(session(), g)!
    expect(s().undoMove(g, r.id, r.moves[2].id)).toEqual(['Poker: dùng nút ↩ trên bàn để hoàn tác thao tác cuối.'])
    expect(s().pokerUndo(g)).toEqual([])
    expect([openRound(session(), g)!.moves.length, openRound(session(), g)!.poker!.toAct]).toEqual([2, a])
  })

  it('cài đặt: all-in ít nhất bằng big blind', () => {
    const g = s().addGame('poker')
    expect(s().setPokerSettings(g, 5, 8)).toEqual(['Mức all-in phải ít nhất bằng big blind (10).'])
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

  it('từ chối hoặc hủy thì không chuyển; lời đòi bị từ chối vẫn còn đến khi người đòi xóa', () => {
    const g = s().addGame('xidach')
    s().requestCandy(g, b, a, 5)
    const id = session().requests[0].id
    s().answerRequest(id, false)
    expect(session().requests).toMatchObject([{ id, status: 'declined' }])
    expect(s().answerRequest(id, true)).toEqual(['Lời đòi này đã được trả lời rồi.'])
    s().cancelRequest(id)
    s().requestCandy(g, c, a, 3)
    s().cancelRequest(session().requests[0].id)
    expect(session().requests).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 0, [b]: 0, [c]: 0 })
  })

  it('bị từ chối → nhờ host: host duyệt thì chuyển kẹo luôn, host từ chối thì đánh dấu', () => {
    const g = s().addGame('free')
    s().requestCandy(g, c, b, 4)
    const id = session().requests[0].id
    expect(s().escalateRequest(id)).toEqual(['Chỉ nhờ host được khi lời đòi bị từ chối.'])
    s().answerRequest(id, false)
    expect(s().escalateRequest(id)).toEqual([])
    expect(session().requests[0]).toMatchObject({ status: 'escalated' })
    expect(s().judgeRequest(id, false)).toEqual([])
    expect(session().requests[0]).toMatchObject({ status: 'rejected' })
    expect(s().pingRequest(id)).toEqual(['Yêu cầu này đã được trả lời.'])

    s().requestCandy(g, c, b, 2)
    const again = session().requests[1].id
    s().answerRequest(again, false)
    s().escalateRequest(again)
    expect(s().judgeRequest(again, true)).toEqual([])
    expect(session().requests.map((r) => r.id)).toEqual([id])
    expect(netOf(session())).toEqual({ [a]: 0, [b]: 2, [c]: -2 })
  })

  it('người bị đòi đổi ý: trả luôn lời đòi đã từ chối', () => {
    const g = s().addGame('free')
    s().requestCandy(g, c, b, 3)
    const id = session().requests[0].id
    expect(s().payDeclined(id)).toEqual(['Lời đòi này vẫn đang chờ bạn trả lời.'])
    s().answerRequest(id, false)
    s().escalateRequest(id)
    expect(s().payDeclined(id)).toEqual([])
    expect(session().requests).toEqual([])
    expect(netOf(session())).toEqual({ [a]: 0, [b]: 3, [c]: -3 })
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

  it('Poker đã kết thúc: hoàn tác lượt ăn pot → trao lại cho người khác, pot không lệch', () => {
    const g = s().addGame('poker')
    s().quickOpen(g)
    s().pokerAct(g, a, { type: 'fold' })
    s().pokerAct(g, b, { type: 'fold' })
    s().closeRound(g)
    const r = session().games[0].rounds[0]
    const win = r.moves.find((m) => m.from === POT)!
    const other = win.to === a ? b : a
    expect(s().undoMove(g, r.id, win.id)).toEqual([])
    expect(s().reassignAward(other)).toEqual([])
    const after = session().games[0].rounds[0]
    expect(after.moves.find((m) => m.id === win.id)!.to).toBe(other)
    expect(Object.values(netOf(session())).reduce((x, y) => x + y, 0)).toBe(0)
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

describe('appStore — Lô tô', () => {
  it('đặt giá → mua tờ vào Pot → Chốt → host trao pot → kết thúc ván → ván mới giữ giá', () => {
    const g = s().addGame('loto')
    expect(s().setLotoPrice(g, 3)).toEqual([])
    expect(s().quickOpen(g)).toEqual([])
    const open = () => openRound(session(), g)!
    expect([open().bet, open().phase, open().moves]).toEqual([3, 'betting', []])
    // An mua 2 tờ, Bình 1 tờ
    expect(s().addMove(g, a, POT, 6, '2 tờ')).toEqual([])
    expect(s().addMove(g, b, POT, 3, '1 tờ')).toEqual([])
    expect(s().setLotoPrice(g, 4)).toEqual(['Ván này đã có người mua tờ — đổi giá ở ván sau.'])
    expect(s().addMove(g, POT, c, 9, '')).toEqual(['Đang mua tờ — bấm Chốt rồi host mới trao pot.'])
    s().lockBets(g)
    expect(s().addMove(g, c, POT, 3, '')).toEqual(['Đã chốt — không mua thêm tờ được nữa.'])
    expect(s().addMove(g, POT, c, 9, 'Ăn pot')).toEqual([])
    expect(s().closeRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: -6, [b]: -3, [c]: 9 })
    s().quickOpen(g)
    expect(open().bet).toBe(3)
  })

  it('chưa chốt: chỉnh lại số tờ đã mua (tăng / giảm / bỏ mua); chốt rồi thì thôi', () => {
    const g = s().addGame('loto')
    s().setLotoPrice(g, 5)
    s().quickOpen(g)
    const open = () => openRound(session(), g)!
    const paid = (id: string) => open().moves.filter((m) => m.from === id && m.to === POT).reduce((n, m) => n + m.amount, 0)
    s().addMove(g, a, POT, 5, '1 tờ')
    s().addMove(g, a, POT, 5, '1 tờ')
    s().addMove(g, b, POT, 10, '2 tờ')
    expect(s().setLotoTickets(g, a, 1)).toEqual([])
    expect([paid(a), open().moves.filter((m) => m.from === a).length]).toEqual([5, 1])
    expect(s().setLotoTickets(g, a, 3)).toEqual(['Mỗi người mua 0–2 tờ một ván.'])
    expect(s().setLotoTickets(g, b, 0)).toEqual([])
    expect(paid(b)).toBe(0)
    s().lockBets(g)
    expect(s().setLotoTickets(g, a, 2)).toEqual(['Đã chốt — không đổi số tờ được nữa.'])
  })

  it('vào bàn lúc ván đã chốt (đang chơi): chưa tính ván này, ván sau tự vào', () => {
    const g = s().addGame('loto')
    s().quickOpen(g)
    s().addMove(g, a, POT, 5, '1 tờ')
    s().lockBets(g)
    s().addPlayer('Dũng', '🦊')
    const d = session().players.find((p) => p.name === 'Dũng')!.id
    expect(openRound(session(), g)!.participants).not.toContain(d)
    expect(s().addMove(g, d, POT, 5, '1 tờ')).not.toEqual([])
    s().addMove(g, POT, a, 5, 'Ăn pot')
    s().closeRound(g)
    s().quickOpen(g)
    expect(openRound(session(), g)!.participants).toEqual([a, b, c, d])
  })

  it('ván mới tự mua lại số tờ của ván trước (giá mới, bỏ người nghỉ) — chưa chốt thì chỉnh được', () => {
    const g = s().addGame('loto')
    s().setLotoPrice(g, 5)
    s().quickOpen(g)
    const open = () => openRound(session(), g)!
    s().addMove(g, a, POT, 10, '2 tờ')
    s().addMove(g, b, POT, 5, '1 tờ')
    s().lockBets(g)
    s().addMove(g, POT, c, 15, 'Ăn pot')
    s().closeRound(g)
    s().setLotoPrice(g, 3)
    s().updatePlayer(b, { active: false })
    expect(s().quickOpen(g)).toEqual([])
    expect(open().moves.map((m) => [m.from, m.to, m.amount, m.label])).toEqual([[a, POT, 6, '2 tờ']])
    expect(s().setLotoTickets(g, a, 1)).toEqual([])
    expect(potOf(open())).toBe(3)
  })
})

describe('appStore — hoàn tác trao pot (pot không bao giờ âm)', () => {
  it('ván đã xong: hoàn tác lượt trao pot → popup trao lại (ván không mở lại); chọn người khác thì tính lại ván', () => {
    const g = s().addGame('loto')
    s().quickOpen(g)
    s().addMove(g, a, POT, 5, '1 tờ')
    s().addMove(g, b, POT, 5, '1 tờ')
    s().lockBets(g)
    expect(s().addMove(g, POT, b, 11, 'Ăn pot')).toEqual(['Pot chỉ còn 10 kẹo.'])
    s().addMove(g, POT, b, 10, 'Ăn pot')
    s().closeRound(g)
    // Ván sau đang chơi — không bị ảnh hưởng
    s().quickOpen(g)
    const round = session().games[0].rounds[0]
    const award = round.moves.find((m) => m.from === POT)!
    expect(s().undoMove(g, round.id, award.id)).toEqual([])
    expect(s().reaward).toEqual({ gameId: g, roundId: round.id, moveId: award.id })
    expect(session().games[0].rounds[0].status).toBe('closed')
    expect(s().reassignAward(a)).toEqual([])
    expect(s().reaward).toBeNull()
    expect(netOf(session())).toEqual({ [a]: 5, [b]: -5, [c]: 0 })
    expect(openRound(session(), g)).toBeDefined()
  })

  it('không cho hoàn tác lượt bỏ kẹo vào pot khi pot đã trao đi (pot sẽ âm)', () => {
    const g = s().addGame('free')
    s().quickOpen(g)
    s().addMove(g, a, POT, 4, '')
    s().addMove(g, b, POT, 6, '')
    s().lockBets(g)
    s().addMove(g, POT, b, 10, 'Cả pot')
    const round = openRound(session(), g)!
    const bet = round.moves.find((m) => m.from === a)!
    expect(s().undoMove(g, round.id, bet.id)).toEqual(['Pot sẽ bị âm — hoàn tác lượt trao pot trước rồi mới hoàn tác lượt này.'])
    expect(potOf(openRound(session(), g)!)).toBe(0)
  })
})

describe('appStore — Tự do', () => {
  it('cược vào Pot, gửi cho nhau, chốt cược, trao pot → hết pot thì chốt được', () => {
    const g = s().addGame('free')
    expect(s().quickOpen(g)).toEqual([])
    expect(openRound(session(), g)!.phase).toBe('betting')
    s().addMove(g, a, POT, 3, '')
    s().addMove(g, b, POT, 5, '')
    s().addMove(g, c, a, 2, '')
    expect(s().addMove(g, POT, b, 8, '')).toEqual(['Chưa chốt cược — bấm Chốt cược rồi mới trao pot.'])
    s().lockBets(g)
    expect(s().addMove(g, c, POT, 1, '')).toEqual(['Đã chốt cược — không cược thêm được nữa.'])
    // Bỏ chốt được khi chưa trao pot, rồi chốt lại
    expect(s().unlockBets(g)).toEqual([])
    s().lockBets(g)
    expect(s().closeRound(g)).toEqual(['Pot còn 8 kẹo — kéo pot cho người thắng trước khi chốt.'])
    s().addMove(g, POT, b, 8, 'Cả pot')
    expect(s().closeRound(g)).toEqual([])
    expect(netOf(session())).toEqual({ [a]: -1, [b]: 3, [c]: -2 })
  })
})

describe('appStore — cài đặt từng mode', () => {
  it('Xì dách: cược phải trong khoảng min–max (mặc định 1–5)', () => {
    const g = s().addGame('xidach')
    s().quickOpen(g)
    const con = openRound(session(), g)!.participants.find((p) => p !== openRound(session(), g)!.dealer)!
    expect(s().setStake(g, con, 6)).toEqual(['Cược từ 1 đến 5 kẹo.'])
    expect(s().setXidachLimits(g, 2, 1)).toEqual(['Cược tối đa phải lớn hơn hoặc bằng cược tối thiểu.'])
    expect(s().setXidachLimits(g, 2, 10)).toEqual([])
    expect(s().setStake(g, con, 6)).toEqual([])
    expect(s().setStake(g, con, 1)).toEqual(['Cược từ 2 đến 10 kẹo.'])
  })

  it('Lô tô: mỗi người mua tối đa N tờ một ván (mặc định 2)', () => {
    const g = s().addGame('loto')
    s().setLotoPrice(g, 3)
    s().quickOpen(g)
    expect(s().addMove(g, a, POT, 6, '2 tờ')).toEqual([])
    expect(s().addMove(g, a, POT, 3, '1 tờ')).toEqual(['Mỗi người mua tối đa 2 tờ một ván (6 kẹo).'])
    expect(s().setLotoSettings(g, 3, 3)).toEqual([])
    expect(s().addMove(g, a, POT, 3, '1 tờ')).toEqual([])
  })

  it('Tiến lên: heo đỏ / heo đen mặc định theo Nhất / Nhì, đặt riêng được', () => {
    const g = s().addGame('tienlen')
    s().setTienlenBets(g, 4, 2)
    expect(session().games[0].bets).toEqual({ bet: 4, bet2: 2, red: undefined, black: undefined })
    s().setTienlenBets(g, 4, 2, { red: 10, black: 6 })
    expect(session().games[0].bets).toMatchObject({ red: 10, black: 6 })
  })
})

describe('appStore — Tiến lên: người chơi = ai không tạm nghỉ', () => {
  it('quá 4 người thì chưa mở ván; cho 1 người nghỉ là mở được với đúng 4 người', () => {
    s().addPlayer('Dũng', '🦊')
    s().addPlayer('Em', '🐯')
    const [, , , d, e] = session().players.map((p) => p.id)
    const g = s().addGame('tienlen')
    expect(seatedOf(session())).toEqual([a, b, c, d, e])
    expect(s().quickOpen(g)).toEqual(['Tiến lên tối đa 4 người — cho người không chơi nghỉ 💤 ở tab Người chơi.'])
    s().updatePlayer(b, { active: false })
    expect(s().quickOpen(g)).toEqual([])
    expect(openRound(session(), g)!.participants).toEqual([a, c, d, e])
  })
})

describe('appStore — nhắc lại yêu cầu', () => {
  it('nhắc lời đòi / xin hoàn tác còn chờ; phải đợi 30 giây giữa hai lần; yêu cầu đã xong thì báo', () => {
    const g = s().addGame('free')
    s().requestCandy(g, b, a, 3)
    const req = session().requests[0]
    expect(s().pingRequest(req.id)[0]).toMatch(/đợi \d+ giây/)
    // Giả lập đã qua 30 giây
    store.setState({ session: { ...session(), requests: [{ ...req, at: req.at - 31_000 }] } })
    expect(s().pingRequest(req.id)).toEqual([])
    expect(session().requests[0]).toMatchObject({ pings: 1 })
    expect(s().pingRequest(req.id)[0]).toMatch(/Vừa nhắc xong/)
    expect(pingWait({ at: 0, pingedAt: 1_000 }, 31_000)).toBe(0)
    s().answerRequest(req.id, false)
    expect(s().pingRequest(req.id)).toEqual(['Yêu cầu này đã được trả lời.'])
    s().cancelRequest(req.id)
    expect(s().pingRequest(req.id)).toEqual(['Yêu cầu này không còn nữa — đã được trả lời hoặc đã hủy.'])
  })
})

describe('appStore — game đang chơi', () => {
  it('lưu game đang chơi vào bàn (giữ khi rời màn Bàn chơi)', () => {
    const t = s().addGame('tienlen')
    s().addGame('xidach')
    s().setCurrentGame(t)
    expect(session().currentGameId).toBe(t)
    s().setCurrentGame('khong-co')
    expect(session().currentGameId).toBe(t)
  })
})

describe('appStore — tạo bàn', () => {
  it('bàn một máy không có mã; bàn nhiều người có mã 5 số, hiện ở danh sách', () => {
    expect(session().mode).toBe('solo')
    expect(session().code).toBeUndefined()
    const id = s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }], 'multi')
    expect(session().code).toMatch(/^\d{5}$/)
    expect(repo.list().find((m) => m.id === id)?.code).toBe(session().code)
  })
})

describe('LocalRepo — giữ tối đa 10 bàn', () => {
  it('có bàn mới thì xóa bàn lâu không chơi nhất', () => {
    const kv = new MemoryKV()
    const r = new LocalRepo(kv)
    const make = (i: number) => ({ id: `s${i}`, name: `Bàn ${i}`, updatedAt: i, players: [] }) as unknown as Parameters<LocalRepo['save']>[0]
    for (let i = 1; i <= 12; i++) r.save(make(i))
    expect(r.list().map((m) => m.id)).toEqual(['s12', 's11', 's10', 's9', 's8', 's7', 's6', 's5', 's4', 's3'])
    expect(r.load('s1')).toBeNull()
    expect(r.load('s3')).not.toBeNull()
    // Lưu lại bàn cũ (vừa mở chơi tiếp) thì bàn đó được giữ
    r.save({ ...make(3), updatedAt: 13 })
    expect(r.list()[0].id).toBe('s3')
  })
})

describe('appStore — Xì dách bài trong app', () => {
  it('chốt cược thì chia bài; cái xét tất thì tự ghi lượt trả kẹo; bỏ chốt thì thu bài', () => {
    s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }, { name: 'Z', emoji: '🐸' }], 'multi')
    const [x, y, z] = session().players.map((p) => p.id)
    const g = s().addGame('xidach')
    expect(s().setCardMode(g, 'app')).toEqual([])
    expect(s().openRound(g, { participants: [x, y, z], bet: 2, stakes: { [y]: 2, [z]: 3 }, dealer: x })).toEqual([])
    const open = () => session().games.find((gg) => gg.id === g)!.rounds.find((r) => r.status === 'open')!
    expect(open().phase).toBe('betting')
    s().lockBets(g)
    const xd = open().xidach!
    expect(xd.dealer).toBe(x)
    expect(Object.values(xd.hands).every((h) => h.length === 2)).toBe(true)
    // Con chưa xét (không có xì dách ngay) thì dằn hết, tới cái xét tất
    for (const p of [y, z]) if (open().xidach!.turn === p) s().xidachStand(g, p)
    if (open().xidach!.turn === x) expect(s().xidachCheckAll(g, x)).toEqual([])
    const done = open().xidach!
    expect(done.turn).toBeNull()
    expect(Object.keys(done.settled).sort()).toEqual([y, z].sort())
    const paid = open().moves.filter((m) => m.label.startsWith('Bài:'))
    const decided = Object.values(done.settled).filter((r) => r.outcome !== 'draw').length
    expect(paid).toHaveLength(decided)
    if (!paid.length) {
      expect(s().unlockBets(g)).toEqual([])
      expect(open().xidach).toBeUndefined()
    }
  })
})

describe('appStore — Lô tô giấy trong app', () => {
  it('chọn tờ (không trùng, tự tính kẹo) → chốt → gọi số → kinh thì ăn pot', async () => {
    const { sheetSet, pairsFor, rowNumbers } = await import('../core/games/lotoSheets')
    s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }, { name: 'Z', emoji: '🐸' }], 'multi')
    const [x, y, z] = session().players.map((p) => p.id)
    const g = s().addGame('loto')
    s().setCardMode(g, 'app')
    s().setLotoCalling(g, 'bag')
    expect(s().openRound(g, { participants: [x, y, z], bet: 5, stakes: {}, dealer: null })).toEqual([])
    const open = () => session().games.find((gg) => gg.id === g)!.rounds.find((r) => r.status === 'open')!
    expect(s().lotoPickSheets(g, y, [0, 1])).toEqual([])
    expect(s().lotoPickSheets(g, z, [1])).toEqual(['Tờ này đã có người mua — chọn tờ khác.'])
    expect(s().lotoPickSheets(g, z, [2])).toEqual([])
    expect(s().addMove(g, z, POT, 5, '')).toEqual(['Lô tô giấy trong app: bấm ô Mua để chọn tờ.'])
    expect(potOf(open())).toBe(15)
    s().lockBets(g)
    expect(open().loto!.caller).toBe(x)
    const papers = sheetSet(g, pairsFor(3, 2))
    const row = rowNumbers(papers[2], 0)
    expect(s().lotoCall(g, y)).toEqual(['Chỉ người gọi số mới lắc được.'])
    // Gọi đến khi đủ hàng 0 của tờ 2 (gọi ngẫu nhiên nên gọi tối đa 90 lần)
    while (!row.every((n) => open().loto!.called.includes(n))) expect(s().lotoCall(g, x)).toEqual([])
    expect(s().lotoClaim(g, z, 2, 0)).toEqual([])
    expect(open().loto!.winner).toEqual({ id: z, sheet: 2, row: 0 })
    expect(potOf(open())).toBe(0)
    expect(open().moves.at(-1)).toMatchObject({ from: POT, to: z, amount: 15 })
  })
})

describe('appStore — đổi sang bài trong app lúc chưa chốt', () => {
  it('Xì dách: mở ván kiểu đánh ngoài, đổi sang app rồi chốt cược → vẫn chia bài', () => {
    s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }], 'multi')
    const [x, y] = session().players.map((p) => p.id)
    const g = s().addGame('xidach')
    s().openRound(g, { participants: [x, y], bet: 2, stakes: { [y]: 2 }, dealer: x })
    expect(s().setCardMode(g, 'app')).toEqual([])
    s().lockBets(g)
    const open = session().games.find((gg) => gg.id === g)!.rounds.find((r) => r.status === 'open')!
    expect(open.xidach?.hands[y]).toHaveLength(2)
  })

  it('Lô tô: đã mua kiểu đánh ngoài, đổi sang app → phát đúng số tờ đã mua; đổi lại đánh ngoài thì bỏ giấy, giữ tiền', () => {
    s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }], 'multi')
    const [x, y] = session().players.map((p) => p.id)
    const g = s().addGame('loto')
    s().openRound(g, { participants: [x, y], bet: 5, stakes: {}, dealer: null })
    s().setLotoTickets(g, x, 2)
    s().setLotoTickets(g, y, 1)
    const open = () => session().games.find((gg) => gg.id === g)!.rounds.find((r) => r.status === 'open')!
    s().setCardMode(g, 'app')
    expect(open().loto!.sheets).toEqual({ [x]: [0, 1], [y]: [2] })
    expect(potOf(open())).toBe(15)
    s().setCardMode(g, 'real')
    expect(open().loto).toBeUndefined()
    expect(potOf(open())).toBe(15)
    s().setCardMode(g, 'app')
    s().lockBets(g)
    expect(open().phase).toBe('playing')
    expect(open().loto!.sheets[x]).toEqual([0, 1])
  })
})

describe('appStore — Lô tô gọi ở ngoài', () => {
  it('báo kinh chưa ăn pot; host bác thì thôi, host xác nhận thì trao pot', () => {
    s().createSession('Nhóm', [{ name: 'X', emoji: '🐱' }, { name: 'Y', emoji: '🐶' }], 'multi')
    const [x, y] = session().players.map((p) => p.id)
    const g = s().addGame('loto')
    s().setCardMode(g, 'app')
    s().openRound(g, { participants: [x, y], bet: 5, stakes: {}, dealer: null })
    const open = () => session().games.find((gg) => gg.id === g)!.rounds.find((r) => r.status === 'open')!
    s().lotoPickSheets(g, y, [0])
    s().lotoPickSheets(g, x, [1])
    s().lockBets(g)
    expect(s().lotoClaim(g, y, 0, 0)).toEqual([])
    expect(open().loto!.pending).toEqual({ id: y, sheet: 0, row: 0 })
    expect(potOf(open())).toBe(10)
    expect(s().lotoJudge(g, false)).toEqual([])
    expect(open().loto!.rejected).toBe(y)
    expect(potOf(open())).toBe(10)
    s().lotoClaim(g, y, 0, 0)
    expect(s().lotoJudge(g, true)).toEqual([])
    expect(open().loto!.winner).toEqual({ id: y, sheet: 0, row: 0 })
    expect(potOf(open())).toBe(0)
  })
})
