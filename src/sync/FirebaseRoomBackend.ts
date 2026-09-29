import type { FirebaseOptions } from 'firebase/app'
import type { Database } from 'firebase/database'
import type { Session } from '../core/types'
import { fromRecord, toRecord, type RoomBackend, type RoomRecord } from './RoomBackend'

type Sdk = typeof import('./firebaseSdk')

/**
 * Phòng qua Firebase Realtime Database: `rooms/{code}` = { sessionId, updatedAt, data }.
 * Đăng nhập ẩn danh (không cần tài khoản) — security rules chỉ cho người đã đăng nhập đọc/ghi.
 * SDK tải lúc cần lần đầu.
 */
export class FirebaseRoomBackend implements RoomBackend {
  readonly kind = 'firebase' as const
  private readonly options: FirebaseOptions
  private readonly emulator?: { host: string; port: number }
  private conn: Promise<{ sdk: Sdk; db: Database }> | null = null

  constructor(options: FirebaseOptions, emulator?: { host: string; port: number }) {
    this.options = options
    this.emulator = emulator
  }

  private readonly connListeners = new Set<(online: boolean) => void>()

  private connect() {
    this.conn ??= import('./firebaseSdk').then(async (sdk) => {
      const app = sdk.initializeApp(this.options)
      const db = sdk.getDatabase(app)
      if (this.emulator) sdk.connectDatabaseEmulator(db, this.emulator.host, this.emulator.port)
      sdk.onValue(sdk.ref(db, '.info/connected'), (snap) => this.connListeners.forEach((cb) => cb(snap.val() === true)))
      await sdk.signInAnonymously(sdk.getAuth(app))
      return { sdk, db }
    })
    return this.conn
  }

  async claim(code: string, session: Session) {
    const { sdk, db } = await this.connect()
    let mine = false
    await sdk.runTransaction(sdk.ref(db, `rooms/${code}`), (room: RoomRecord | null) => {
      if (room && room.sessionId !== session.id) {
        mine = false
        return undefined // mã đã thuộc bàn khác → không ghi
      }
      mine = true
      return room ?? toRecord(session)
    })
    return mine
  }

  async fetch(code: string) {
    const { sdk, db } = await this.connect()
    const snap = await sdk.get(sdk.ref(db, `rooms/${code}`))
    return fromRecord(snap.val() as RoomRecord | null)
  }

  watch(code: string, onChange: (s: Session | null) => void) {
    let stop: (() => void) | null = null
    let cancelled = false
    void this.connect().then(({ sdk, db }) => {
      if (!cancelled) stop = sdk.onValue(sdk.ref(db, `rooms/${code}`), (snap) => onChange(fromRecord(snap.val() as RoomRecord | null)))
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }

  async update(code: string, fn: (s: Session) => Session) {
    const { sdk, db } = await this.connect()
    await sdk.runTransaction(sdk.ref(db, `rooms/${code}`), (room: RoomRecord | null) => {
      const current = fromRecord(room)
      // Lần chạy đầu có thể chưa có dữ liệu trong bộ nhớ đệm → trả lại nguyên để SDK lấy bản thật rồi chạy lại
      return current ? toRecord(fn(current)) : room
    })
  }

  onConnection(onChange: (online: boolean) => void) {
    // Chỉ báo khi đã kết nối (có bàn nhiều người) — bàn một máy không tải SDK
    this.connListeners.add(onChange)
    return () => {
      this.connListeners.delete(onChange)
    }
  }
}
