import { useState } from 'react'
import type { ID, Session } from '../core/types'

/** "Tôi là ai" trong buổi — lưu riêng trên máy này (mỗi điện thoại một người). */
const key = (sessionId: ID) => `candypot:me:${sessionId}`

export function readMe(sessionId: ID): ID | null {
  try {
    return localStorage.getItem(key(sessionId))
  } catch {
    return null
  }
}

export function writeMe(sessionId: ID, playerId: ID): void {
  try {
    localStorage.setItem(key(sessionId), playerId)
  } catch {
    // Không lưu được thì chỉ mất lựa chọn khi tải lại trang
  }
}

/** Người chơi của máy này; mặc định là người đầu tiên đang chơi. */
export function useMe(session: Session): [ID | undefined, (id: ID) => void] {
  const [stored, setStored] = useState(() => readMe(session.id))
  const valid = session.players.find((p) => p.id === stored)
  const me = valid?.id ?? session.players.find((p) => p.active)?.id
  const set = (id: ID) => {
    writeMe(session.id, id)
    setStored(id)
  }
  return [me, set]
}
