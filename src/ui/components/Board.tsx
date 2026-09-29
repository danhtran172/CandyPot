import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { BET, DEALER, POT, type ID, type Player } from '../../core/types'
import { signed, toneOf } from '../format'
import { candyFor } from '../candyIcons'
import potIcon from '../../assets/pot.webp'
import dragCandy from '../../assets/drag-candy.webp'

export interface Seat {
  player: Player
  /** Lời/lỗ cộng dồn các ván đã chốt. */
  total: number
  /** Được/mất trong ván đang mở; undefined = không có ván. */
  round?: number
  /** Dòng phụ: "Nhà cái"… */
  badge?: string
  /** Tiền cược trong ván (Xì dách), hiện trước chỗ ngồi dạng [kẹo] × N. */
  stake?: number
  /** Cược lấy từ ván trước (chưa mở ván) — hiện mờ. */
  stakeDim?: boolean
  isMe?: boolean
}

interface Drag {
  from: ID
  startX: number
  startY: number
  x: number
  y: number
  moved: boolean
}

const THRESHOLD = 8

/** Vị trí chip cược so với avatar — luôn về phía giữa bàn. */
const STAKE_POS = {
  right: 'left-[calc(100%+6px)] top-1/2 -translate-y-1/2',
  left: 'right-[calc(100%+6px)] top-1/2 -translate-y-1/2',
  above: 'bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2',
  below: 'top-[calc(100%+2px)] left-1/2 -translate-x-1/2',
} as const

/** Kích thước ô theo số người để 10 người vẫn vừa quanh bàn. */
function sizeFor(n: number) {
  if (n <= 6) return { seat: 'w-[78px]', avatar: 'size-13 text-3xl' }
  if (n <= 8) return { seat: 'w-[68px]', avatar: 'size-11 text-2xl' }
  return { seat: 'w-[60px]', avatar: 'size-10 text-2xl' }
}

const HEIGHT = 'clamp(420px, calc(100dvh - 270px), 640px)'

/**
 * Bàn oval (hoặc vuông với Tiến lên): mọi người xếp đều quanh bàn, "tôi" ở dưới cùng.
 * Kéo từ một người thả vào người khác (hoặc pot) để trả — gói kẹo (drag-candy.webp) hiện ra theo tay khi kéo.
 */
