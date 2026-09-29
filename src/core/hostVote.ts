import type { ID, Session } from './types'

/** Số phiếu cần để bầu host mới — luôn 2, không phụ thuộc số người. */
export const HOST_VOTES_NEEDED = 2

export function hostVotesNeeded(_session: Session): number {
  return HOST_VOTES_NEEDED
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
