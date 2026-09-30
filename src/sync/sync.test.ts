import { describe, expect, it } from 'vitest'
import { netOf } from '../core/ledger'
import { LocalRepo, MemoryKV } from '../storage/LocalRepo'
import { createAppStore } from '../store/appStore'
import { LocalRoomBackend } from './LocalRoomBackend'
import { PartsRoomBackend } from './PartsRoomBackend'
import type { RoomBackend } from './RoomBackend'
import { MemoryRoomDb } from './RoomDb'

const tick = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
}

const BACKENDS: [string, () => RoomBackend][] = [
  ['giả lập trên máy', () => new LocalRoomBackend(new MemoryKV(), null)],
  ['chia mẩu (như Firebase)', () => new PartsRoomBackend(new MemoryRoomDb())],
]

describe.each(BACKENDS)('Bàn nhiều người — đồng bộ qua phòng (%s)', (_, makeRooms) => {
  /** Hai "máy": mỗi máy bộ nhớ riêng, chung một phòng. */
  function twoDevices() {
    const rooms = makeRooms()
    const host = createAppStore(new LocalRepo(new MemoryKV()), rooms)
    const guest = createAppStore(new LocalRepo(new MemoryKV()), rooms)
    return { rooms, host, guest }
  }

  it('máy khác join bằng mã, thêm mình vào bàn; host thấy ngay', async () => {
    const { host, guest } = twoDevices()
    host.getState().createSession('Tối thứ 7', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    await tick()
    const code = host.getState().session!.code!

    expect(await guest.getState().joinRoom('00000')).toEqual({ error: 'Không có bàn nào mã 00000.' })
    const { id } = await guest.getState().joinRoom(code)
    expect(id).toBe(host.getState().session!.id)
    guest.getState().openSession(id!)
    guest.getState().addPlayer('Tèo', '🐶')
    await tick()
    expect(host.getState().session!.players.map((p) => p.name)).toEqual(['Tí', 'Tèo'])
    // Id trên máy mình trùng id trong phòng (không sinh id mới khi ghi lên phòng)
    expect(guest.getState().session!.players.map((p) => p.id)).toEqual(host.getState().session!.players.map((p) => p.id))
  })

  it('hai máy cùng ghi thì không mất lượt nào', async () => {
    const { host, guest } = twoDevices()
    host.getState().createSession('Bàn', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    await tick()
    const { id } = await guest.getState().joinRoom(host.getState().session!.code!)
    guest.getState().openSession(id!)
    guest.getState().addPlayer('Tèo', '🐶')
    await tick()
    const [ti, teo] = host.getState().session!.players.map((p) => p.id)
    const g = host.getState().addGame('free')
    await tick()
    // Cả hai chuyển kẹo trước khi thấy lượt của nhau
    host.getState().addMove(g, ti, teo, 3, '')
    guest.getState().addMove(g, teo, ti, 1, '')
    await tick()
    for (const store of [host, guest]) {
      const s = store.getState().session!
      expect(s.games[0].rounds).toHaveLength(2)
      expect(netOf(s)[teo]).toBe(2)
    }
  })

  it('bàn một máy không tạo phòng', async () => {
    const { rooms, host } = twoDevices()
    host.getState().createSession('Bàn', [{ name: 'Tí', emoji: '🐱' }, { name: 'Tèo', emoji: '🐶' }])
    await tick()
    expect(host.getState().session!.code).toBeUndefined()
    expect(await rooms.fetch('12345')).toBeNull()
  })

  it('mã đã thuộc bàn khác thì tự đổi mã mới', async () => {
    const { rooms, host } = twoDevices()
    host.getState().createSession('A', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    await tick()
    const taken = host.getState().session!
    const other = createAppStore(new LocalRepo(new MemoryKV()), rooms)
    other.getState().createSession('B', [{ name: 'Tèo', emoji: '🐶' }], 'multi')
    const b = other.getState().session!
    // Giả lập trùng mã: bàn B mang mã của bàn A rồi mở lại
    other.getState().closeSession()
    const repo = new LocalRepo(new MemoryKV())
    repo.save({ ...b, code: taken.code })
    const again = createAppStore(repo, rooms)
    again.getState().openSession(b.id)
    await tick()
    await tick()
    const code = again.getState().session!.code
    expect(code).not.toBe(taken.code)
    expect((await rooms.fetch(code!))?.id).toBe(b.id)
    expect((await rooms.fetch(taken.code!))?.id).toBe(taken.id)
  })
})

describe('Phòng chia mẩu — tiết kiệm dữ liệu', () => {
  it('tách / ghép bàn giữ nguyên dữ liệu và thứ tự ván', async () => {
    const { toParts, fromParts, diffParts } = await import('./parts')
    const store = createAppStore(new LocalRepo(new MemoryKV()))
    store.getState().createSession('Bàn', [{ name: 'Tí', emoji: '🐱' }, { name: 'Tèo', emoji: '🐶' }])
    const [a, b] = store.getState().session!.players.map((p) => p.id)
    const g = store.getState().addGame('free')
    for (let i = 1; i <= 3; i++) store.getState().addMove(g, a, b, i, '')
    const s = store.getState().session!
    expect(fromParts(toParts(s), s.updatedAt)).toEqual(s)
    // Thêm một lượt chuyển tay = thêm đúng 1 mẩu ván + mẩu phần chung (updatedAt)
    store.getState().addMove(g, b, a, 1, '')
    const changed = Object.keys(diffParts(toParts(s), toParts(store.getState().session!)))
    // Lượt chuyển tay = 1 ván mới + danh sách ván của game; phần chung (người chơi…) không phải gửi lại
    expect(changed).toHaveLength(2)
    expect(changed).toContain(`g_${g}`)
    expect(changed.filter((k) => k.startsWith('r_'))).toHaveLength(1)
  })

  it('bàn lớn: mỗi lần bấm chỉ gửi vài KB, không gửi lại cả bàn', async () => {
    const db = new MemoryRoomDb()
    const rooms = new PartsRoomBackend(db)
    const host = createAppStore(new LocalRepo(new MemoryKV()), rooms)
    host.getState().createSession('Bàn lớn', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    for (const n of ['Tèo', 'Bin', 'Na', 'Cò', 'Mít']) host.getState().addPlayer(n, '🐶')
    await tick()
    const ids = host.getState().session!.players.map((p) => p.id)
    const g = host.getState().addGame('tienlen')
    host.getState().setTienlenBets(g, 4, 2)
    for (let i = 0; i < 40; i++) {
      host.getState().updatePlayer(ids[4], { active: false })
      host.getState().updatePlayer(ids[5], { active: false })
      host.getState().quickOpen(g)
      host.getState().addMove(g, ids[1], ids[0], 4, 'Nhất')
      host.getState().addMove(g, ids[2], ids[3], 2, 'Nhì')
      host.getState().closeRound(g)
    }
    await tick()
    const whole = JSON.stringify(host.getState().session).length
    const before = db.bytesWritten
    host.getState().quickOpen(g)
    await tick()
    const perTap = db.bytesWritten - before
    expect(whole).toBeGreaterThan(20_000)
    expect(perTap).toBeLessThan(whole / 5)
  })

  it('dọn phòng bỏ không quá 30 ngày; phòng đang dùng thì giữ', async () => {
    let now = 1_000_000_000_000
    const db = new MemoryRoomDb()
    const rooms = new PartsRoomBackend(db, 'firebase', () => now)
    const store = createAppStore(new LocalRepo(new MemoryKV()), rooms)
    store.getState().createSession('Cũ', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    await tick()
    const old = store.getState().session!.code!
    store.getState().closeSession()
    now += 31 * 24 * 60 * 60 * 1000
    store.getState().createSession('Mới', [{ name: 'Tèo', emoji: '🐶' }], 'multi')
    await tick()
    const fresh = store.getState().session!.code!
    // Mở bàn mới là máy tự dọn giúp
    expect(await rooms.fetch(old)).toBeNull()
    expect(await rooms.sweep()).toEqual([])
    expect(await rooms.fetch(fresh)).not.toBeNull()
  })

  it('chấm xanh: thấy ai đang mở bàn; rời bàn thì tắt', async () => {
    const db = new MemoryRoomDb()
    const host = createAppStore(new LocalRepo(new MemoryKV()), new PartsRoomBackend(db))
    const guest = createAppStore(new LocalRepo(new MemoryKV()), new PartsRoomBackend(db))
    host.getState().createSession('Tối thứ 7', [{ name: 'Tí', emoji: '🐱' }], 'multi')
    await tick()
    const { code, id, hostId } = host.getState().session!
    host.getState().markPresent(hostId!)
    await guest.getState().joinRoom(code!)
    guest.getState().openSession(id)
    guest.getState().addPlayer('Tèo', '🐶')
    await tick()
    const teo = guest.getState().session!.players[1].id
    guest.getState().markPresent(teo)
    await tick()
    expect([...host.getState().present].sort()).toEqual([hostId, teo].sort())
    expect([...guest.getState().present].sort()).toEqual([hostId, teo].sort())

    guest.getState().closeSession()
    await tick()
    expect(host.getState().present).toEqual([hostId])
  })
})
