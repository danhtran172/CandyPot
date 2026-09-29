import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { POT, type ID, type Player } from '../../core/types'
import { signed, toneOf } from '../format'

export interface Seat {
  player: Player
  /** Lời/lỗ cộng dồn các ván đã chốt. */
  total: number
  /** Được/mất trong ván đang mở; undefined = không có ván. */
  round?: number
  /** Dòng phụ: "cược 5", "Nhà cái"… */
  badge?: string
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

/**
 * Mặt bàn: kéo túi kẹo của một người thả vào người khác (hoặc pot).
 * Bấm người trả rồi bấm người nhận cũng được.
 */
export function Board({
  seats,
  pot,
  onTransfer,
}: {
  seats: Seat[]
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
      ? 'ring-4 ring-mint scale-[1.03]'
      : selected === id || (drag?.moved && drag.from === id)
        ? 'ring-4 ring-lemon'
        : ''

  const seatEl = (s: Seat) => (
    <div
      key={s.player.id}
      data-drop={s.player.id}
      onPointerDown={start(s.player.id)}
      className={`relative flex touch-none flex-col items-center rounded-3xl border border-line/60 bg-plum px-2 pt-3 pb-2.5 text-center transition select-none ${ring(
        s.player.id,
      )} ${s.player.active ? '' : 'opacity-60'}`}
    >
      <span aria-hidden className="text-4xl leading-none">
        {s.player.emoji}
      </span>
      <span className="mt-1 max-w-full truncate font-semibold">{s.player.name}</span>
      <span className={`num font-display text-3xl leading-tight font-extrabold ${toneOf(s.total)}`} title="Lời/lỗ cả buổi">
        {signed(s.total)}
      </span>
      {s.round !== undefined && (
        <span className="num text-xs text-muted">
          ván này <b className={toneOf(s.round)}>{signed(s.round)}</b>
        </span>
      )}
      {s.badge && <span className="mt-1 rounded-full bg-night/50 px-2 py-0.5 text-xs font-semibold text-lemon">{s.badge}</span>}
    </div>
  )

  const half = Math.ceil(seats.length / 2 / 2) * 2

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {seats.slice(0, pot === undefined ? seats.length : half).map(seatEl)}
        {pot !== undefined && (
          <div
            data-drop={POT}
            onPointerDown={start(POT)}
            className={`col-span-2 flex touch-none items-center justify-center gap-3 rounded-full border-2 border-dashed border-lemon/60 bg-night/40 py-4 transition select-none ${ring(POT)}`}
          >
            <span aria-hidden className="text-3xl">
              🫙
            </span>
            <span className="font-display text-lg font-bold">Pot</span>
            <span className="candy num text-xl">{pot}</span>
          </div>
        )}
        {pot !== undefined && seats.slice(half).map(seatEl)}
      </div>

      {drag?.moved && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          🍬
        </div>
      )}
    </>
  )
}

/** Hiệu ứng kẹo bay từ ô người trả sang ô người nhận. */
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
