/**
 * Lớp mỏng trên cơ sở dữ liệu dạng cây (Firebase Realtime Database, hoặc bản trong bộ nhớ để test):
 * đường dẫn "rooms/12345/p/core"…
 */
export interface RoomDb {
  get(path: string): Promise<unknown>
  /** fn trả về undefined = bỏ; null = xóa. Chạy lại fn nếu máy khác vừa ghi cùng chỗ. */
  transaction(path: string, fn: (current: unknown) => unknown): Promise<{ committed: boolean }>
  /** Ghi nhiều đường dẫn một lần (null = xóa). */
  update(values: Record<string, unknown>): Promise<void>
  onValue(path: string, onChange: (value: unknown) => void, onError?: (error: unknown) => void): () => void
  /** Mã các phòng dùng lần cuối (activity/{code}) ≤ cutoff, cũ nhất trước — chỉ đọc số, không tải cả phòng. */
  staleRooms(cutoff: number, limit: number): Promise<string[]>
  /** Tạm ngắt / nối lại kết nối mạng. */
  pause?(): void
  resume?(): void
}

/** Bản trong bộ nhớ (test): đếm số byte ghi để kiểm tra lượng dữ liệu gửi đi. */
export class MemoryRoomDb implements RoomDb {
  private root: Record<string, unknown> = {}
  private readonly listeners = new Set<{ path: string; cb: (v: unknown) => void }>()
  /** Tổng số byte đã ghi (JSON) — mỗi máy gửi lên bao nhiêu. */
  bytesWritten = 0

  private read(path: string): unknown {
    let node: unknown = this.root
    for (const k of path.split('/')) {
      if (node === null || typeof node !== 'object') return null
      node = (node as Record<string, unknown>)[k]
    }
    return node === undefined ? null : structuredClone(node)
  }

  private write(path: string, value: unknown) {
    this.bytesWritten += value === null ? 4 : JSON.stringify(value).length
    const keys = path.split('/')
    let node = this.root
    for (const k of keys.slice(0, -1)) node = (node[k] ??= {}) as Record<string, unknown>
    const last = keys[keys.length - 1]
    if (value === null) delete node[last]
    else node[last] = structuredClone(value)
    this.prune(this.root)
  }

  /** Xóa nhánh rỗng (giống Firebase). */
  private prune(node: Record<string, unknown>) {
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') {
        this.prune(v as Record<string, unknown>)
        if (!Object.keys(v).length) delete node[k]
      }
    }
  }

  private notify(paths: string[]) {
    for (const l of this.listeners) {
      if (paths.some((p) => p.startsWith(l.path) || l.path.startsWith(p))) {
        const value = this.read(l.path)
        queueMicrotask(() => l.cb(value))
      }
    }
  }

  async get(path: string) {
    return this.read(path)
  }

  async transaction(path: string, fn: (current: unknown) => unknown) {
    const next = fn(this.read(path))
    if (next === undefined) return { committed: false }
    this.write(path, next)
    this.notify([path])
    return { committed: true }
  }

  async update(values: Record<string, unknown>) {
    for (const [path, value] of Object.entries(values)) this.write(path, value)
    this.notify(Object.keys(values))
  }

  onValue(path: string, cb: (value: unknown) => void) {
    const l = { path, cb }
    this.listeners.add(l)
    const value = this.read(path)
    queueMicrotask(() => cb(value))
    return () => {
      this.listeners.delete(l)
    }
  }

  async staleRooms(cutoff: number, limit: number) {
    const activity = (this.read('activity') ?? {}) as Record<string, number>
    return Object.entries(activity)
      .filter(([, at]) => at <= cutoff)
      .sort(([, a], [, b]) => a - b)
      .slice(0, limit)
      .map(([code]) => code)
  }
}
