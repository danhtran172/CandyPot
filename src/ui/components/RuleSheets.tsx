import { useEffect, useState, type ReactNode } from 'react'
import { CARD_GAMES, GAMES } from '../../core/games'
import { lotoMax, lotoPrice } from '../../core/games/loto'
import { XIDACH_MAX_MULTIPLIER, xidachLimits } from '../../core/games/xidach'
import { tienlenBets, tienlenPigs } from '../../core/suggest'
import type { Game } from '../../core/types'
import { actions } from '../../store'
import { pokerSettingsOf } from '../../store/appStore'
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
  const [auto, setAuto] = useState(!!game.lotoAuto)
  const [error, setError] = useState<string | null>(null)
  const save = () => {
    const errors = [...actions().setLotoSettings(game.id, price, max), ...actions().setLotoAuto(game.id, auto)]
    if (errors.length) setError(errors[0])
    else onDone(true)
  }
  return (
    <SettingsModal title="⚙ Lô tô" hint="Mua N tờ thì bỏ N × giá kẹo vào Pot." error={error} onSave={save} onClose={() => onDone(false)}>
      <SettingRow icon="price" label="Giá" hint="kẹo mỗi tờ" value={price} onChange={setPrice} />
      <SettingRow icon="max" label="Tối đa" hint="tờ mỗi người một ván" value={max} onChange={setMax} />
      {/* Chơi giấy trong app: người gọi lắc túi thủ công, hay máy tự gọi mỗi 5 giây */}
      <div className="mt-3">
        <p className="text-sm font-semibold">Gọi số</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(
            [
              [false, 'Thủ công', 'Người gọi giữ túi lắc ra từng số'],
              [true, 'Máy gọi', 'Tự ra một số mỗi 5 giây'],
            ] as const
          ).map(([v, label, hint]) => (
            <button
              key={label}
              type="button"
              aria-pressed={auto === v}
              onClick={() => setAuto(v)}
              className={`rounded-2xl border px-2 py-2 text-left transition ${auto === v ? 'border-lemon bg-lemon/15' : 'border-line/60 bg-night/40 opacity-70'}`}
            >
              <div className="text-sm font-bold">{label}</div>
              <div className="text-[11px] text-muted">{hint}</div>
            </button>
          ))}
        </div>
        <p className="mt-1 text-center text-[11px] text-muted">Áp dụng khi chơi giấy "Trên app".</p>
      </div>
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

/** Các dòng luật hiện hành của một game (để xem) — trống nếu game không có luật riêng. */
function ruleRows(game: Game): { icon: RuleIconName; label: string; value: string }[] {
  switch (game.type) {
    case 'tienlen': {
      const { bet, bet2 = bet } = tienlenBets(game)
      const pigs = tienlenPigs(game, bet, bet2)
      return [
        { icon: 'first', label: 'Nhất', value: `${bet} kẹo` },
        { icon: 'second', label: 'Nhì', value: `${bet2} kẹo` },
        { icon: 'pigRed', label: 'Heo đỏ', value: `${pigs.red} kẹo` },
        { icon: 'pigBlack', label: 'Heo đen', value: `${pigs.black} kẹo` },
      ]
    }
    case 'loto':
      return [
        { icon: 'price', label: 'Giá', value: `${lotoPrice(game)} kẹo / tờ` },
        { icon: 'max', label: 'Tối đa', value: `${lotoMax(game)} tờ mỗi người` },
      ]
    case 'xidach': {
      const { min, max } = xidachLimits(game)
      return [
        { icon: 'min', label: 'Cược tối thiểu', value: `${min} kẹo` },
        { icon: 'max', label: 'Cược tối đa', value: `${max} kẹo` },
      ]
    }
    case 'poker': {
      const { sb, cap } = pokerSettingsOf(game)
      return [
        { icon: 'min', label: 'Small blind', value: `${sb} kẹo` },
        { icon: 'price', label: 'Big blind', value: `${2 * sb} kẹo` },
        { icon: 'max', label: 'All-in', value: `${cap} kẹo` },
      ]
    }
    default:
      return []
  }
}

