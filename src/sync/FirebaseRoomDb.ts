import type { FirebaseOptions } from 'firebase/app'
import type { Database } from 'firebase/database'
import type { RoomDb } from './RoomDb'

type Sdk = typeof import('./firebaseSdk')

/**
 * RoomDb trên Firebase Realtime Database. SDK tải lúc cần lần đầu; đăng nhập ẩn danh.
 * Chỉ giữ kết nối khi đang mở bàn nhiều người và app không bị tạm ngắt (ẩn / lâu không dùng) —
 * gói miễn phí giới hạn số máy kết nối cùng lúc.
 */
export class FirebaseRoomDb implements RoomDb {
  private readonly options: FirebaseOptions
  private readonly emulator?: { host: string; port: number }
  private conn: Promise<{ sdk: Sdk; db: Database }> | null = null
  private readonly connListeners = new Set<(online: boolean) => void>()
  /** Số việc đang cần mạng (bàn đang theo dõi + thao tác đang chạy). */
  private holds = 0
  private paused = false
  private online: boolean | null = null

  constructor(options: FirebaseOptions, emulator?: { host: string; port: number }) {
    this.options = options
    this.emulator = emulator
  }

  private connect() {
    this.conn ??= import('./firebaseSdk').then(async (sdk) => {
      const app = sdk.initializeApp(this.options)
      const db = sdk.getDatabase(app)
      if (this.emulator) sdk.connectDatabaseEmulator(db, this.emulator.host, this.emulator.port)
      sdk.onValue(sdk.ref(db, '.info/connected'), (snap) => {
        this.online = snap.val() === true
        this.connListeners.forEach((cb) => cb(this.online!))
      })
      await sdk.signInAnonymously(sdk.getAuth(app))
      return { sdk, db }
    })
    return this.conn
  }

  /** Bật / tắt kết nối theo nhu cầu. */
  private sync() {
    if (!this.conn) return
    void this.conn.then(({ sdk, db }) => (this.holds > 0 && !this.paused ? sdk.goOnline(db) : sdk.goOffline(db)))
  }

  private async hold<T>(work: (c: { sdk: Sdk; db: Database }) => Promise<T>): Promise<T> {
    this.holds++
    try {
      const c = await this.connect()
      this.sync()
      return await work(c)
    } finally {
      this.holds--
      this.sync()
    }
  }

  get(path: string) {
    return this.hold(async ({ sdk, db }) => (await sdk.get(sdk.ref(db, path))).val() as unknown)
  }

  transaction(path: string, fn: (current: unknown) => unknown) {
    return this.hold(async ({ sdk, db }) => {
      const res = await sdk.runTransaction(sdk.ref(db, path), (cur: unknown) => fn(cur))
      return { committed: res.committed }
    })
  }

  update(values: Record<string, unknown>) {
    return this.hold(({ sdk, db }) => sdk.update(sdk.ref(db), values))
  }

  onValue(path: string, onChange: (value: unknown) => void, onError?: (error: unknown) => void) {
    // Trạng thái kết nối: chỉ báo, không tự kết nối (bàn một máy không tải SDK)
    if (path === '.info/connected') {
      const cb = (online: boolean) => onChange(online)
      this.connListeners.add(cb)
      if (this.online !== null) queueMicrotask(() => cb(this.online!))
      return () => {
        this.connListeners.delete(cb)
      }
    }
    let stop: (() => void) | null = null
    let cancelled = false
    this.holds++
    this.connect().then(
      ({ sdk, db }) => {
        this.sync()
        if (!cancelled) stop = sdk.onValue(sdk.ref(db, path), (snap) => onChange(snap.val() as unknown), onError)
      },
      (error) => onError?.(error),
    )
    return () => {
      if (cancelled) return
      cancelled = true
      stop?.()
      this.holds--
      this.sync()
    }
  }

  presence(path: string, value: unknown) {
    let stopped = false
    const conn = this.connect()
    // Mỗi lần (nối lại) kết nối: hẹn máy chủ xóa khi mất kết nối, rồi ghi
    const announce = (online: boolean) => {
      if (!online || stopped) return
      conn
        .then(async ({ sdk, db }) => {
          const at = sdk.ref(db, path)
          await sdk.onDisconnect(at).remove()
          if (!stopped) await sdk.set(at, value)
        })
        .catch(() => {})
    }
    this.connListeners.add(announce)
    if (this.online) announce(true)
    return () => {
      stopped = true
      this.connListeners.delete(announce)
      conn
        .then(({ sdk, db }) => {
          const at = sdk.ref(db, path)
          void sdk.onDisconnect(at).cancel()
          void sdk.remove(at)
        })
        .catch(() => {})
    }
  }

  staleRooms(cutoff: number, limit: number) {
    return this.hold(async ({ sdk, db }) => {
      const snap = await sdk.get(sdk.query(sdk.ref(db, 'activity'), sdk.orderByValue(), sdk.endAt(cutoff), sdk.limitToFirst(limit)))
      return Object.keys((snap.val() as Record<string, number> | null) ?? {})
    })
  }

  pause() {
    this.paused = true
    this.sync()
  }

  resume() {
    this.paused = false
    this.sync()
  }
}
