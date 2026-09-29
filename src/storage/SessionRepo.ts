import type { ID, Session } from '../core/types'

export interface SessionMeta {
  id: ID
  name: string
  updatedAt: number
  playerCount: number
  /** Mã bàn 5 số (bàn nhiều người). */
  code?: string
}

/** Nơi lưu bàn chơi. Giai đoạn 1: localStorage; giai đoạn 2 thêm đồng bộ Firebase. */
export interface SessionRepo {
  list(): SessionMeta[]
  load(id: ID): Session | null
  save(session: Session): void
  remove(id: ID): void
}
