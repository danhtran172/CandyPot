import { useEffect, useRef, useState } from 'react'
import { POT, type ID, type Session } from '../../core/types'
import { useMe } from '../me'
import { GameIcon } from './GameIcon'
import { PotChip } from './kit'

type Award = { key: string; to: ID; amount: number; gameId: ID }

/** Mọi lượt kẹo đi ra từ Pot (trao pot) của bàn. Khóa gồm cả người nhận → host trao lại cho người khác cũng được báo. */
function potAwards(session: Session): Map<string, Award> {
  const out = new Map<string, Award>()
  for (const g of session.games)
    for (const r of g.rounds)
      for (const m of r.moves) {
        const key = `${m.id}:${m.to}`
        if (m.from === POT) out.set(key, { key, to: m.to, amount: m.amount, gameId: g.id })
      }
  return out
}

/**
 * Trao pot cho ai thì cả bàn (mọi máy đang mở bàn) thấy thông báo trên cùng: "🏆 X ăn N kẹo".
 * Chỉ báo lượt mới xuất hiện sau khi mở bàn (lượt cũ không báo lại). Tự ẩn sau vài giây, chạm để ẩn.
 */
export function PotAwardNotice({ session }: { session: Session }) {
  const [me] = useMe(session)
  const seen = useRef<{ sessionId: ID; ids: Set<string> } | null>(null)
  const [notice, setNotice] = useState<{ id: number; lines: { to: ID; amount: number; gameId: ID }[] } | null>(null)

  useEffect(() => {
    const awards = potAwards(session)
    // Lần đầu (hoặc đổi bàn): ghi nhận các lượt đã có, không báo
    if (seen.current?.sessionId !== session.id) {
      seen.current = { sessionId: session.id, ids: new Set(awards.keys()) }
      return
    }
    const fresh = [...awards.values()].filter((a) => !seen.current!.ids.has(a.key))
    seen.current.ids = new Set(awards.keys())
    if (!fresh.length) return
    // Gộp theo người nhận (VD Poker chia nhiều pot phụ cho cùng một người)
    const byPerson = new Map<ID, { to: ID; amount: number; gameId: ID }>()
    for (const a of fresh) {
      const cur = byPerson.get(a.to)
      byPerson.set(a.to, { to: a.to, gameId: a.gameId, amount: (cur?.amount ?? 0) + a.amount })
    }
    setNotice({ id: Date.now(), lines: [...byPerson.values()] })
    navigator.vibrate?.(120)
  }, [session])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(t)
  }, [notice])

  if (!notice) return null
  const players = new Map(session.players.map((p) => [p.id, p]))
  return (
    <button
      type="button"
      key={notice.id}
      role="status"
      aria-label="Thông báo trao pot"
      onClick={() => setNotice(null)}
      className="pop fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 mx-auto block w-[calc(100%-1.5rem)] max-w-md rounded-3xl border-2 border-lemon bg-plum-2 px-4 py-3 text-left shadow-2xl"
    >
      {notice.lines.map((l) => {
        const p = players.get(l.to)
        const game = session.games.find((g) => g.id === l.gameId)
        return (
          <div key={l.to} className="flex items-center gap-3">
            <span aria-hidden className="text-3xl leading-none">
              🏆
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-lg leading-tight font-bold">
                {l.to === me ? 'Bạn' : <span className="text-sky">{p?.emoji} {p?.name}</span>} ăn{' '}
                <span className="candy num text-base">{l.amount}</span> kẹo từ <PotChip className="text-sm" />
              </span>
              {game && (
                <span className="text-xs text-muted">
                  <GameIcon type={game.type} /> {game.name}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </button>
  )
}
