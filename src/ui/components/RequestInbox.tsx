import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '../../core/types'
import { actions } from '../../store'
import { playerMap, roundNumber } from '../format'
import { useMe } from '../me'
import { Button, Who } from './kit'

/**
 * Thông báo cần mình trả lời:
 * - "X đòi bạn N kẹo" (mình là người bị đòi) — OK thì chuyển kẹo;
 * - "X muốn hoàn tác …" (mình là host) — OK thì bỏ lượt đó.
 */
export function RequestInbox({ session }: { session: Session }) {
  const [me] = useMe(session)
  const [error, setError] = useState<string | null>(null)
  const players = playerMap(session)
  const asks = session.requests.filter((r) => r.from === me)
  const undos = me && me === session.hostId ? session.undos : []
  const ids = [...asks, ...undos].map((r) => r.id).join()
  const seen = useRef(new Set<string>())

  // Rung nhẹ khi có thông báo mới
  useEffect(() => {
    const fresh = ids.split(',').filter((id) => id && !seen.current.has(id))
    fresh.forEach((id) => seen.current.add(id))
    if (fresh.length) navigator.vibrate?.(200)
  }, [ids])

  const total = asks.length + undos.length
  if (!total) return null
  const more = total > 1 && ` · còn ${total - 1} thông báo khác`

  const shell = (body: ReactNode, onNo: () => void, onYes: () => void, yesLabel: string) => (
    <div role="alertdialog" aria-label="Thông báo" className="fixed inset-x-0 top-0 z-40 mx-auto max-w-lg px-3 pt-3">
      <div className="pop rounded-3xl border-2 border-lemon bg-plum-2 p-4 shadow-2xl">
        {body}
        {error && <p className="mt-2 text-sm text-berry">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button variant="danger" onClick={onNo}>
            Không
          </Button>
          <Button variant="primary" className="flex-1" onClick={onYes}>
            {yesLabel}
          </Button>
        </div>
      </div>
    </div>
  )

  if (asks.length) {
    const req = asks[0]
    const game = session.games.find((g) => g.id === req.gameId)
    const answer = (accept: boolean) => setError(actions().answerRequest(req.id, accept)[0] ?? null)
    return shell(
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-4xl">
          {players[req.to]?.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight font-bold">
            <span className="text-sky">{players[req.to]?.name}</span> đòi bạn{' '}
            <span className="candy num text-base">{req.amount}</span>
          </div>
          <div className="text-xs text-muted">
            {game?.name}
            {more}
          </div>
        </div>
      </div>,
      () => answer(false),
      () => answer(true),
      `OK, chuyển ${req.amount} kẹo`,
    )
  }

  const u = undos[0]
  const game = session.games.find((g) => g.id === u.gameId)
  const round = game?.rounds.find((r) => r.id === u.roundId)
  const move = round?.moves.find((m) => m.id === u.moveId)
  const answer = (accept: boolean) => setError(actions().answerUndo(u.id, accept)[0] ?? null)
  return shell(
    <div className="flex items-center gap-3">
      <span aria-hidden className="text-4xl">
        ↩️
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg leading-tight font-bold">
          <span className="text-sky">{players[u.by]?.name}</span> muốn hoàn tác
        </div>
        {move ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
            <Who player={players[move.from]} className="font-semibold text-sky" />→
            <Who player={players[move.to]} className="font-semibold text-sky" />
            <span className="candy num text-sm">{move.amount}</span>
          </div>
        ) : (
          <div className="text-sm text-muted">Lượt này đã bị xóa.</div>
        )}
        <div className="text-xs text-muted">
          {game?.name}
          {round && (round.kind === 'manual' ? ' · Chuyển tay' : ` · Ván ${roundNumber(game!, round)}`)}
          {more}
        </div>
      </div>
    </div>,
    () => answer(false),
    () => answer(true),
    'OK, hoàn tác',
  )
}
