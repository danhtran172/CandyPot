import { useEffect, useState } from 'react'
import { POT, type Game, type ID, type Move, type Round, type Session } from '../../core/types'
import { actions } from '../../store'
import { potOf } from '../../core/round'
import { playerMap, roundNumber, signed, timeOf } from '../format'
import { ask } from '../dialog'
import { UndoIcon } from './UndoIcon'
import potIcon from '../../assets/pot.webp'
import { Who } from './kit'
import { PingButton } from './PingButton'

/**
 * Lịch sử trả/nhận của riêng mình trong một game: lời đòi đang chờ, các lượt mình trả/nhận.
 * Bàn một máy (host ghi hộ cả bàn): hiện mọi lượt của cả bàn.
 * Host bàn nhiều người có thêm tab "Pot cả ván": mọi lượt cược vào / trao từ Pot của mọi người, theo từng ván.
 * Hoàn tác: host làm ngay; người khác gửi yêu cầu để host xác nhận.
 */
export function HistorySheet({ session, game, me, onClose }: { session: Session; game: Game; me?: ID; onClose: () => void }) {
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const players = playerMap(session)
  const isHost = !!me && me === session.hostId
  const whole = session.mode !== 'multi'
  // Host bàn nhiều người: xem được toàn bộ lượt vào / ra Pot (game có Pot)
  const hasPot = game.type === 'loto' || game.type === 'free' || game.type === 'poker'
  const [view, setView] = useState<'mine' | 'pot'>('mine')
  const potView = view === 'pot' && isHost && !whole && hasPot
  const involves = (m: Move) => (potView ? m.from === POT || m.to === POT : whole || m.from === me || m.to === me)
  // Lời đòi còn chờ người bị đòi (bị từ chối / nhờ host thì xem ở 📨 Yêu cầu)
  const asking = potView ? [] : session.requests.filter((r) => r.gameId === game.id && !r.status && (r.to === me || r.from === me))
  const rounds = game.rounds
    .map((r) => ({ round: r, moves: r.moves.filter(involves) }))
    .filter((x) => x.moves.length > 0)
    .sort((a, b) => b.round.at - a.round.at)
  const pendingUndo = new Map(session.undos.map((u) => [u.moveId, u]))

  const undo = async (r: Round, m: Move) => {
    if (!me) return
    if (isHost) {
      const ok = await ask('Hoàn tác lượt này?', {
        icon: '↩️',
        message: (
          <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
            <Who player={players[m.from]} className="font-semibold text-sky" /> →
            <Who player={players[m.to]} className="font-semibold text-sky" /> · {m.amount} kẹo
          </span>
        ),
        okLabel: 'Hoàn tác',
      })
      if (!ok) return
      const errors = actions().undoMove(game.id, r.id, m.id)
      // Hoàn tác trao pot của ván đã xong → popup chọn lại người nhận hiện lên; đóng danh sách này
      if (!errors.length && actions().reaward) return onClose()
      setNote(errors.length ? { text: errors[0], bad: true } : { text: 'Đã hoàn tác.' })
    } else {
      const errors = actions().requestUndo(game.id, r.id, m.id, me)
      setNote(
        errors.length
          ? { text: errors[0], bad: true }
          : { text: `Đã gửi yêu cầu hoàn tác — chờ ${players[session.hostId ?? '']?.name ?? 'host'} xác nhận.` },
      )
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Lịch sử trả/nhận">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-[2rem] border-t border-line bg-plum pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="font-display px-5 text-xl font-bold">
          📜 Trả/nhận {whole ? 'cả bàn' : potView ? 'Pot' : 'của bạn'} · {game.name}
        </h2>
        {isHost && !whole && hasPot && (
          <div role="tablist" className="mx-5 mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-night/50 p-1 text-sm">
            {(
              [
                ['mine', 'Của bạn'],
                ['pot', 'Pot cả ván'],
              ] as const
            ).map(([k, text]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setView(k)}
                className={`rounded-xl py-1.5 font-semibold ${view === k ? 'bg-plum-2 text-lemon' : 'text-muted'}`}
              >
                {k === 'pot' ? (
                  <>
                    <img src={potIcon} alt="" draggable={false} className="mr-1 inline size-4 align-[-3px]" />
                    {text}
                  </>
                ) : (
                  text
                )}
              </button>
            ))}
          </div>
        )}
        <p className="px-5 text-xs text-muted">
          {isHost ? 'Bạn là host: bấm ' : 'Bấm '}
          <UndoIcon className="size-3.5 align-[-2px]" />
          {isHost ? ' để hoàn tác ngay.' : ' để xin hoàn tác — host sẽ xác nhận.'}
        </p>
        {note && <p className={`mx-5 mt-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${note.bad ? 'bg-berry/20 text-berry' : 'bg-mint/15 text-mint'}`}>{note.text}</p>}

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
                        className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100 active:scale-90"
                        onClick={() => actions().cancelRequest(r.id)}
                      >
                        <UndoIcon className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rounds.length === 0 && asking.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              {potView ? 'Chưa ai cược vào Pot trong game này.' : whole ? 'Chưa ai trả kẹo trong game này.' : 'Bạn chưa trả hay nhận kẹo nào trong game này.'}
            </p>
          )}

          {rounds.map(({ round: r, moves }) => (
            <section key={r.id} className="mb-3">
              <h3 className="mb-1 flex justify-between px-1 text-xs font-bold tracking-wide text-muted uppercase">
                <span>
                  {r.kind === 'manual' ? 'Chuyển tay' : `Ván ${roundNumber(game, r)}`}
                  {r.status === 'open' && <span className="ml-1.5 text-mint normal-case">● đang chơi</span>}
                </span>
                <span className="font-normal normal-case">
                  {potView && r.status === 'open' && <b className="mr-1.5 text-lemon">Pot còn {potOf(r)}</b>}
                  {timeOf(r.at)}
                </span>
              </h3>
              <ul className="rounded-2xl bg-night/40">
                {[...moves].reverse().map((m) => {
                  const d = m.to === me ? m.amount : -m.amount
                  const waiting = pendingUndo.get(m.id)
                  return (
                    <li key={m.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 text-sm last:border-0">
                      {potView || (whole && m.from !== me && m.to !== me) ? (
                        <>
                          <Who player={players[m.from]} className="min-w-0 font-semibold text-sky" />
                          <span className="text-muted">→</span>
                          <Who player={players[m.to]} className="min-w-0 font-semibold text-sky" />
                          <span className="candy num ml-auto text-sm">{m.amount}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-muted">{d > 0 ? 'Nhận từ' : m.to === POT ? 'Cược vào' : 'Trả cho'}</span>
                          <Who player={players[d > 0 ? m.from : m.to]} className="min-w-0 font-semibold text-sky" />
                          <span className={`num font-display ml-auto text-base font-extrabold ${d > 0 ? 'text-mint' : 'text-berry'}`}>
                            {signed(d)}
                          </span>
                        </>
                      )}
                      {waiting ? (
                        <>
                          <span className="text-[11px] whitespace-nowrap text-lemon">⏳ chờ host</span>
                          {waiting.by === me && <PingButton req={waiting} />}
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label={isHost ? 'Hoàn tác lượt này' : 'Xin hoàn tác lượt này'}
                          className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100 active:scale-90"
                          onClick={() => undo(r, m)}
                        >
                          <UndoIcon className="size-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
