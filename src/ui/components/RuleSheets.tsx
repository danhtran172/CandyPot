import { useEffect, useState, type ReactNode } from 'react'
import { lotoMax, lotoPrice } from '../../core/games/loto'
import { XIDACH_MAX_MULTIPLIER, xidachLimits } from '../../core/games/xidach'
import type { Game } from '../../core/types'
import { actions } from '../../store'
import { Button, Stepper } from './kit'
import { RuleIcon, type RuleIconName } from './RuleIcons'

/** Một dòng cài đặt: icon + tên + ghi chú + ô số. */
export function SettingRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: RuleIconName
  label: string
  hint?: ReactNode
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <RuleIcon name={icon} className="size-7" />
        <div className="min-w-0">
          <div className="font-display text-lg leading-tight font-bold">{label}</div>
          {hint && <div className="text-xs text-muted">{hint}</div>}
        </div>
      </div>
      <Stepper value={value} min={1} onChange={onChange} label={label} />
    </div>
  )
}

/** Chip nối/tự tính giữa hai ô (vd max = 5 × min, heo đỏ = Nhất). */
export function LinkChip({ linked, text, onRelink }: { linked: boolean; text: string; onRelink: () => void }) {
  return (
    <div className="flex justify-center">
      {linked ? (
        <span className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] text-muted">🔗 {text}</span>
      ) : (
        <button type="button" onClick={onRelink} className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] font-semibold text-sky">
          ✏️ Đang đặt riêng · 🔗 {text}
        </button>
      )}
    </div>
  )
}

/** Khung popup cài đặt: tiêu đề, các dòng, lỗi, Thôi / Lưu. */
export function SettingsModal({
  title,
  hint,
  error,
  onSave,
  onClose,
  children,
}: {
  title: ReactNode
  hint?: string
  error: string | null
  onSave: () => void
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="Cài đặt" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">
        <h2 className="font-display text-center text-xl font-bold">{title}</h2>
        {hint && <p className="mt-1 text-center text-xs text-muted">{hint}</p>}
        <div className="mt-4 space-y-3">{children}</div>
        {error && <p className="mt-3 text-center text-sm text-berry">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            Thôi
          </Button>
          <Button variant="primary" className="flex-1" onClick={onSave}>
            Lưu
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Lô tô: giá mỗi tờ + số tờ tối đa mỗi người. */
export function LotoSettingsSheet({ game, onDone }: { game: Game; onDone: (saved: boolean) => void }) {
  const [price, setPrice] = useState(lotoPrice(game))
  const [max, setMax] = useState(lotoMax(game))
  const [error, setError] = useState<string | null>(null)
  const save = () => {
    const errors = actions().setLotoSettings(game.id, price, max)
    if (errors.length) setError(errors[0])
    else onDone(true)
  }
  return (
    <SettingsModal title="⚙ Lô tô" hint="Mua N tờ thì bỏ N × giá kẹo vào Pot." error={error} onSave={save} onClose={() => onDone(false)}>
      <SettingRow icon="price" label="Giá" hint="kẹo mỗi tờ" value={price} onChange={setPrice} />
      <SettingRow icon="max" label="Tối đa" hint="tờ mỗi người một ván" value={max} onChange={setMax} />
    </SettingsModal>
  )
}

/** Xì dách: cược tối thiểu / tối đa (max tự tính = 5 × min, sửa riêng được). */
export function XidachLimitsSheet({ game, onDone }: { game: Game; onDone: (saved: boolean) => void }) {
  const init = xidachLimits(game)
  const [min, setMin] = useState(init.min)
  const [max, setMax] = useState(init.max)
  const [linked, setLinked] = useState(init.max === init.min * XIDACH_MAX_MULTIPLIER)
  const [error, setError] = useState<string | null>(null)
  const save = () => {
    const errors = actions().setXidachLimits(game.id, min, max)
    if (errors.length) setError(errors[0])
    else onDone(true)
  }
  return (
    <SettingsModal title="⚙ Xì dách" hint="Mỗi người con đặt cược trong khoảng này." error={error} onSave={save} onClose={() => onDone(false)}>
      <SettingRow
        icon="min"
        label="Min"
        hint="cược tối thiểu"
        value={min}
        onChange={(v) => {
          setMin(v)
          if (linked) setMax(v * XIDACH_MAX_MULTIPLIER)
        }}
      />
      <LinkChip
        linked={linked}
        text={`Max = ${XIDACH_MAX_MULTIPLIER} × min`}
        onRelink={() => {
          setLinked(true)
          setMax(min * XIDACH_MAX_MULTIPLIER)
        }}
      />
      <SettingRow
        icon="max"
        label="Max"
        hint="cược tối đa"
        value={max}
        onChange={(v) => {
          setMax(v)
          setLinked(false)
        }}
      />
    </SettingsModal>
  )
}
