import { POT, type Game, type ID, type Player, type Round, type Session } from '../core/types'

export function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${-n}`
  return '0'
}

export function toneOf(n: number): string {
  if (n > 0) return 'text-mint'
  if (n < 0) return 'text-berry'
  return 'text-muted'
}

export const POT_PLAYER: Player = { id: POT, name: 'Pot', emoji: '🫙', active: true }

/** Tra người chơi theo id (kèm pot). */
export function playerMap(session: Session): Record<ID, Player> {
  return Object.fromEntries([...session.players, POT_PLAYER].map((p) => [p.id, p]))
}

export function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function dateOf(at: number): string {
  return new Date(at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Số thứ tự ván trong game, không tính lượt chuyển tay. */
export function roundNumber(game: Game, round: Round): number {
  return game.rounds.filter((r) => r.kind === 'play' && r.at <= round.at).length
}

/** Số ván đã chốt. */
export function playCount(game: Game): number {
  return game.rounds.filter((r) => r.kind === 'play' && r.status === 'closed').length
}
