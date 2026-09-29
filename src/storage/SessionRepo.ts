import type { ID, Session } from '../core/types'

export interface SessionMeta {
  id: ID
  name: string
  updatedAt: number
  playerCount: number
}

/** Nơi lưu buổi chơi. Giai đoạn 1: localStorage; giai đoạn 2 thêm đồng bộ Firebase. */
export interface SessionRepo {
  list(): SessionMeta[]
  load(id: ID): Session | null
  save(session: Session): void
  remove(id: ID): void
}
