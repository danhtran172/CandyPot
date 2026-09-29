import { useEffect, useState, type ReactNode } from 'react'
import { ALL_IN_MULTIPLIER } from '../../core/games/pokerHand'
import type { Player } from '../../core/types'
import { Button, Stepper, Who } from './kit'

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEscape(onClose)
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">{children}</div>
    </div>
  )
}

/** Host: small blind + mức all-in. All-in tự tính = 10 × SB; sửa ô all-in là đặt riêng. */
export function PokerSettingsSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: { sb: number; cap: number }
  onSave: (sb: number, cap: number) => string[]
  onClose: () => void
}) {
  const [sb, setSb] = useState(initial.sb)
  const [cap, setCap] = useState(initial.cap)
  const [linked, setLinked] = useState(initial.cap === initial.sb * ALL_IN_MULTIPLIER)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const errors = onSave(sb, cap)
    if (errors.length) setError(errors[0])
    else onClose()
  }

  return (
    <Modal label="Cài đặt Poker" onClose={onClose}>
      <h2 className="font-display text-center text-xl font-bold">⚙ Cài đặt Poker</h2>
      <p className="mt-1 text-center text-xs text-muted">Áp dụng từ tay bài sau. Big blind = 2 × small blind.</p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg leading-tight font-bold">Small blind</div>
            <div className="text-xs text-muted">Big blind = {2 * sb}</div>
          </div>
          <Stepper
            value={sb}
            min={1}
            label="small blind"
            onChange={(v) => {
              setSb(v)
              if (linked) setCap(v * ALL_IN_MULTIPLIER)
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg leading-tight font-bold">All-in</div>
            <div className="text-xs text-muted">Tối đa mỗi người một tay</div>
          </div>
          <Stepper
            value={cap}
            min={1}
            label="mức all-in"
            onChange={(v) => {
              setCap(v)
              setLinked(false)
            }}
          />
        </div>
        <div className="flex justify-center">
          {linked ? (
            <span className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] text-muted">🔗 All-in = {ALL_IN_MULTIPLIER} × small blind</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLinked(true)
                setCap(sb * ALL_IN_MULTIPLIER)
              }}
              className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] font-semibold text-sky"
            >
              ✏️ Đang đặt riêng · 🔗 Về {ALL_IN_MULTIPLIER} × small blind
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-center text-sm text-berry">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={onClose}>
          Thôi
        </Button>
        <Button variant="primary" className="flex-1" onClick={save}>
          Lưu
        </Button>
      </div>
    </Modal>
  )
}

/** Tố: gợi ý tổng vòng này (tối thiểu, ×1,5, ×2) hoặc tự nhập; ghi rõ bỏ thêm bao nhiêu. */
export function PokerRaiseSheet({
  player,
  options,
  streetBet,
  min,
  max,
  onPick,
  onClose,
}: {
  player: Player
  /** Các mức "tố lên" (tổng vòng này). */
  options: number[]
  /** Người này đã bỏ trong vòng này. */
  streetBet: number
  min: number
  /** Mức all-in (tổng vòng này). */
  max: number
  onPick: (to: number) => void
  onClose: () => void
}) {
  useEscape(onClose)
  const [custom, setCustom] = useState(Math.min(min, max))
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Tố">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-lg rounded-t-[2rem] border-t border-line bg-plum px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="text-center">
          <div className="font-display text-xl font-bold">
            <Who player={player} className="text-sky" /> tố lên bao nhiêu?
          </div>
          <div className="text-xs text-muted">
            Số là tổng cược vòng này (tối thiểu {min}, all-in {max}).
          </div>
        </div>
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` }}>
          {options.map((to) => (
            <button
              key={to}
              type="button"
              aria-label={`Tố lên ${to}`}
              onClick={() => onPick(to)}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border border-line bg-night/50 active:scale-95 active:bg-plum-2"
            >
              <span className="candy num text-2xl">{to}</span>
              <span className="text-[11px] text-muted">bỏ thêm {to - streetBet}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-3xl border border-line/60 bg-night/30 p-2 pl-4">
          <span className="flex-1 text-sm font-semibold text-muted">
            Số khác
            <span className="block text-xs font-normal">bỏ thêm {Math.max(0, custom - streetBet)}</span>
          </span>
          <Stepper value={custom} min={1} onChange={setCustom} label="tố lên" />
          <Button variant="primary" disabled={custom < 1} onClick={() => onPick(Math.min(custom, max))}>
            Tố
          </Button>
        </div>
      </div>
    </div>
  )
}
