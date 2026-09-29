import { settle } from './settle'
import { POT, type ID, type Move, type Net, type Round, type Session, type Transfer } from './types'

/** Lời/lỗ của các lần kéo, bỏ qua pot. */
export function movesNet(moves: Move[]): Net {
  const out: Net = {}
  for (const m of moves) {
    if (m.from !== POT) out[m.from] = (out[m.from] ?? 0) - m.amount
    if (m.to !== POT) out[m.to] = (out[m.to] ?? 0) + m.amount
  }
  return out
}

export function potOf(round: Round): number {
  return round.moves.reduce((s, m) => s + (m.to === POT ? m.amount : 0) - (m.from === POT ? m.amount : 0), 0)
}

/** Tổng kẹo mỗi người đã bỏ vào pot trong ván. */
export function contributions(round: Round): Record<ID, number> {
  const out: Record<ID, number> = {}
  for (const m of round.moves) if (m.to === POT) out[m.from] = (out[m.from] ?? 0) + m.amount
  return out
}

/** Giao dịch cuối cùng của ván. Ván có pot được gộp thành ít lượt trả nhất. */
export function closeTransfers(round: Round): Transfer[] {
  if (potOf(round) !== 0) throw new Error(`Pot còn ${potOf(round)} kẹo — kéo pot cho người thắng trước khi chốt.`)
  if (round.moves.some((m) => m.from === POT || m.to === POT)) return settle(movesNet(round.moves), 'Poker')
  return round.moves.map((m) => ({ from: m.from, to: m.to, amount: m.amount, reason: m.label }))
}

export function openRound(session: Session, gameId: ID): Round | undefined {
  return session.games.find((g) => g.id === gameId)?.rounds.find((r) => r.status === 'open')
}

/** Dữ liệu cũ (trước khi có ván 2 bước) → dạng mới. */
export function normalizeSession(session: Session): Session {
  const { id, name, createdAt, updatedAt, players } = session
  return {
    id,
    name,
    createdAt,
    updatedAt,
    players,
    hostId: session.hostId ?? players?.[0]?.id ?? null,
    requests: session.requests ?? [],
    undos: session.undos ?? [],
    games: session.games.map((g) => ({
      ...g,
      rounds: g.rounds.map((r) => {
        const legacy = r as Partial<Round>
        return {
          ...r,
          status: legacy.status ?? 'closed',
          stakes: legacy.stakes ?? {},
          dealer: legacy.dealer ?? null,
          moves:
            legacy.moves ??
            r.transfers.map((t, i) => ({ id: `${r.id}-${i}`, from: t.from, to: t.to, amount: t.amount, label: t.reason })),
          tags: (r.tags ?? []).filter((t) => t.type === 'lam-cai'),
        }
      }),
    })),
  }
}
