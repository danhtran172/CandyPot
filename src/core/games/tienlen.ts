import type { Game, GameModule, ID, Session } from '../types'

export const tienlen: GameModule = {
  type: 'tienlen',
  label: 'Tiến lên',
  minPlayers: 2,
  maxPlayers: 4,
  stakeMode: 'common',
}

/**
 * Tiến lên chỉ 4 người một bàn: ai đang được tick "chơi" (còn lại là tạm vắng).
 * Mặc định là 4 người đầu danh sách đang chơi; người tạm nghỉ / đã xóa tự bị loại.
 */
export function seatedOf(session: Session, game: Game): ID[] {
  const active = session.players.filter((p) => p.active && !p.removed).map((p) => p.id)
  const kept = (game.seated ?? []).filter((id) => active.includes(id))
  if (game.seated && kept.length >= tienlen.minPlayers) return kept
  return active.slice(0, tienlen.maxPlayers)
}
