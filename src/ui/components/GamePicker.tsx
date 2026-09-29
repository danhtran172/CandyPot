import { useEffect, useState } from 'react'
import { GAME_ORDER, GAMES } from '../../core/games'
import type { GameType } from '../../core/types'
import { GameIcon } from './GameIcon'

/** Chọn 1 trong các game = đổi cách tính của bàn (lời/lỗ vẫn cộng chung). */
export function GamePicker({ value, onPick }: { value?: GameType; onPick: (type: GameType) => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative z-20">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Chọn game"
        onClick={() => setOpen((o) => !o)}
        className="font-display flex w-full items-center gap-2.5 rounded-2xl border border-line bg-plum-2 py-1.5 pr-4 pl-2 text-lg font-bold"
      >
        {value ? (
          <>
            <GameIcon type={value} className="size-8" />
            <span className="flex-1 text-left">{GAMES[value].label}</span>
          </>
        ) : (
          <span className="flex-1 py-1 pl-2 text-left text-muted">Chọn game…</span>
        )}
        <span aria-hidden className={`text-muted transition ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <>
          <button type="button" aria-label="Đóng" className="fixed inset-0 cursor-default" onClick={() => setOpen(false)} />
          <ul role="listbox" className="pop absolute inset-x-0 mt-1.5 rounded-2xl border border-line bg-plum-2 p-1.5 shadow-2xl">
            {GAME_ORDER.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t === value}
                  onClick={() => {
                    setOpen(false)
                    onPick(t)
                  }}
                  className={`font-display flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-lg font-bold ${
                    t === value ? 'bg-lemon/15 text-lemon' : 'hover:bg-plum'
                  }`}
                >
                  <GameIcon type={t} className="size-9" />
                  <span className="flex-1">{GAMES[t].label}</span>
                  {GAMES[t].soon && <span className="rounded-full bg-night/60 px-2 text-xs font-semibold text-muted">sắp có</span>}
                  {t === value && <span aria-hidden>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
