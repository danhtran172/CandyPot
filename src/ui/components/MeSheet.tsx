import { useEffect } from 'react'
import { netOf, netOfTransfers } from '../../core/ledger'
import { movesNet } from '../../core/round'
import type { ID, Session } from '../../core/types'
import { roundNumber, signed, timeOf, toneOf } from '../format'
import { GameIcon } from './GameIcon'
import { Button, Who } from './kit'

/**
 * Bấm avatar của chính mình trên bàn: 💤 tạm nghỉ / chơi lại, lời/lỗ của mình từng ván (mới nhất trước)
 * và tổng cả bàn. Trả/nhận chi tiết vẫn ở nút 📜 Trả/nhận.
 */
export function MeSheet({
  session,
  me,
  onRest,
  onClose,
}: {
  session: Session
  me: ID
  /** Đổi trạng thái nghỉ của mình (true = tạm nghỉ). */
  onRest: (resting: boolean) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const player = session.players.find((p) => p.id === me)
  const resting = player?.active === false
  const total = netOf(session)[me] ?? 0
  // Mọi ván mình chơi (hoặc có trả/nhận), mới nhất trước; ván đang mở tính theo các lượt kéo hiện có
  const rows = session.games
    .flatMap((game) =>
      game.rounds.map((round) => {
        const net = round.status === 'open' ? movesNet(round.moves) : netOfTransfers(round.transfers)
        return { game, round, delta: net[me] ?? 0 }
      }),
    )
    .filter(({ round, delta }) => round.participants.includes(me) || delta !== 0)
    .sort((a, b) => b.round.at - a.round.at)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Của bạn">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-[2rem] border-t border-line bg-plum pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center gap-3 px-5">
          <Who player={player} className="font-display min-w-0 flex-1 text-xl font-bold" />
          <span className="text-right leading-tight">
            <span className="block text-[10px] font-semibold text-muted">Cả bàn</span>
            <b className={`num font-display text-2xl ${toneOf(total)}`}>{signed(total)}</b>
          </span>
        </div>

        <div className="mt-3 px-5">
          <Button
            variant={resting ? 'primary' : undefined}
            className={`w-full py-2.5 ${resting ? '' : 'border-grape/60 text-grape'}`}
            onClick={() => onRest(!resting)}
          >
            {resting ? '▶ Chơi lại' : '💤 Tạm nghỉ'}
          </Button>
          <p className="mt-1 text-center text-xs text-muted">
            {resting ? 'Bạn đang nghỉ — không vào ván mới.' : 'Nghỉ thì không vào ván mới, lời/lỗ vẫn giữ.'}
          </p>
        </div>

        <h3 className="mt-3 px-5 text-xs font-bold tracking-wide text-muted uppercase">Lời/lỗ từng ván</h3>
        <div className="mt-1 overflow-y-auto px-4">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Bạn chưa chơi ván nào.</p>
          ) : (
            <ul className="rounded-2xl bg-night/40">
              {rows.map(({ game, round, delta }) => (
                <li key={round.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2 text-sm last:border-0">
                  <span className="min-w-0 flex-1 truncate">
                    <GameIcon type={game.type} /> {game.name} · {round.kind === 'manual' ? 'Chuyển tay' : `Ván ${roundNumber(game, round)}`}
                    {round.status === 'open' && <span className="ml-1.5 text-xs text-mint">● đang chơi</span>}
                  </span>
                  <span className="text-[11px] text-muted">{timeOf(round.at)}</span>
                  <b className={`num font-display w-12 text-right text-base ${toneOf(delta)}`}>{signed(delta)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
