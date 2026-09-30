import { useEffect, useState } from 'react'
import type { Session } from '../../core/types'
import { actions, useApp } from '../../store'
import potIcon from '../../assets/pot.webp'
import { roundNumber } from '../format'
import { GameIcon } from './GameIcon'

/**
 * Host hoàn tác lượt trao pot của một ván đã xong → popup Pot giữa màn hình (đè lên pot hiện tại):
 * chọn lại người nhận đúng; ván cũ được tính lại, ván đang chơi không bị ảnh hưởng.
 */
export function ReawardSheet({ session }: { session: Session }) {
  const reaward = useApp((s) => s.reaward)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reaward) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && actions().reassignAward(undefined)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reaward])

  if (!reaward) return null
  const game = session.games.find((g) => g.id === reaward.gameId)
  const round = game?.rounds.find((r) => r.id === reaward.roundId)
  const award = round?.moves.find((m) => m.id === reaward.moveId)
  if (!game || !round || !award) return null
  const people = session.players.filter((p) => round.participants.includes(p.id) || p.id === award.to)

  const pick = (id: string) => {
    const errors = actions().reassignAward(id)
    setError(errors[0] ?? null)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Trao lại pot">
      <button type="button" aria-label="Giữ nguyên" className="absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={() => actions().reassignAward(undefined)} />
      <div className="pop relative w-full max-w-sm rounded-[2rem] border-2 border-lemon/70 bg-plum p-5 text-center shadow-2xl">
        <h2 className="font-display text-xl font-bold">Trao lại pot</h2>
        <p className="text-xs text-muted">
          <GameIcon type={game.type} /> {game.name} · {round.kind === 'manual' ? 'Chuyển tay' : `Ván ${roundNumber(game, round)}`}
        </p>

        {/* Pot của ván đó — như ô Pot trên bàn */}
        <div className="mx-auto mt-3 flex w-fit flex-col items-center rounded-3xl border-2 border-dashed border-lemon/60 bg-night/50 px-6 pt-2 pb-3">
          <span className="flex items-center gap-1 text-xs font-bold text-lemon">
            <img src={potIcon} alt="" draggable={false} className="size-5" />
            Pot
          </span>
          <span className="candy num mt-1 text-2xl">{award.amount}</span>
        </div>
        <p className="mt-2 text-sm text-muted">Chọn đúng người thắng để trao lại:</p>

        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {people.map((p) => {
            const current = p.id === award.to
            return (
              <li key={p.id} className="w-[calc((100%-1rem)/3)]">
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 active:scale-95 ${
                    current ? 'border-lemon/70 bg-lemon/10' : 'border-line bg-night/50'
                  }`}
                >
                  <span aria-hidden className="text-3xl leading-none">
                    {p.emoji}
                  </span>
                  <span className="w-full truncate text-sm font-semibold">{p.name}</span>
                  {current && <span className="text-[10px] font-bold text-lemon">đang nhận</span>}
                </button>
              </li>
            )
          })}
        </ul>
        {error && <p className="mt-2 text-sm text-berry">{error}</p>}
        <button type="button" onClick={() => actions().reassignAward(undefined)} className="mt-3 text-sm font-semibold text-muted">
          Giữ nguyên
        </button>
      </div>
    </div>
  )
}
