import { useEffect, useState } from 'react'
import type { Option, Player } from '../../core/types'
import { Button, Stepper, Who } from './kit'

/** Popup chọn số kẹo sau khi kéo hũ kẹo: các mức gợi ý (chỉ ghi số) + số khác. */
export function AmountSheet({
  from,
  to,
  options,
  mode = 'pay',
  onPick,
  onClose,
}: {
  from: Player
  to: Player
  /** pay = trả ngay; request = đòi kẹo, chờ người kia bấm OK. */
  mode?: 'pay' | 'request'
  options: { amount: number; label: string }[]
  onPick: (option: Option) => void
  onClose: () => void
}) {
  const [custom, setCustom] = useState(options[0]?.amount ?? 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Chọn số kẹo">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-lg rounded-t-[2rem] border-t border-line bg-plum px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {mode === 'request' ? (
          <div className="text-center">
            <div className="font-display text-xl font-bold">
              Đòi <Who player={from} className="text-sky" /> bao nhiêu?
            </div>
            <div className="text-xs text-muted"><span className="font-semibold text-sky">{from.name}</span> sẽ nhận thông báo và bấm OK để chuyển kẹo cho bạn.</div>
          </div>
        ) : (
          <div className="font-display flex items-center justify-center gap-2 text-xl font-bold">
            <Who player={from} className="text-sky" />
            <span className="text-lemon">→</span>
            <Who player={to} className="text-sky" />
          </div>
        )}

        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
          {options.slice(0, 4).map((o) => (
            <button
              key={o.amount}
              type="button"
              aria-label={`${mode === 'request' ? 'Đòi' : 'Đưa'} ${o.amount} kẹo`}
              onClick={() => onPick(o)}
              className="grid min-h-24 place-items-center rounded-3xl border border-line bg-night/50 active:scale-95 active:bg-plum-2"
            >
              <span className={`candy num px-2 ${options.length > 3 ? 'text-2xl' : 'text-3xl'}`}>{o.amount}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-3xl border border-line/60 bg-night/30 p-2 pl-4">
          <span className="flex-1 text-sm font-semibold text-muted">Số khác</span>
          <Stepper value={custom} min={1} onChange={setCustom} label="số kẹo khác" />
          <Button variant="primary" disabled={custom <= 0} onClick={() => onPick({ amount: custom, label: 'Tự nhập' })}>
            {mode === 'request' ? 'Đòi' : 'Đưa'}
          </Button>
        </div>
      </div>
    </div>
  )
}