/** Popup "Rule ?": ai cũng xem được luật hiện hành; host có nút ⚙ Chỉnh. */
export function RulesSheet({
  game,
  isHost,
  online,
  onEdit,
  onClose,
}: {
  game: Game
  isHost: boolean
  /** Bàn nhiều người: mới chơi được bài trong app. */
  online: boolean
  onEdit: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="Luật" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">
        <h2 className="font-display text-center text-xl font-bold">
          <span className="text-sky">Rule</span> · {GAMES[game.type].label}
        </h2>
        <ul className="mt-4 space-y-2">
          {ruleRows(game).map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 rounded-2xl bg-night/40 px-3 py-2">
              <RuleIcon name={r.icon} className="size-6" />
              <span className="flex-1 font-semibold">{r.label}</span>
              <span className="num font-display font-extrabold text-lemon">{r.value}</span>
            </li>
          ))}
        </ul>
        {CARD_GAMES.includes(game.type) && <CardModeSwitch game={game} isHost={isHost} online={online} />}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            Đóng
          </Button>
          {isHost ? (
            <Button variant="primary" className="flex-1" onClick={onEdit}>
              ⚙ Chỉnh
            </Button>
          ) : (
            <span className="flex flex-1 items-center justify-center text-center text-xs text-muted">Chỉ host chỉnh được</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Nút gạt mode chơi bài gọn đặt ngay trên bàn (ai trong bàn cũng thấy mode đang chọn).
 * Host bấm để đổi; người khác bấm thì được nhắc chỉ host đổi; bàn một máy thì nhắc bài trong app cần bàn online.
 */
export function CardModePill({
  game,
  isHost,
  online,
  onBlocked,
}: {
  game: Game
  isHost: boolean
  online: boolean
  onBlocked: (msg: string) => void
}) {
  const mode = online ? (game.cardMode ?? 'real') : 'real'
  const opts = [
    { v: 'real' as const, label: 'Đánh ngoài', hint: 'Bài ngoài đời, app tính kẹo' },
    { v: 'app' as const, label: 'Trên app', hint: 'App chia bài, đánh trên máy' },
  ]
  return (
    <div role="radiogroup" aria-label="Mode chơi bài" data-guide="card-mode" className="flex rounded-full border border-line/60 bg-night/70 p-0.5 text-xs font-bold">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={mode === o.v}
          title={o.hint}
          onClick={() => {
            if (mode === o.v) return
            if (!online) return onBlocked('Bài trong app chỉ dùng ở bàn online (Nhiều người join).')
            if (!isHost) return onBlocked('Chỉ host đổi mode chơi bài.')
            const errors = actions().setCardMode(game.id, o.v)
            if (errors.length) onBlocked(errors[0])
          }}
          className={`rounded-full px-2.5 py-1 whitespace-nowrap transition ${
            mode === o.v ? 'bg-lemon text-night' : `text-muted ${isHost && online ? 'active:scale-95' : ''}`
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Hai mode chơi bài: đánh thực tế (bài ngoài đời, app chỉ tính kẹo) / dùng bài trong app. Host đổi. */
export function CardModeSwitch({ game, isHost, online }: { game: Game; isHost: boolean; online: boolean }) {
  const mode = online ? (game.cardMode ?? 'real') : 'real'
  const opts = [
    { v: 'real' as const, label: '🃏 Đánh thực tế', hint: 'Bài ngoài đời, app tính kẹo' },
    { v: 'app' as const, label: '📱 Bài trong app', hint: 'App chia bài, đánh trên máy' },
  ]
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            disabled={!isHost || !online}
            aria-pressed={mode === o.v}
            onClick={() => actions().setCardMode(game.id, o.v)}
            className={`rounded-2xl border px-2 py-2 text-left transition ${
              mode === o.v ? 'border-lemon bg-lemon/15' : 'border-line/60 bg-night/40 opacity-70'
            }`}
          >
            <div className="text-sm font-bold">{o.label}</div>
            <div className="text-[11px] text-muted">{o.hint}</div>
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">
        {!online
          ? '📱 Bài trong app chỉ dùng ở bàn online (Nhiều người join) — tạo bàn kiểu đó để chơi.'
          : isHost
            ? 'Đổi mode: áp dụng từ ván sau (ván chưa ai trả kẹo thì đổi luôn).'
            : 'Chỉ host đổi mode.'}
      </p>
    </div>
  )
}
