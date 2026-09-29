import { useEffect } from 'react'
import type { Game, ID, Move, Session } from '../../core/types'
import { actions } from '../../store'
import { playerMap, roundNumber, signed, timeOf } from '../format'
import { Who } from './kit'

/** Popup "Lịch sử trả/nhận" của một game: lời đòi đang chờ, ván đang chơi, các ván trước. */
export function HistorySheet({ session, game, me, onClose }: { session: Session; game: Game; me?: ID; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const players = playerMap(session)
  const asking = session.requests.filter((r) => r.gameId === game.id && (r.to === me || r.from === me))
  const rounds = [...game.rounds].filter((r) => r.moves.length > 0).sort((a, b) => b.at - a.at)

  /** Góc nhìn của mình: + khi nhận, − khi trả. */
  const mine = (m: Move) => (m.to === me ? m.amount : m.from === me ? -m.amount : 0)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Lịch sử trả/nhận">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-[2rem] border-t border-line bg-plum pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="font-display px-5 text-xl font-bold">📜 Lịch sử trả/nhận · {game.name}</h2>

        <div className="mt-2 overflow-y-auto px-4">
          {asking.length > 0 && (
            <section className="mb-3">
              <h3 className="mb-1 px-1 text-xs font-bold tracking-wide text-muted uppercase">Đang đòi · chờ xác nhận</h3>
              <ul className="rounded-2xl bg-night/40">
                {asking.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 text-sm last:border-0">
                    <Who player={players[r.to]} className="min-w-0 font-semibold text-sky" />
                    <span className="text-muted">đòi</span>
                    <Who player={players[r.from]} className="min-w-0 font-semibold text-sky" />
                    <span className="candy num ml-auto text-sm">{r.amount}</span>
                    {r.to === me && (
                      <button
                        type="button"
                        aria-label="Hủy lời đòi"
                        className="px-1 text-muted hover:text-berry"
                        onClick={() => actions().cancelRequest(r.id)}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rounds.length === 0 && asking.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Chưa có lượt trả/nhận nào trong game này.</p>
          )}

          {rounds.map((r) => {
            const open = r.status === 'open'
            return (
              <section key={r.id} className="mb-3">
                <h3 className="mb-1 flex justify-between px-1 text-xs font-bold tracking-wide text-muted uppercase">
                  <span>
                    {r.kind === 'manual' ? 'Chuyển tay' : `Ván ${roundNumber(game, r)}`}
                    {open && <span className="ml-1.5 text-mint normal-case">● đang chơi</span>}
                  </span>
                  <span className="font-normal normal-case">{timeOf(r.at)}</span>
                </h3>
                <ul className="rounded-2xl bg-night/40">
                  {[...r.moves].reverse().map((m) => {
                    const d = mine(m)
                    return (
                      <li key={m.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 text-sm last:border-0">
                        <Who player={players[m.from]} className="min-w-0 font-semibold text-sky" />
                        <span className="text-muted">→</span>
                        <Who player={players[m.to]} className="min-w-0 font-semibold text-sky" />
                        <span
                          className={`num ml-auto font-display text-base font-extrabold ${
                            d > 0 ? 'text-mint' : d < 0 ? 'text-berry' : 'text-cream'
                          }`}
                        >
                          {d ? signed(d) : m.amount}
                        </span>
                        {open && (
                          <button
                            type="button"
                            aria-label="Hoàn tác lượt này"
                            className="px-1 text-muted hover:text-berry"
                            onClick={() => actions().removeMove(game.id, r.id, m.id)}
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
