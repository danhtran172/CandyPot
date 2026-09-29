import type { Session } from '../core/types'
import { fromRecord, toRecord, type RoomBackend, type RoomRecord } from './RoomBackend'

type KV = Pick<Storage, 'getItem' | 'setItem'>

const roomKey = (code: string) => `candypot:room:${code}`

/**
 * Phòng giả lập (khi chưa cấu hình Firebase): lưu trong bộ nhớ trình duyệt, các tab / cửa sổ
 * trên cùng máy thấy nhau qua sự kiện `storage`. Dùng để thử luồng join mà không cần mạng.
 */
export class LocalRoomBackend implements RoomBackend {
  readonly kind = 'local' as const
  private readonly kv: KV
  private readonly listeners = new Map<string, Set<(s: Session | null) => void>>()

  constructor(kv: KV = localStorage, target: Pick<Window, 'addEventListener'> | null = typeof window === 'undefined' ? null : window) {
    this.kv = kv
    target?.addEventListener('storage', (e) => {
      const code = e.key?.startsWith('candypot:room:') ? e.key.slice('candypot:room:'.length) : null
      if (code) this.emit(code)
    })
  }

  private read(code: string): RoomRecord | null {
    try {
      return JSON.parse(this.kv.getItem(roomKey(code)) ?? 'null') as RoomRecord | null
    } catch {
      return null
    }
  }

  private write(code: string, session: Session) {
    this.kv.setItem(roomKey(code), JSON.stringify(toRecord(session)))
    this.emit(code)
  }

  private emit(code: string) {
    const session = fromRecord(this.read(code))
    // Gọi sau (giống mạng thật) để người gọi xong việc của mình trước
    queueMicrotask(() => this.listeners.get(code)?.forEach((cb) => cb(session)))
  }

  async claim(code: string, session: Session) {
    const room = this.read(code)
    if (room && room.sessionId !== session.id) return false
    if (!room) this.write(code, session)
    return true
  }

  async fetch(code: string) {
    return fromRecord(this.read(code))
  }

  watch(code: string, onChange: (s: Session | null) => void) {
    const set = this.listeners.get(code) ?? new Set()
    set.add(onChange)
    this.listeners.set(code, set)
    queueMicrotask(() => onChange(fromRecord(this.read(code))))
    return () => {
      set.delete(onChange)
    }
  }

  async update(code: string, fn: (s: Session) => Session) {
    const current = fromRecord(this.read(code))
    if (current) this.write(code, fn(current))
  }

  onConnection(onChange: (online: boolean) => void) {
    queueMicrotask(() => onChange(true))
    return () => {}
  }
}
