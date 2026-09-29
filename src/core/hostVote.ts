import type { ID, Session } from './types'

/** Tỉ lệ phiếu tối thiểu (so với số người đang chơi) và số phiếu tối thiểu để bầu host mới. */
export const HOST_VOTE_RATIO = 0.3
export const HOST_VOTE_MIN = 2

/** Số phiếu cần để bầu host mới: ≥ 30% số người đang chơi (làm tròn lên), tối thiểu 2. */
export function hostVotesNeeded(session: Session): number {
  const active = session.players.filter((p) => p.active).length
  return Math.max(HOST_VOTE_MIN, Math.ceil(active * HOST_VOTE_RATIO))
}

/** Số phiếu hiện có của từng ứng viên (chỉ tính phiếu của người đang chơi, bỏ phiếu cho host hiện tại). */
export function hostVoteTally(session: Session): Record<ID, number> {
  const active = new Set(session.players.filter((p) => p.active).map((p) => p.id))
  const tally: Record<ID, number> = {}
  for (const [voter, candidate] of Object.entries(session.hostVotes)) {
    if (!active.has(voter) || candidate === session.hostId) continue
    tally[candidate] = (tally[candidate] ?? 0) + 1
  }
  return tally
}
