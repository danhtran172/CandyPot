import { useMemo } from 'react'
import type { ID, Session } from '../core/types'
import { actions, useApp } from '../store'
import { ask } from './dialog'

/** Những người đang có máy mở bàn (chấm xanh). Máy này mất kết nối / tạm ngắt thì không biết → không hiện ai. */
export function useOnlineIds(): Set<ID> {
  const present = useApp((s) => s.present)
  const online = useApp((s) => s.online)
  const paused = useApp((s) => s.paused)
  return useMemo(() => new Set(online && !paused ? present : []), [present, online, paused])
}

/**
 * Host đang offline — chỉ khi chắc chắn: máy mình đang kết nối và đã thấy chính mình online
 * (tránh báo nhầm lúc vừa mở bàn, chưa nhận danh sách).
 */
export function useHostAway(session: Session, me: ID | undefined): boolean {
  const ids = useOnlineIds()
  if (session.mode !== 'multi' || !me || me === session.hostId || !ids.has(me)) return false
  const host = session.players.find((p) => p.id === session.hostId && !p.removed)
  return !host || !ids.has(host.id)
}

/** Host offline → hỏi lại rồi nhận làm host. Hai người cùng bấm thì ai ghi trước được. */
export async function confirmTakeHost(session: Session, me: ID): Promise<void> {
  const hostName = session.players.find((p) => p.id === session.hostId)?.name ?? 'Host'
  const ok = await ask(`${hostName} đang offline`, {
    icon: '🛎️',
    message: 'Bạn làm host thay để mở / chốt ván? Host cũ quay lại thì bạn chuyển lại được.',
    okLabel: 'Làm host',
  })
  if (ok) actions().takeHost(me, session.hostId)
}
