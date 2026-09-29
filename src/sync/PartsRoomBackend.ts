import type { Session } from '../core/types'
import { diffParts, fromParts, toParts, type Parts } from './parts'
import type { RoomBackend } from './RoomBackend'
import type { RoomDb } from './RoomDb'

/** Phòng không ai mở / ghi quá lâu thì dọn khỏi cơ sở dữ liệu. */
export const ROOM_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Mở bàn thì đánh dấu "còn dùng", nhưng không ghi dày hơn mức này. */
const TOUCH_EVERY_MS = 10 * 60 * 1000

interface Room {
  meta?: { sessionId: string; updatedAt: number }
  p?: Parts
}

/**
 * Phòng chia mẩu: `rooms/{code}` = { meta, p: { core, g_…, r_… } }; `activity/{code}` = lần dùng cuối (để dọn phòng bỏ không).
 * Ghi: chỉ các mẩu vừa đổi, mỗi mẩu một transaction chạy lại đúng thay đổi trên bản mới nhất (hai máy
 * bấm cùng lúc không mất lượt). Đọc: theo dõi cả phòng — cơ sở dữ liệu chỉ gửi mẩu vừa đổi.
 */
export class PartsRoomBackend implements RoomBackend {
  readonly kind
  private readonly db: RoomDb
  private readonly now: () => number
  /** Bản mới nhất của từng phòng nhận từ cơ sở dữ liệu. */
  private readonly cache = new Map<string, Parts>()
  private readonly touched = new Map<string, number>()

  constructor(db: RoomDb, kind: RoomBackend['kind'] = 'firebase', now: () => number = Date.now) {
    this.db = db
    this.kind = kind
    this.now = now
  }

  async claim(code: string, session: Session) {
    let created = false
    const { committed } = await this.db.transaction(`rooms/${code}/meta`, (cur) => {
      const meta = cur as Room['meta'] | null
      if (meta && meta.sessionId !== session.id) return undefined // mã đã thuộc bàn khác
      created = !meta
      return meta ?? { sessionId: session.id, updatedAt: session.updatedAt }
    })
    if (!committed) return false
    // Tạo phòng dở dang (đã có meta mà chưa có mẩu nào, vd tắt app giữa chừng) → ghi bù
    if (created || !(await this.db.get(`rooms/${code}/p/core`))) {
      const parts = toParts(session)
      await this.db.update({
        ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [`rooms/${code}/p/${k}`, v])),
        [`activity/${code}`]: this.now(),
      })
      this.touched.set(code, this.now())
    }
    return true
  }

  async fetch(code: string) {
    const room = (await this.db.get(`rooms/${code}`)) as Room | null
    return room?.meta ? fromParts(room.p ?? {}, room.meta.updatedAt) : null
  }

  watch(code: string, onChange: (s: Session | null) => void, onError?: (error: unknown) => void) {
    return this.db.onValue(
      `rooms/${code}`,
      (value) => {
        const room = value as (Room & { data?: string }) | null
        // Phòng kiểu cũ (nguyên bàn một chuỗi) → chuyển sang kiểu chia mẩu, lần sau nhận lại
        if (room && typeof room.data === 'string') {
          void this.migrate(code)
          return
        }
        if (!room?.meta) {
          this.cache.delete(code)
          if (!room) onChange(null)
          return
        }
        this.cache.set(code, room.p ?? {})
        const session = fromParts(room.p ?? {}, room.meta.updatedAt)
        if (session) onChange(session) // chưa có phần chung = phòng đang tạo dở → đợi
      },
      onError,
    )
  }

  async update(code: string, fn: (s: Session) => Session) {
    let base = this.cache.get(code)
    if (!base) base = (((await this.db.get(`rooms/${code}`)) as Room | null)?.p ?? {}) as Parts
    const current = fromParts(base)
    if (!current) return
    const changed = Object.keys(diffParts(base, toParts(fn(current))))
    if (!changed.length) return
    await Promise.all(
      changed.map((key) =>
        this.db.transaction(`rooms/${code}/p/${key}`, (server) => {
          // Bản mới nhất: các mẩu đã biết + mẩu này đúng như trên máy chủ lúc này
          const parts = { ...(this.cache.get(code) ?? base) }
          if (typeof server === 'string') parts[key] = server
          else delete parts[key]
          const latest = fromParts(parts)
          if (!latest) return undefined
          return toParts(fn(latest))[key] ?? null
        }),
      ),
    )
    const now = this.now()
    this.touched.set(code, now)
    await this.db.update({ [`rooms/${code}/meta/updatedAt`]: now, [`activity/${code}`]: now })
  }

  private async migrate(code: string) {
    // Đã có mẩu (vd máy khác ghi bù) → chỉ xóa phần kiểu cũ còn sót
    if (await this.db.get(`rooms/${code}/p/core`)) {
      await this.db.update({ [`rooms/${code}/data`]: null, [`rooms/${code}/sessionId`]: null, [`rooms/${code}/updatedAt`]: null })
      return
    }
    await this.db.transaction(`rooms/${code}`, (cur) => {
      const room = cur as (Room & { data?: string }) | null
      if (!room || room.p?.core || typeof room.data !== 'string') return undefined
      const session = JSON.parse(room.data) as Session
      return { meta: { sessionId: session.id, updatedAt: session.updatedAt }, p: toParts(session) }
    })
    await this.db.update({ [`activity/${code}`]: this.now() })
  }

  async touch(code: string) {
    const now = this.now()
    if (now - (this.touched.get(code) ?? 0) < TOUCH_EVERY_MS) return
    this.touched.set(code, now)
    if (await this.db.get(`rooms/${code}/meta`)) await this.db.update({ [`activity/${code}`]: now })
  }

  /** Dọn các phòng bỏ không quá ROOM_TTL_MS (không cần máy chủ riêng — máy nào mở app thì dọn giúp). */
  async sweep(limit = 20) {
    const stale = await this.db.staleRooms(this.now() - ROOM_TTL_MS, limit)
    if (stale.length)
      await this.db.update(Object.fromEntries(stale.flatMap((code) => [[`rooms/${code}`, null], [`activity/${code}`, null]])))
    return stale
  }

  pause() {
    this.db.pause?.()
  }

  resume() {
    this.db.resume?.()
  }

  onConnection(onChange: (online: boolean) => void) {
    return this.db.onValue('.info/connected', (v) => onChange(v !== false))
  }
}
