import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ladderStep, onLadder } from '../../core/ladder'
import { POT, type Player } from '../../core/types'
import potIcon from '../../assets/pot.webp'

type Variant = 'primary' | 'ghost' | 'danger' | 'soft'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-lemon text-night shadow-[inset_0_-4px_0_rgb(0_0_0/0.18)] active:translate-y-px',
  soft: 'bg-plum-2 text-cream',
  ghost: 'bg-transparent text-muted hover:text-cream',
  danger: 'bg-transparent text-berry border border-berry/40',
}

export function Button({
  variant = 'soft',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`rounded-2xl px-4 py-2.5 font-semibold transition disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Chip({
  active,
  tone = 'lemon',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: 'lemon' | 'mint' | 'berry' | 'grape' }) {
  const on = {
    lemon: 'bg-lemon text-night border-lemon',
    mint: 'bg-mint text-night border-mint',
    berry: 'bg-berry text-night border-berry',
    grape: 'bg-grape text-night border-grape',
  }[tone]
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
        active ? on : 'border-line bg-plum text-cream'
      } ${className}`}
      {...rest}
    />
  )
}

/**
 * Ô số có nút −/+: + nhảy theo ×1,5 → ×2 → ×3 của số gốc (4 → 6 → 8 → 12…), − đi lùi các bậc đó.
 * Số gốc là số đang có (hoặc số vừa gõ); muốn số khác thì gõ thẳng vào ô.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  label?: string
}) {
  const anchor = useRef(value)
  const step = (dir: 1 | -1) => {
    // Số bị đổi từ ngoài (gõ tay, tự tính…) không nằm trên thang cũ → lấy nó làm gốc mới
    if (!onLadder(anchor.current, value)) anchor.current = value
    onChange(ladderStep(anchor.current, value, dir, min))
  }
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-line bg-night/60">
      <button
        type="button"
        aria-label={`Giảm ${label ?? ''}`}
        className="px-3 py-1.5 text-lg text-muted active:bg-plum-2"
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className="num w-12 bg-transparent text-center font-semibold underline decoration-muted/50 decoration-dotted underline-offset-4 outline-none"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          const v = Number.isNaN(n) ? 0 : n
          anchor.current = v
          onChange(v)
        }}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        aria-label={`Tăng ${label ?? ''}`}
        className="px-3 py-1.5 text-lg text-muted active:bg-plum-2"
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line/60 bg-plum p-4 ${className}`}>{children}</section>
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h2 className="font-display text-lg font-bold text-cream">{children}</h2>
      {aside}
    </div>
  )
}

export function TopBar({ title, back, right }: { title: ReactNode; back?: string; right?: ReactNode }) {
  return (
    // Trên mọi thứ cuộn qua (ô chọn game z-20, chỗ ngồi / nút góc bàn z-10); dưới thông báo (z-30) và popup
    <header className="sticky top-[env(safe-area-inset-top)] z-[25] -mx-4 mb-3 flex items-center gap-2 bg-night/85 px-4 py-3 backdrop-blur land:mb-1 land:py-1.5">
      {back && (
        <Link to={back} aria-label="Quay lại" className="-ml-2 rounded-full px-2 py-1 text-xl text-muted">
          ‹
        </Link>
      )}
      <h1 className="font-display min-w-0 flex-1 truncate text-2xl leading-tight font-extrabold land:text-xl">{title}</h1>
      {right}
    </header>
  )
}

/** Pot như một "người" trong câu: icon Pot chính thức + chữ Pot, khung viền vàng (cùng kiểu khung tên người chơi). */
export function PotChip({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-lemon/50 bg-lemon/10 px-2 py-0.5 align-middle font-semibold text-lemon ${className}`}
    >
      <img src={potIcon} alt="" draggable={false} className="size-[1.15em] max-w-none" />
      Pot
    </span>
  )
}

/** Avatar + tên người chơi. `chip`: đặt trong khung xanh (như khung vàng của Pot) — dùng trong các dòng A → B. */
export function Who({ player, className = '', chip = false }: { player?: Player; className?: string; chip?: boolean }) {
  if (!player) return <span className="text-muted">?</span>
  if (player.id === POT) return <PotChip />
  const frame = chip ? 'min-w-0 max-w-full rounded-full border border-sky/40 bg-sky/10 px-2 py-0.5 align-middle' : ''
  return (
    <span className={`inline-flex items-center gap-1.5 ${frame} ${player.active ? '' : 'opacity-60'} ${className}`}>
      <span aria-hidden>{player.emoji}</span>
      <span className="truncate">{player.name}</span>
    </span>
  )
}

export function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <ul role="alert" className="space-y-1 rounded-2xl border border-berry/40 bg-berry/10 p-3 text-sm text-berry">
      {errors.map((e) => (
        <li key={e}>• {e}</li>
      ))}
    </ul>
  )
}
