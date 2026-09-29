import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import type { Player } from '../../core/types'

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

export function Stepper({
  value,
  onChange,
  min = 0,
  step = 1,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  label?: string
}) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-line bg-night/60">
      <button
        type="button"
        aria-label={`Giảm ${label ?? ''}`}
        className="px-3 py-1.5 text-lg text-muted active:bg-plum-2"
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className="num w-12 bg-transparent text-center font-semibold outline-none"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isNaN(n) ? 0 : n)
        }}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        aria-label={`Tăng ${label ?? ''}`}
        className="px-3 py-1.5 text-lg text-muted active:bg-plum-2"
        onClick={() => onChange(value + step)}
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
    <header className="sticky top-0 z-10 -mx-4 mb-3 flex items-center gap-2 bg-night/85 px-4 py-3 backdrop-blur">
      {back && (
        <Link to={back} aria-label="Quay lại" className="-ml-2 rounded-full px-2 py-1 text-xl text-muted">
          ‹
        </Link>
      )}
      <h1 className="font-display min-w-0 flex-1 truncate text-2xl leading-tight font-extrabold">{title}</h1>
      {right}
    </header>
  )
}

export function Who({ player, className = '' }: { player?: Player; className?: string }) {
  if (!player) return <span className="text-muted">?</span>
  return (
    <span className={`inline-flex items-center gap-1.5 ${player.active ? '' : 'opacity-60'} ${className}`}>
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
