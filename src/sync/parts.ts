import type { Game, Round, Session } from '../core/types'

/**
 * Bàn chia thành từng mẩu để lưu trên phòng: bấm một lần chỉ gửi đúng mẩu vừa đổi (thường 1 ván),
 * máy khác cũng chỉ nhận mẩu đó — không phải gửi lại nguyên bàn.
 *   core           bàn trừ các game (người chơi, host, lời đòi, hoàn tác…) + thứ tự game
 *   g_<game>       cài đặt một game (không kèm ván)
 *   r_<game>_<ván> một ván
 * Mỗi mẩu là chuỗi JSON (cơ sở dữ liệu không bỏ mảng rỗng / undefined của mình).
 */
export type Parts = Record<string, string>

type Core = Omit<Session, 'games' | 'updatedAt'> & { gameIds: string[] }

/** `updatedAt` không nằm trong mẩu nào (đổi mỗi lần bấm) — lưu riêng ở meta của phòng. */
export function toParts(session: Session): Parts {
  const { games, updatedAt: _updatedAt, ...rest } = session
  const parts: Parts = { core: JSON.stringify({ ...rest, gameIds: games.map((g) => g.id) } satisfies Core) }
  for (const { rounds, ...game } of games) {
    // Giữ đúng thứ tự ván (không dựa vào giờ — hai ván có thể cùng một mili giây)
    parts[`g_${game.id}`] = JSON.stringify({ ...game, roundIds: rounds.map((r) => r.id) })
    for (const r of rounds) parts[`r_${game.id}_${r.id}`] = JSON.stringify(r)
  }
  return parts
}

/** Ghép các mẩu lại thành bàn; thiếu phần chung thì null (phòng đang tạo dở). */
export function fromParts(parts: Parts, updatedAt = 0): Session | null {
  if (!parts.core) return null
  try {
    const { gameIds, ...core } = JSON.parse(parts.core) as Core
    const rounds: Record<string, Round[]> = {}
    for (const [key, value] of Object.entries(parts)) {
      if (!key.startsWith('r_')) continue
      const gameId = key.slice(2, key.indexOf('_', 2))
      ;(rounds[gameId] ??= []).push(JSON.parse(value) as Round)
    }
    const games = gameIds.flatMap((id): Game[] => {
      const raw = parts[`g_${id}`]
      if (!raw) return []
      const { roundIds = [], ...game } = JSON.parse(raw) as Omit<Game, 'rounds'> & { roundIds?: string[] }
      // Ván theo thứ tự đã lưu; ván chưa có trong danh sách (máy khác vừa thêm) xếp sau theo giờ
      const order = new Map(roundIds.map((rid, i) => [rid, i]))
      const list = (rounds[id] ?? []).sort(
        (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || a.at - b.at || (a.id < b.id ? -1 : 1),
      )
      return [{ ...game, rounds: list }]
    })
    return { ...core, updatedAt, games }
  } catch {
    return null
  }
}

/** Các mẩu khác nhau giữa hai bản: giá trị mới, hoặc null = mẩu đã bị xóa. */
export function diffParts(before: Parts, after: Parts): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(after)) if (before[key] !== value) out[key] = value
  for (const key of Object.keys(before)) if (!(key in after)) out[key] = null
  return out
}
