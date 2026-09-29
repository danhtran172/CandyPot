import { describe, expect, it } from 'vitest'
import { netOf } from '../core/ledger'
import { LocalRepo, MemoryKV } from '../storage/LocalRepo'
import { createAppStore } from '../store/appStore'
import { LocalRoomBackend } from './LocalRoomBackend'

const tick = () => new Promise((r) => setTimeout(r, 0))

/** Hai "máy": mỗi máy bộ nhớ riêng, chung một phòng. */
function twoDevices() {
  const rooms = new LocalRoomBackend(new MemoryKV(), null)
  const host = createAppStore(new LocalRepo(new MemoryKV()), rooms)
  const guest = createAppStore(new LocalRepo(new MemoryKV()), rooms)
  return { rooms, host, guest }
}

describe('Bàn nhiều người — đồng bộ qua phòng', () => {
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