export function Board({
  seats,
  center,
  corner,
  cornerRight,
  pot,
  potAfterCenter,
  betBox,
  betLocked,
  onBetHold,
  hat,
  shape = 'oval',
  onTransfer,
}: {
  seats: Seat[]
  /** Hình bàn: oval (mặc định) hoặc vuông — 4 người ngồi 4 cạnh. */
  shape?: 'oval' | 'square'
  /** Nội dung giữa bàn (theo game). */
  center?: ReactNode
  /** Nút ở góc dưới bên trái bàn. */
  corner?: ReactNode
  /** Nút ở góc dưới bên phải bàn. */
  cornerRight?: ReactNode
  /** Số kẹo trong pot; undefined = bàn không có pot. */
  pot?: number
  /** Đặt ô Pot bên dưới nội dung giữa bàn (Lô tô: Giá ở trên, Pot ở dưới). */
  potAfterCenter?: boolean
  /** Hiện ô Bet giữa bàn (Xì dách): thả vào để đặt cược. Không giữ kẹo, không cộng tổng. */
  betBox?: boolean
  /** Đã chốt cược: ô Bet chỉ hiển thị, không nhận đặt cược nữa. */
  betLocked?: boolean
  /** Nhấn giữ ô Bet (khi đã chốt) — host bỏ chốt. */
  onBetHold?: () => void
  /** Tên nhà cái — hiện mũ 🎩 kéo được sang người khác để đổi cái. */
  hat?: string
  onTransfer: (from: ID, to: ID) => void
}) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<ID | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const dragging = drag !== null
  const holdTimer = useRef<number | undefined>(undefined)
  const [holding, setHolding] = useState(false)

  /** Nhấn giữ ~0,6 giây trên ô Bet đã chốt. */
  const startHold = (e: ReactPointerEvent) => {
    if (!betLocked || !onBetHold || e.button !== 0) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      setHolding(false)
      onBetHold()
    }, 600)
  }
  const stopHold = () => {
    window.clearTimeout(holdTimer.current)
    setHolding(false)
  }

  useEffect(() => {
    if (!dragging) return
    const targetAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null

    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > THRESHOLD
      const next = { ...d, x: e.clientX, y: e.clientY, moved }
      dragRef.current = next
      setDrag(next)
      setHover(moved ? targetAt(e.clientX, e.clientY) : null)
    }

    const up = (e: PointerEvent) => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      setHover(null)
      if (!d) return
      if (d.moved) {
        const to = targetAt(e.clientX, e.clientY)
        if (to && to !== d.from) onTransfer(d.from, to)
        return
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, onTransfer])

  const start = (id: ID) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const d = { from: id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false }
    dragRef.current = d
    setDrag(d)
  }

  const ring = (id: ID) =>
    hover === id && drag?.from !== id
      ? 'ring-4 ring-mint scale-110'
      : drag?.moved && drag.from === id
        ? 'ring-4 ring-lemon'
        : ''

  // "Tôi" ở dưới cùng, những người khác xếp đều theo chiều kim đồng hồ
  const ordered = [...seats.filter((s) => s.isMe), ...seats.filter((s) => !s.isMe)]
  const n = ordered.length
  const size = sizeFor(n)
  const square = shape === 'square'

  const potBox = pot !== undefined && (
    <div
      data-drop={POT}
      onPointerDown={start(POT)}
      aria-label={`Pot: ${pot} kẹo`}
      className={`relative flex min-w-28 touch-none flex-col items-center rounded-3xl border-2 border-dashed border-lemon/60 bg-night/50 px-4 pt-7 pb-2 transition select-none ${ring(POT)}`}
    >
      <span className="absolute top-1.5 left-2.5 flex items-center gap-1 text-xs font-bold text-lemon">
        <img src={potIcon} alt="" draggable={false} className="size-5" />
        Pot
      </span>
      <span className="candy num text-lg">{pot}</span>
    </div>
  )

  return (
    <>
      <div className="relative -mx-3" style={{ height: HEIGHT }}>
        {/* Bàn vuông: khung vuông giữa vùng bàn — mặt bàn và ghế đặt theo khung này */}
        <div
          className={square ? 'absolute top-[48%] left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2' : 'absolute inset-0'}
          style={square ? { width: `min(100%, ${HEIGHT})` } : undefined}
        >
          {/* Mặt bàn */}
          <div
            className={`absolute border-2 border-line shadow-[inset_0_0_40px_rgb(0_0_0/0.45)] ${
              square
                ? 'inset-[22%] rounded-[2rem] bg-[radial-gradient(circle_at_center,#3b2147_0%,#2b1734_75%)]'
                : 'inset-x-[17%] top-[16%] bottom-[22%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#3b2147_0%,#2b1734_70%)]'
            }`}
          />
          <div
            className={`absolute flex flex-col items-center justify-center gap-1 text-center ${
              square ? 'inset-[26%]' : 'inset-x-[22%] top-[23%] bottom-[29%]'
            }`}
          >
            {!potAfterCenter && potBox}
            {betBox && (
              <div
                data-drop={BET}
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                className={`flex touch-none flex-col items-center rounded-3xl border-2 bg-night/50 px-4 py-2 transition select-none ${
                  betLocked ? 'border-line opacity-70' : 'border-dashed border-sky/70'
                } ${holding ? 'scale-95 opacity-100 ring-4 ring-lemon/60' : ''} ${ring(BET)}`}
              >
                <span className="font-display text-2xl leading-none font-bold text-sky">{betLocked ? '🔒 Bet' : 'Bet'}</span>
                <span className="mt-1 text-[10px] text-muted">{betLocked ? 'đã chốt · host giữ để bỏ chốt' : 'thả vào để đặt cược'}</span>
              </div>
            )}
            {hat && (
              <button
                type="button"
                onPointerDown={start(DEALER)}
                className={`flex touch-none items-center gap-1 rounded-full bg-night/60 px-2.5 py-1 text-xs select-none ${
                  drag?.moved && drag.from === DEALER ? 'ring-2 ring-lemon' : ''
                }`}
                aria-label={`Nhà cái: ${hat}. Kéo mũ sang người khác để đổi cái`}
              >
                <span aria-hidden className="text-base leading-none">
                  🎩
                </span>
                <b className="max-w-24 truncate">{hat}</b>
              </button>
            )}
            {center}
            {potAfterCenter && potBox}
          </div>

          {ordered.map((s, i) => {
            const angle = Math.PI / 2 + (2 * Math.PI * i) / n
            // Bàn vuông: chiếu hướng ngồi lên cạnh hình vuông (4 người = giữa 4 cạnh)
            const edge = square ? Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))) : 1
            const left = square ? 50 + 40 * (Math.cos(angle) / edge) : 50 + 40 * Math.cos(angle)
            const top = square ? 50 + 47 * (Math.sin(angle) / edge) : 47 + 37 * Math.sin(angle)
            // Chip cược đặt trước chỗ ngồi, về phía giữa bàn
            const side = Math.abs(Math.cos(angle)) > 0.35 ? (Math.cos(angle) < 0 ? 'right' : 'left') : Math.sin(angle) < 0 ? 'below' : 'above'
            const stake = s.stake !== undefined && (
              <span
                className={`pointer-events-none absolute z-10 flex items-center gap-0.5 rounded-full bg-night/80 py-0.5 pr-2 pl-1 text-xs font-bold whitespace-nowrap text-lemon ${STAKE_POS[side]} ${
                  s.stakeDim ? 'opacity-45' : ''
                }`}
              >
                <img src={candyFor(s.player.id)} alt="" className="size-5" draggable={false} />
                <span className="num">× {s.stake}</span>
              </span>
            )
            return (
              <div
                key={s.player.id}
                data-drop={s.player.id}
                onPointerDown={start(s.player.id)}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center text-center select-none ${size.seat} ${
                  s.player.active ? '' : 'opacity-60'
                }`}
              >
                {side === 'below' && stake}
                <span
                  className={`relative grid place-items-center rounded-full border-2 bg-plum transition ${size.avatar} ${
                    s.isMe ? 'border-lemon shadow-[0_0_18px_rgb(255_210_63/0.35)]' : 'border-line'
                  } ${ring(s.player.id)}`}
                >
                  <span aria-hidden className="leading-none">
                    {s.player.emoji}
                  </span>
                  {side !== 'below' && stake}
                </span>
                <span className={`mt-1 w-full truncate text-xs font-semibold ${s.isMe ? 'text-lemon' : ''}`}>
                  {s.isMe && !['bạn', 'tôi'].includes(s.player.name.toLowerCase()) ? `${s.player.name} (bạn)` : s.player.name}
                </span>
                <span className={`num font-display text-base leading-tight font-extrabold ${toneOf(s.total)}`} title="Lời/lỗ cả buổi">
                  {signed(s.total)}
                </span>
                {s.round !== undefined && s.round !== 0 && (
                  <span className={`num text-[11px] leading-tight font-bold ${toneOf(s.round)}`}>ván {signed(s.round)}</span>
                )}
                {s.badge && (
                  <span className="mt-0.5 rounded-full bg-night/70 px-1.5 text-[10px] leading-4 font-semibold whitespace-nowrap text-lemon">
                    {s.badge}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {corner && <div className="absolute bottom-1 left-3 z-10">{corner}</div>}
        {cornerRight && <div className="absolute right-3 bottom-1 z-10 flex gap-1.5">{cornerRight}</div>}
      </div>

      {drag?.moved && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] drop-shadow-[0_8px_12px_rgb(0_0_0/0.5)]"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.from === DEALER ? (
            <span className="text-5xl">🎩</span>
          ) : (
            <img src={drag.from === POT ? potIcon : dragCandy} alt="" className="size-16 opacity-80" />
          )}
        </div>
      )}
    </>
  )
}

/** Hiệu ứng kẹo bay từ người trả sang người nhận. */
export function flyCandy(from: ID, to: ID, amount: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = document.querySelector(`[data-drop="${from}"]`)?.getBoundingClientRect()
  const b = document.querySelector(`[data-drop="${to}"]`)?.getBoundingClientRect()
  if (!a || !b) return
  const el = document.createElement('span')
  el.className = 'candy num pointer-events-none fixed z-50 text-lg'
  el.textContent = String(amount)
  el.style.left = `${a.left + a.width / 2}px`
  el.style.top = `${a.top + a.height / 2}px`
  el.style.translate = '-50% -50%'
  document.body.appendChild(el)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  el.animate(
    [
      { transform: 'translate(0,0) scale(0.6)', opacity: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.15)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.8)`, opacity: 0.2 },
    ],
    { duration: 650, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
  ).onfinish = () => el.remove()
}
