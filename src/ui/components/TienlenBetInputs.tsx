import { useState } from 'react'
import { Stepper } from './kit'

type Field = 'bet' | 'bet2'

const half = (n: number) => Math.max(1, Math.round(n / 2))

/**
 * Hai ô cược Tiến lên. Nhập một ô thì ô kia tự tính (Nhất = 2 × Nhì);
 * sửa tiếp ô được tự tính là đặt riêng — thôi tự tính cho tới khi bấm "Tự tính lại".
 */
export function TienlenBetInputs({
  bet,
  bet2,
  onChange,
}: {
  bet: number
  bet2: number
  onChange: (v: { bet: number; bet2: number }) => void
}) {
  const [linked, setLinked] = useState(true)
  const [driver, setDriver] = useState<Field | null>(null)

  const edit = (field: Field, v: number) => {
    const next = { bet, bet2, [field]: v }
    if (linked && driver && driver !== field) {
      // Sửa ô vừa được tự tính → người dùng muốn đặt riêng
      setLinked(false)
    } else if (linked) {
      setDriver(field)
      if (field === 'bet') next.bet2 = half(v)
      else next.bet = v * 2
    }
    onChange(next)
  }

  const relink = () => {
    setLinked(true)
    setDriver('bet')
    onChange({ bet, bet2: half(bet) })
  }

  const row = (field: Field, title: string, hint: string) => (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-display text-lg leading-tight font-bold">{title}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <Stepper value={field === 'bet' ? bet : bet2} min={1} onChange={(v) => edit(field, v)} label={`cược ${title}`} />
    </div>
  )

  return (
    <div className="space-y-2">
      {row('bet', 'Nhất', 'Bét trả Nhất')}
      <div className="flex justify-center">
        {linked ? (
          <span className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] text-muted">🔗 Nhất = 2 × Nhì · nhập 1 ô, ô kia tự tính</span>
        ) : (
          <button type="button" onClick={relink} className="rounded-full bg-night/50 px-2.5 py-0.5 text-[11px] font-semibold text-sky">
            ✏️ Đang đặt riêng · 🔗 Tự tính lại
          </button>
        )}
      </div>
      {row('bet2', 'Nhì', 'Ba trả Nhì')}
    </div>
  )
}
