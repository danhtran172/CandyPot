import { useEffect } from 'react'
import type { Player } from '../../core/types'
import { signed, toneOf } from '../format'
import { CandyPile } from './CandyPile'
import { Who } from './kit'

/** Popup xem đống kẹo (hoặc 💩) của một người khi bấm vào avatar. */
export function PileSheet({
  player,
  amount,
  round,
  unit,
  onClose,
}: {
  player: Player
  /** Cả buổi + ván đang mở. */
  amount: number
  /** Được/mất trong ván đang mở; undefined = không có ván. */
  round?: number
  unit: number
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-label={`Kẹo của ${player.name}`}>
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-xs rounded-[2rem] border border-line bg-plum px-5 pt-5 pb-4 text-center shadow-2xl">
        <div className="font-display text-xl font-bold">
          <Who player={player} className="text-sky" />
        </div>
        <div className="mt-4 flex min-h-28 items-end justify-center">
          {amount === 0 ? (
            <p className="pb-6 text-sm text-muted">Chưa có kẹo nào — hòa vốn.</p>
          ) : (
            <CandyPile amount={amount} unit={unit} seed={player.id} size={34} />
          )}
        </div>
        <div className={`num font-display mt-3 text-3xl font-extrabold ${toneOf(amount)}`}>{signed(amount)} kẹo</div>
        <div className="mt-1 text-xs text-muted">
          {round !== undefined && round !== 0 && (
            <>
              ván này <b className={toneOf(round)}>{signed(round)}</b> ·{' '}
            </>
          )}
          mỗi hình ≈ {unit} kẹo
        </div>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl bg-plum-2 py-2.5 font-semibold">
          Đóng
        </button>
      </div>
    </div>
  )
}
