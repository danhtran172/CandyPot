import type { GameModule, ID, Session } from '../types'

export const tienlen: GameModule = {
  type: 'tienlen',
  label: 'Tiến lên',
  minPlayers: 2,
  maxPlayers: 4,
  stakeMode: 'common',
}

/**
 * Người chơi Tiến lên = mọi người không tạm nghỉ (chọn ở tab Người chơi: ai không chơi thì cho nghỉ 💤).
 * Quá 4 người thì chưa mở ván được.
 */
export function seatedOf(session: Session): ID[] {
  return session.players.filter((p) => p.active && !p.removed).map((p) => p.id)
}
