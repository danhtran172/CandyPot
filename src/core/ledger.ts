import type { ID, Net, Session, Transfer } from './types'

export function netOfTransfers(transfers: Transfer[], base: Net = {}): Net {
  const out: Net = { ...base }
  for (const t of transfers) {
    out[t.from] = (out[t.from] ?? 0) - t.amount
    out[t.to] = (out[t.to] ?? 0) + t.amount
  }
  return out
}

/** Lời/lỗ của mọi người chơi trong buổi (hoặc chỉ một game nếu truyền gameId). */
export function netOf(session: Session, gameId?: ID): Net {
  let net: Net = Object.fromEntries(session.players.map((p) => [p.id, 0]))
  for (const game of session.games) {
    if (gameId && game.id !== gameId) continue
    for (const round of game.rounds) net = netOfTransfers(round.transfers, net)
  }
  return net
}

export function renewCount(session: Session, playerId: ID): number {
  return session.renews.filter((r) => r.playerId === playerId).length
}

/** Kẹo trên tay = gói × (1 + số lần renew) + lời/lỗ. */
export function handOf(session: Session, playerId: ID, net: Net = netOf(session)): number {
  return session.settings.packSize * (1 + renewCount(session, playerId)) + (net[playerId] ?? 0)
}

export function assertZeroSum(net: Net): void {
  const total = Object.values(net).reduce((a, b) => a + b, 0)
  if (total !== 0) throw new Error(`Tổng lời/lỗ phải bằng 0 (đang là ${total})`)
}
