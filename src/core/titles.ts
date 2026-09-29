import { netOf, netOfTransfers } from './ledger'
import type { ID, Round, Session } from './types'

export interface Title {
  key: string
  emoji: string
  name: string
  description: string
  playerIds: ID[]
  value: number
}

/** Các ván đã chốt, theo thứ tự thời gian. */
export function roundsInOrder(session: Session): Round[] {
  return session.games
    .flatMap((g) => g.rounds)
    .filter((r) => r.status === 'closed')
    .sort((a, b) => a.at - b.at)
}

/** Người có giá trị cao nhất (hoặc thấp nhất); null nếu không ai đạt điều kiện. */
function pick(values: [ID, number][], mode: 'max' | 'min', accept: (v: number) => boolean) {
  const ok = values.filter(([, v]) => accept(v))
  if (!ok.length) return null
  const best = mode === 'max' ? Math.max(...ok.map(([, v]) => v)) : Math.min(...ok.map(([, v]) => v))
  return { playerIds: ok.filter(([, v]) => v === best).map(([id]) => id), value: best }
}

function longestWinStreak(rounds: Round[], playerId: ID): number {
  let best = 0
  let current = 0
  for (const r of rounds) {
    if (r.kind !== 'play' || !r.participants.includes(playerId)) continue
    const net = netOfTransfers(r.transfers)[playerId] ?? 0
    current = net > 0 ? current + 1 : 0
    best = Math.max(best, current)
  }
  return best
}

export function titles(session: Session): Title[] {
  const ids = session.players.map((p) => p.id)
  const net = netOf(session)
  const rounds = roundsInOrder(session)
  const out: Title[] = []
  const add = (key: string, emoji: string, name: string, description: string, r: ReturnType<typeof pick>) => {
    if (r) out.push({ key, emoji, name, description, ...r })
  }
  const per = (f: (id: ID) => number): [ID, number][] => ids.map((id) => [id, f(id)])

  add('vua-keo', '👑', 'Vua kẹo', 'Lời nhiều nhất', pick(per((id) => net[id]), 'max', (v) => v > 0))
  add('thanh-lo', '🕳️', 'Thánh lỗ', 'Lỗ nhiều nhất', pick(per((id) => net[id]), 'min', (v) => v < 0))
  add(
    'nong-tay',
    '🔥',
    'Nóng tay',
    'Chuỗi ván thắng liên tiếp dài nhất',
    pick(per((id) => longestWinStreak(rounds, id)), 'max', (v) => v >= 3),
  )

  const dealerNet: Record<ID, number> = {}
  for (const r of rounds) {
    for (const t of r.tags) {
      if (t.type !== 'lam-cai') continue
      dealerNet[t.playerId] = (dealerNet[t.playerId] ?? 0) + (netOfTransfers(r.transfers)[t.playerId] ?? 0)
    }
  }
  const dealers = Object.entries(dealerNet)
  add('cai-do', '🎰', 'Cái số đỏ', 'Lời nhiều nhất khi làm cái', pick(dealers, 'max', (v) => v > 0))
  add('cai-den', '💸', 'Cái số đen', 'Lỗ nhiều nhất khi làm cái', pick(dealers, 'min', (v) => v < 0))

  // Bất động: |lời/lỗ| nhỏ nhất trong số người đã chơi ≥ 5 ván (0 là "đạt" nhất nên không lọc ≠ 0)
  const played = (id: ID) => rounds.filter((r) => r.kind === 'play' && r.participants.includes(id)).length
  const steady = ids.filter((id) => played(id) >= 5).map((id): [ID, number] => [id, Math.abs(net[id])])
  add('bat-dong', '🪨', 'Bất động', 'Lời/lỗ gần 0 nhất (≥ 5 ván)', pick(steady, 'min', () => true))

  return out
}
