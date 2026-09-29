import { useEffect, useState } from 'react'
import type { Game } from '../../core/types'
import { tienlenBets } from '../../core/suggest'
import { actions } from '../../store'
import { Button } from './kit'
import { TienlenBetInputs } from './TienlenBetInputs'

/** Tiến lên: host đặt Rule (mức Nhất/Nhì) — là các số gợi ý khi kéo trả kẹo. */
export function TienlenBetSheet({ game, onDone }: { game: Game; onDone: (saved: boolean) => void }) {
  const init = tienlenBets(game)
  const [bet, setBet] = useState(init.bet)
  const [bet2, setBet2] = useState(init.bet2 ?? Math.max(1, Math.round(init.bet / 2)))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const save = () => {
    const errors = actions().setTienlenBets(game.id, bet, bet2)
    if (errors.length) setError(errors[0])
    else onDone(true)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Rule Tiến lên" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={() => onDone(false)} />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">
        <h2 className="font-display text-center text-xl font-bold">
          <span className="text-sky">Rule</span> · Tiến lên
        </h2>
        <p className="mt-1 text-center text-xs text-muted">Số gợi ý khi kéo trả kẹo: Nhì, Nhất, Nhất × 1,5, Nhất × 2.</p>
        <div className="mt-4">
          <TienlenBetInputs
            bet={bet}
            bet2={bet2}
            onChange={(v) => {
              setBet(v.bet)
              setBet2(v.bet2)
            }}
          />
        </div>
        {error && <p className="mt-3 text-center text-sm text-berry">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => onDone(false)}>
            Thôi
          </Button>
          <Button variant="primary" className="flex-1" onClick={save}>
            Lưu
          </Button>
        </div>
      </div>
    </div>
  )
}
