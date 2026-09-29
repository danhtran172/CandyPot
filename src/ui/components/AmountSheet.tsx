import { useEffect, useState, type ReactNode } from 'react'
import { POT, type ID, type Option, type Player } from '../../core/types'
import { Button, Stepper, Who } from './kit'
import { RuleIcon, type RuleIconName } from './RuleIcons'

/** Nhãn gợi ý (Nhất / Nhì / Heo…) → biểu tượng hiện dưới số. */
const OPTION_ICON: Record<string, RuleIconName> = { Nhất: 'first', Nhì: 'second', 'Heo đỏ': 'pigRed', 'Heo đen': 'pigBlack' }

const VERB = { pay: 'Trả', request: 'Đòi', bet: 'Bet', buy: 'Mua' } as const

/** Popup chọn số kẹo sau khi kéo hũ kẹo: các mức gợi ý (chỉ ghi số) + số khác. */
export function AmountSheet({
  from,
  to,
  me,
  options,
  mode = 'pay',
  unit,
  onSwap,
  extra,
  onPick,
  onClose,
}: {
  from: Player
  to: Player
  /** Người dùng máy này — câu hỏi nói "Trả X…" (mình làm) hay "A trả X…" (ghi hộ người khác). */
  me?: ID
  /** pay = trả ngay; request = đòi kẹo, chờ người kia bấm OK; bet = đặt cược (Xì dách); buy = mua tờ (Lô tô). */
  mode?: 'pay' | 'request' | 'bet' | 'buy'
  /** Chọn theo đơn vị (vd "tờ" giá 5 kẹo): nút ghi số tờ, số kẹo = số tờ × giá. */
  unit?: { name: string; price: number }
  /** Đổi chiều (Đưa ⇄ Đòi) — hiện khi bấm vào một người. */
  onSwap?: () => void
  /** Nút phụ dưới cùng (vd "Trao pot…"). */
  extra?: ReactNode
  options: { amount: number; label: string }[]
  onPick: (option: Option) => void
  onClose: () => void
}) {
  const per = unit?.price ?? 1
  const mine = from.id === me
  /** Tên hành động theo đúng việc: trả người khác / cược vào pot / trao pot. */
  const verb = mode === 'pay' ? (from.id === POT ? 'Trao' : to.id === POT ? 'Cược' : 'Trả') : VERB[mode]
  /** "A " trước động từ khi ghi hộ người khác. */
  const who = mine ? null : (
    <>
      <PersonChip player={from} />{' '}
    </>
  )
  const [custom, setCustom] = useState(unit ? 1 : (options[0]?.amount ?? 1))
  const pickCustom = () =>
    onPick(unit ? { amount: custom * per, label: `${custom} ${unit.name}` } : { amount: custom, label: 'Tự nhập' })

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
        {mode === 'buy' && unit ? (
          <div className="text-center">
            <div className="font-display text-xl font-bold">
              {who}
              {mine ? 'Mua' : 'mua'} mấy {unit.name}?
            </div>
            <div className="text-xs text-muted">
              Giá <span className="font-semibold text-lemon">{unit.price} kẹo</span> / {unit.name} — app tự tính số kẹo bỏ vào Pot.
            </div>
          </div>
        ) : mode === 'bet' ? (
          <div className="text-center">
            <div className="font-display text-xl font-bold">
              {who}
              {mine ? 'Bet' : 'bet'} bao nhiêu?
            </div>
            <div className="text-xs text-muted">Ván sau sẽ tự giữ mức cược này.</div>
          </div>
        ) : mode === 'request' ? (
          <div className="text-center">
            <div className="font-display text-xl font-bold">
              Đòi <PersonChip player={from} /> bao nhiêu?
            </div>
            <div className="text-xs text-muted"><span className="font-semibold text-sky">{from.name}</span> sẽ nhận thông báo và bấm OK để chuyển kẹo cho bạn.</div>
          </div>
        ) : (
          <div className="font-display text-center text-xl font-bold">
            {from.id === POT ? (
              <>
                Trao pot cho <PersonChip player={to} /> bao nhiêu?
              </>
            ) : to.id === POT ? (
              <>
                {who}
                {mine ? 'Cược' : 'cược'} bao nhiêu vào Pot?
              </>
            ) : (
              <>
                {who}
                {mine ? 'Trả' : 'trả'} <PersonChip player={to} /> bao nhiêu?
              </>
            )}
          </div>
        )}

        {onSwap && (mode === 'pay' || mode === 'request') && (
          <div className="mt-2 flex justify-center">
            <button type="button" onClick={onSwap} className="rounded-full bg-night/60 px-3 py-1 text-xs font-semibold text-sky">
              ⇄ {mode === 'pay' ? `Đòi ${to.name} thay vì trả` : `Trả ${from.name} thay vì đòi`}
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
          {options.slice(0, 4).map((o) => (
            <button
              key={o.amount}
              type="button"
              aria-label={unit ? `${verb} ${o.amount / per} ${unit.name} (${o.amount} kẹo)` : `${verb} ${o.amount} kẹo`}
              onClick={() => onPick(o)}
              className="grid min-h-24 place-items-center rounded-3xl border border-line bg-night/50 active:scale-95 active:bg-plum-2"
            >
              {unit ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="font-display text-2xl font-extrabold">
                    {o.amount / per} <span className="text-base font-bold text-muted">{unit.name}</span>
                  </span>
                  <span className="candy num text-sm">{o.amount}</span>
                </span>
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <span className={`candy num px-2 ${options.length > 3 ? 'text-2xl' : 'text-3xl'}`}>{o.amount}</span>
                  {OPTION_ICON[o.label] && <RuleIcon name={OPTION_ICON[o.label]} className="size-5" />}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-3xl border border-line/60 bg-night/30 p-2 pl-4">
          <span className="flex-1 text-sm font-semibold text-muted">
            {unit ? (
              <>
                Số {unit.name} khác
                <span className="block text-xs font-normal">= {custom * per} kẹo</span>
              </>
            ) : (
              'Số khác'
            )}
          </span>
          <Stepper value={custom} min={1} onChange={setCustom} label={unit ? `số ${unit.name}` : 'số kẹo khác'} />
          <Button variant="primary" disabled={custom <= 0} onClick={pickCustom}>
            {verb}
          </Button>
        </div>
        {extra}
      </div>
    </div>
  )
}

/** Tên + avatar người trong câu hỏi (Đòi X bao nhiêu? / A → B) đặt trong khung mờ cho nổi bật. */
function PersonChip({ player }: { player: Player }) {
  return (
    <span className="mx-0.5 inline-flex max-w-[60%] items-center rounded-full border border-sky/30 bg-sky/10 px-2.5 py-0.5 align-middle text-lg backdrop-blur-sm">
      <Who player={player} className="min-w-0 text-sky" />
    </span>
  )
}
