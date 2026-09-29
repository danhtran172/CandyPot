import { useEffect, useRef, useState } from 'react'
import type { Session } from '../../core/types'
import { actions } from '../../store'
import { playerMap } from '../format'
import { useMe } from '../me'
import { Button, Who } from './kit'

/** Thông báo "X đòi bạn N kẹo" cho người bị đòi; bấm OK là chuyển kẹo. */
export function RequestInbox({ session }: { session: Session }) {
  const [me] = useMe(session)
  const [error, setError] = useState<string | null>(null)
  const players = playerMap(session)
  const mine = session.requests.filter((r) => r.from === me)
  const ids = mine.map((r) => r.id).join()
  const seen = useRef(new Set<string>())

  // Rung nhẹ khi có lời đòi mới
  useEffect(() => {
    const fresh = ids.split(',').filter((id) => id && !seen.current.has(id))
    fresh.forEach((id) => seen.current.add(id))
    if (fresh.length) navigator.vibrate?.(200)
  }, [ids])

  if (!mine.length) return null
  const req = mine[0]
  const game = session.games.find((g) => g.id === req.gameId)

  const answer = (accept: boolean) => {
    const errors = actions().answerRequest(req.id, accept)
    setError(errors[0] ?? null)
  }

  return (
    <div role="alertdialog" aria-label="Có người đòi kẹo" className="fixed inset-x-0 top-0 z-40 mx-auto max-w-lg px-3 pt-3">
      <div className="pop rounded-3xl border-2 border-lemon bg-plum-2 p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-4xl">
            {players[req.to]?.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg leading-tight font-bold">
              {players[req.to]?.name} đòi bạn <span className="candy num text-base">{req.amount}</span>
            </div>
            <div className="text-xs text-muted">
              {game?.name}
              {mine.length > 1 && ` · còn ${mine.length - 1} lời đòi khác`}
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-berry">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button variant="danger" onClick={() => answer(false)}>
            Không
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => answer(true)}>
            OK, chuyển {req.amount} kẹo
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Who player={players[req.from]} /> → <Who player={players[req.to]} />
        </div>
      </div>
    </div>
  )
}
