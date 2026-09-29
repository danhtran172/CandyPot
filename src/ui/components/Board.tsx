import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { POT, type ID, type Player } from '../../core/types'
import { signed, toneOf } from '../format'
import { CandyJar } from './CandyJar'
import { CandyPile } from './CandyPile'

export interface Seat {
  player: Player
  /** Lời/lỗ cộng dồn các ván đã chốt. */
  total: number
  /** Được/mất trong ván đang mở; undefined = không có ván. */
  round?: number
  /** Số kẹo vẽ thành đống trước chỗ ngồi (âm = đống 💩). */
  pile: number
  /** Dòng phụ: "cược 5", "Nhà cái"… */
  badge?: string
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

/** Vị trí đống kẹo so với avatar (hoặc cả ô, với người ngồi trên cùng). */
const PILE_POS = {
  right: 'left-[calc(100%+6px)] bottom-0',
  left: 'right-[calc(100%+6px)] bottom-0',
  above: 'bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2',
  below: 'top-[calc(100%+2px)] left-1/2 -translate-x-1/2',
} as const

/** Kích thước ô theo số người để 10 người vẫn vừa quanh bàn. */
function sizeFor(n: number) {
  if (n <= 6) return { seat: 'w-[78px]', avatar: 'size-13 text-3xl', icon: 19 }
  if (n <= 8) return { seat: 'w-[68px]', avatar: 'size-11 text-2xl', icon: 16 }
  return { seat: 'w-[60px]', avatar: 'size-10 text-2xl', icon: 14 }
}

/**
 * Bàn oval: mọi người xếp đều quanh bàn, "tôi" ở dưới cùng.
 * Kéo từ một người thả vào người khác (hoặc pot) để trả — hũ kẹo hiện ra theo tay khi kéo;
 * bấm người trả rồi bấm người nhận cũng được.
 */
export function Board({
  seats,
  unit,
  center,
  pot,
  onTransfer,
}: {
  seats: Seat[]
  /** Bao nhiêu kẹo thì vẽ 1 icon trong đống. */
  unit: number
  /** Nội dung giữa bàn (theo game). */
  center?: ReactNode
  /** Số kẹo trong pot; undefined = bàn không có pot. */
  pot?: number
  onTransfer: (from: ID, to: ID) => void
}) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<ID | null>(null)
  const [selected, setSelected] = useState<ID | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const dragging = drag !== null

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
        setSelected(null)
        return
      }
      // Bấm (không kéo): chọn người trả, bấm tiếp người nhận
      if (selected && selected !== d.from) {
        onTransfer(selected, d.from)
        setSelected(null)
      } else {
        setSelected(selected === d.from ? null : d.from)
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
  }, [dragging, selected, onTransfer])

  const start = (id: ID) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const d = { from: id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false }
    dragRef.current = d
    setDrag(d)
  }

  const ring = (id: ID) =>
    hover === id && drag?.from !== id
      ? 'ring-4 ring-mint scale-110'
      : selected === id || (drag?.moved && drag.from === id)
        ? 'ring-4 ring-lemon'
        : ''

  // "Tôi" ở dưới cùng, những người khác xếp đều theo chiều kim đồng hồ
  const ordered = [...seats.filter((s) => s.isMe), ...seats.filter((s) => !s.isMe)]
  const n = ordered.length
  const size = sizeFor(n)

  return (
    <>
      <div className="relative mx-auto w-full" style={{ height: 'clamp(380px, calc(100dvh - 340px), 540px)' }}>
        {/* Mặt bàn */}
        <div className="absolute inset-x-[17%] top-[16%] bottom-[22%] rounded-[50%] border-2 border-line bg-[radial-gradient(ellipse_at_center,#3b2147_0%,#2b1734_70%)] shadow-[inset_0_0_40px_rgb(0_0_0/0.45)]" />
        <div className="absolute inset-x-[22%] top-[23%] bottom-[29%] flex flex-col items-center justify-center gap-1 text-center">
          {pot !== undefined && (
            <div
              data-drop={POT}
              onPointerDown={start(POT)}
              className={`flex touch-none flex-col items-center rounded-3xl border-2 border-dashed border-lemon/60 bg-night/50 px-4 py-2 transition select-none ${ring(POT)}`}
            >
              <span aria-hidden className="text-3xl leading-none">
                💰
              </span>
              <span className="candy num mt-1 text-lg">{pot}</span>
              <span className="text-[11px] text-muted">Pot</span>
            </div>
          )}
          {center}
        </div>

        {ordered.map((s, i) => {
          const angle = Math.PI / 2 + (2 * Math.PI * i) / n
          const left = 50 + 40 * Math.cos(angle)
          const top = 47 + 37 * Math.sin(angle)
          // Đống kẹo đặt sát chỗ ngồi, về phía giữa bàn
          const side = Math.abs(Math.cos(angle)) > 0.35 ? (Math.cos(angle) < 0 ? 'right' : 'left') : Math.sin(angle) < 0 ? 'below' : 'above'
          const pile = (
            <div className={`pointer-events-none absolute ${PILE_POS[side]}`}>
              <CandyPile amount={s.pile} unit={unit} seed={s.player.id} size={size.icon} />
            </div>
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
              {side === 'below' && pile}
              <span
                className={`relative grid place-items-center rounded-full border-2 bg-plum transition ${size.avatar} ${
                  s.isMe ? 'border-lemon shadow-[0_0_18px_rgb(255_210_63/0.35)]' : 'border-line'
                } ${ring(s.player.id)}`}
              >
                <span aria-hidden className="leading-none">
                  {s.player.emoji}
                </span>
                {side !== 'below' && pile}
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

      {drag?.moved && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] drop-shadow-[0_8px_12px_rgb(0_0_0/0.5)]"
          style={{ left: drag.x, top: drag.y }}
        >
          <CandyJar className="h-14 w-12" />
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
