import { useEffect, useState } from 'react'
import type { ID, Player } from '../../core/types'

/** Popup chọn một người (chọn nhà cái, người thắng pot…); `onPickMany` = chọn nhiều người rồi xác nhận. */
export function PlayerPicker({
  title,
  hint,
  players,
  current,
  onPick,
  onPickMany,
  onClose,
}: {
  title: string
  hint?: string
  players: Player[]
  /** Người đang được chọn sẵn (vd nhà cái hiện tại) — tô đậm. */
  current?: ID | null
  onPick?: (id: ID) => void
  /** Chọn được nhiều người (vd chia pot) — có nút xác nhận. */
  onPickMany?: (ids: ID[]) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<ID[]>([])
  const multi = !!onPickMany
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-lg rounded-t-[2rem] border-t border-line bg-plum px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="font-display text-center text-xl font-bold">{title}</h2>
        {hint && <p className="text-center text-xs text-muted">{hint}</p>}
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={multi ? chosen.includes(p.id) : undefined}
                onClick={() =>
                  multi
                    ? setChosen((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))
                    : onPick?.(p.id)
                }
                className={`flex w-full flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 active:scale-95 ${
                  (multi ? chosen.includes(p.id) : p.id === current) ? 'border-lemon bg-lemon/15' : 'border-line bg-night/50'
                }`}
              >
                <span aria-hidden className="text-3xl leading-none">
                  {p.emoji}
                </span>
                <span className="w-full truncate text-center text-sm font-semibold">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {multi && (
          <button
            type="button"
            disabled={!chosen.length}
            onClick={() => onPickMany?.(chosen)}
            className="font-display mt-3 w-full rounded-2xl bg-lemon py-2.5 text-lg font-bold text-night shadow-[inset_0_-4px_0_rgb(0_0_0/0.18)] disabled:opacity-40"
          >
            {chosen.length > 1 ? `Chia đều cho ${chosen.length} người` : chosen.length ? 'Trao pot' : 'Chọn người thắng'}
          </button>
        )}
      </div>
    </div>
  )
}
