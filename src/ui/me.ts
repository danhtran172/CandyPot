import { useState } from 'react'
import type { ID, Session } from '../core/types'

/**
 * "Tôi là ai" trong buổi — lưu trên máy này (mỗi điện thoại một người).
 * Một cửa sổ có thể nhận vai riêng (sessionStorage) để giả lập nhiều người trên cùng máy.
 */
const deviceKey = (sessionId: ID) => `candypot:me:${sessionId}`
const windowKey = (sessionId: ID) => `candypot:me-window:${sessionId}`

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value)
  } catch {
    // Không lưu được thì chỉ mất lựa chọn khi tải lại trang
  }
}

export function readMe(sessionId: ID): ID | null {
  return safeGet(() => sessionStorage, windowKey(sessionId)) ?? safeGet(() => localStorage, deviceKey(sessionId))
}

export function writeMe(sessionId: ID, playerId: ID): void {
  safeSet(() => localStorage, deviceKey(sessionId), playerId)
}

/** Cửa sổ này nhận vai `playerId` (không ảnh hưởng cửa sổ khác). */
export function writeWindowMe(sessionId: ID, playerId: ID): void {
  safeSet(() => sessionStorage, windowKey(sessionId), playerId)
}

/** Người chơi của cửa sổ/máy này; mặc định là người đầu tiên đang chơi. */
export function useMe(session: Session | null | undefined): [ID | undefined, (id: ID) => void] {
  const [, rerender] = useState(0)
  const stored = session ? readMe(session.id) : null
  const valid = session?.players.find((p) => p.id === stored)
  const me = valid?.id ?? session?.players.find((p) => p.active)?.id
  const set = (id: ID) => {
    if (!session) return
    if (safeGet(() => sessionStorage, windowKey(session.id))) writeWindowMe(session.id, id)
    else writeMe(session.id, id)
    rerender((n) => n + 1)
  }
  return [me, set]
}
