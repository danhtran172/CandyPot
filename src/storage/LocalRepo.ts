import type { ID, Session } from '../core/types'
import type { SessionMeta, SessionRepo } from './SessionRepo'

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const INDEX = 'candypot:sessions'
/** Máy chỉ giữ tối đa chừng này bàn — bàn cũ nhất (lâu không chơi) tự bị xóa khi có bàn mới. */
export const MAX_SAVED = 10
const sessionKey = (id: ID) => `candypot:session:${id}`

export class LocalRepo implements SessionRepo {
  private readonly kv: KV

  constructor(kv: KV = localStorage) {
    this.kv = kv
  }

  private read<T>(key: string, fallback: T): T {
    const raw = this.kv.getItem(key)
    if (!raw) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  private write(key: string, value: unknown): void {
    this.kv.setItem(key, JSON.stringify(value))
  }

  list(): SessionMeta[] {
    return this.read<SessionMeta[]>(INDEX, []).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  load(id: ID): Session | null {
    return this.read<Session | null>(sessionKey(id), null)
  }

  save(session: Session): void {
    this.write(sessionKey(session.id), session)
    const meta: SessionMeta = {
      id: session.id,
      name: session.name,
      updatedAt: session.updatedAt,
      playerCount: session.players.filter((p) => !p.removed).length,
      code: session.code,
      mode: session.mode,
    }
    // Giữ bàn đang lưu + (MAX_SAVED − 1) bàn chơi gần nhất; bàn cũ hơn xóa khỏi máy
    const others = this.list().filter((m) => m.id !== session.id)
    others.slice(MAX_SAVED - 1).forEach((m) => this.kv.removeItem(sessionKey(m.id)))
    this.write(INDEX, [meta, ...others.slice(0, MAX_SAVED - 1)])
  }

  remove(id: ID): void {
    this.kv.removeItem(sessionKey(id))
    this.write(
      INDEX,
      this.list().filter((m) => m.id !== id),
    )
  }
}

export class MemoryKV implements KV {
  private readonly map = new Map<string, string>()
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
}
