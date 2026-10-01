import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { BET, BUY, DEALER, POT, type ID, type Player } from '../../core/types'
import { signed, toneOf } from '../format'
import { candyFor } from '../candyIcons'
import potIcon from '../../assets/pot.webp'
import dragCandy from '../../assets/drag-candy.webp'
import bowtie from '../../assets/rules/bowtie.webp'
import ticket from '../../assets/loto-ticket.webp'
import { CardBackStack } from './CardBack'
import { TURN_MS, turnStart } from '../turnClock'

export interface Seat {
  player: Player
  /** Được/mất trong ván đang mở; undefined = không có ván. Lời/lỗ cộng dồn chỉ xem ở Sổ nợ / Lịch sử. */
  round?: number
  /** Dòng phụ: "Nhà cái"… */
  badge?: string
  /** Tiền cược trong ván (Xì dách), hiện trước chỗ ngồi dạng [kẹo] × N. */
  stake?: number
  /** Cược lấy từ ván trước (chưa mở ván) — hiện mờ. */
  stakeDim?: boolean
  /** Lô tô: số tờ đã mua trong ván, hiện trước chỗ ngồi dạng [tờ bingo màu riêng] × N. */
  tickets?: { count: number; color: string }
  /** Bài trong app: số lá còn trên tay, hiện trước chỗ ngồi dạng xấp lưng bài. */
  cards?: number
  isMe?: boolean
  /** Đang có máy mở bàn (bàn nhiều người) — chấm xanh góc trên bên trái avatar. */
  online?: boolean
  /** Đang tới lượt (Poker) — viền sáng. */
  highlight?: boolean
  /** Bài trong app: đang tới lượt người này — mã lượt để vẽ vòng đếm giờ quanh avatar. */
  turnClock?: string
  /** Đã bỏ bài (Poker) — mờ đi. */
  dim?: boolean
  /** Nhà cái (Xì dách) — gắn nơ ở góc dưới bên phải avatar. */
  dealer?: boolean
  /** Nút nhỏ gắn bên phải, phía dưới avatar (vd hoàn tác Poker). */
  action?: ReactNode
  /** Vào bàn lúc ván đang chơi: chưa tính ván này, tự vào từ ván sau — avatar mờ + ⏳. */
  waiting?: boolean
  /** Số kẹo vừa đổi (+/−) — ô nhỏ dưới avatar ~1 giây; `key` đổi thì chạy lại hiệu ứng. */
  pop?: { amount: number; key: number }
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
  // Xoay ngang (bàn thấp): người ngồi cạnh trên / dưới đặt chip sang bên phải, không đè giữa bàn
  above: 'bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 land:bottom-auto land:left-[calc(100%+6px)] land:top-1/2 land:translate-x-0 land:-translate-y-1/2',
  below: 'top-[calc(100%+2px)] left-1/2 -translate-x-1/2 land:left-[calc(100%+6px)] land:top-1/2 land:translate-x-0 land:-translate-y-1/2',
} as const

/** Kích thước ô theo số người để 10 người vẫn vừa quanh bàn. */
/** Bàn vuông: cạnh cho từng người theo số người (0 = dưới, 1 = trái, 2 = trên, 3 = phải — chiều kim đồng hồ). */
const SQUARE_SIDES: Record<number, number[]> = { 1: [0], 2: [0, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3] }

function sizeFor(n: number) {
  if (n <= 6) return { seat: 'w-[78px]', avatar: 'size-13 text-3xl' }
  if (n <= 8) return { seat: 'w-[68px]', avatar: 'size-11 text-2xl' }
  return { seat: 'w-[60px]', avatar: 'size-10 text-2xl' }
}

/** Chiều cao vùng bàn (biến CSS trong index.css — xoay ngang thì thấp lại). */
const HEIGHT = 'var(--board-h)'

/**
 * Bàn oval (hoặc vuông với Tiến lên): mọi người xếp đều quanh bàn, "tôi" ở dưới cùng.
 * Kéo từ một người thả vào người khác (hoặc pot) để trả — gói kẹo (drag-candy.webp) hiện ra theo tay khi kéo.
 */
export function Board({
  seats,
  center,
  cornerTop,
  pot,
  potAfterCenter,
  betBox,
  betLocked,
  onBetHold,
  buyBox,
  title,
  potScale,
  hat,
  hatLocked,
  shape = 'oval',
  onTransfer,
  onTap,
}: {
  seats: Seat[]
  /** Hình bàn: oval (mặc định) hoặc vuông — 4 người ngồi 4 cạnh. */
  shape?: 'oval' | 'square'
  /** Nội dung giữa bàn (theo game). */
  center?: ReactNode
  /** Nút ở góc trên bên phải bàn (Rule ? + ⚙ cài đặt). */
  cornerTop?: ReactNode
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
  /** Lô tô chưa chốt: ô Mua (hồng) ghi giá mỗi tờ — bấm = mua cho mình, thả người vào = mua hộ (chỉ ô này, thả vào Pot không mua). */
  buyBox?: { price: number }
  /** Tên chế độ chơi (kèm icon) — in mờ (70%) trên mặt bàn. */
  title?: ReactNode
  /** Thu nhỏ ô Pot theo tỉ lệ này (VD 0.4 = còn 40%). */
  potScale?: number
  /** Tên nhà cái — hiện mũ 🎩 kéo được sang người khác để đổi cái. */
  hat?: string
  /** Không đổi được nhà cái (không phải host) → ô 🎩 chỉ để xem. */
  hatLocked?: boolean
  onTransfer: (from: ID, to: ID) => void
  /** Bấm (không kéo) vào một người / pot / ô Bet / mũ nhà cái. */
  onTap?: (id: ID) => void
}) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<ID | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const dragging = drag !== null
  const holdTimer = useRef<number | undefined>(undefined)
  const [holding, setHolding] = useState(false)
  const held = useRef(false)

  /** Nhấn giữ ~0,6 giây trên ô Bet đã chốt. */
  const startHold = (e: ReactPointerEvent) => {
    held.current = false
    if (!betLocked || !onBetHold || e.button !== 0) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      setHolding(false)
      held.current = true
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
      } else onTap?.(d.from)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, onTransfer, onTap])

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
  // Giữ đúng thứ tự ngồi (chiều kim đồng hồ), xoay để "tôi" ở dưới cùng
  const meAt = Math.max(0, seats.findIndex((s) => s.isMe))
  const ordered = [...seats.slice(meAt), ...seats.slice(0, meAt)]
  const n = ordered.length
  const size = sizeFor(n)
  const square = shape === 'square'

  const potBox = pot !== undefined && (
    <div
      data-drop={POT}
      data-guide="pot"
      // Thu nhỏ (vd Lô tô lúc mua tờ — ô Mua là chính); zoom co cả chỗ chiếm trong bố cục
      style={potScale !== undefined ? { zoom: potScale } : undefined}
      onPointerDown={start(POT)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onTap?.(POT)}
      aria-label={`Pot: ${pot} kẹo`}
      className={`relative flex cursor-pointer min-w-28 touch-none flex-col items-center rounded-3xl border-2 border-dashed border-lemon/60 bg-night/50 px-4 pt-7 pb-2 transition select-none ${ring(POT)}`}
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
          className={
            square ? 'absolute top-[48%] left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 land:aspect-auto land:h-full' : 'absolute inset-0'
          }
          // Xoay ngang: bàn "vuông" thành chữ nhật trải hết bề ngang
          style={square ? { width: 'var(--board-w)' } : undefined}
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
            {title && (
              <span className="font-display pointer-events-none flex items-center gap-1.5 text-2xl leading-none font-extrabold tracking-wider uppercase opacity-70 land:hidden">
                {title}
              </span>
            )}
            {!potAfterCenter && potBox}
            {betBox && (
              <div
                data-drop={BET}
                data-guide="bet"
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onClick={() => {
                  if (held.current) held.current = false
                  else onTap?.(BET)
                }}
                role="button"
                tabIndex={0}
                aria-label={betLocked ? 'Bet đã chốt — host giữ để bỏ chốt' : 'Bet — bấm để đặt cược'}
                className={`flex cursor-pointer touch-none flex-col items-center rounded-3xl border-2 bg-night/50 px-4 py-2 transition select-none ${
                  betLocked ? 'border-line opacity-70' : 'border-dashed border-sky/70'
                } ${holding ? 'scale-95 opacity-100 ring-4 ring-lemon/60' : ''} ${ring(BET)}`}
              >
                <span className="font-display text-2xl leading-none font-bold text-sky">{betLocked ? '🔒 Bet' : 'Bet'}</span>
                <span className="mt-1 text-[10px] text-muted">{betLocked ? 'đã chốt · host giữ để bỏ chốt' : 'bấm để đặt cược'}</span>
              </div>
            )}
            {hat && hatLocked && (
              <span data-guide="hat" className="flex items-center gap-1 rounded-full bg-night/60 px-2.5 py-1 text-xs">
                <span aria-hidden className="text-base leading-none">
                  🎩
                </span>
                <b className="max-w-24 truncate">{hat}</b>
              </span>
            )}
            {hat && !hatLocked && (
              <button
                type="button"
                onPointerDown={start(DEALER)}
                data-guide="hat"
                className={`flex touch-none items-center gap-1 rounded-full bg-night/60 px-2.5 py-1 text-xs select-none ${
                  drag?.moved && drag.from === DEALER ? 'ring-2 ring-lemon' : ''
                }`}
                aria-label={`Nhà cái: ${hat}. Bấm để chọn cái khác`}
              >
                <span aria-hidden className="text-base leading-none">
                  🎩
                </span>
                <b className="max-w-24 truncate">{hat}</b>
              </button>
            )}
            {center}
            {potAfterCenter && potBox}
            {/* Ô Mua ở cuối cột giữa — gần chỗ ngồi của mình (dưới cùng bàn) */}
            {buyBox && (
              <div
                data-drop={BUY}
                data-guide="buy"
                onClick={() => onTap?.(BUY)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onTap?.(BUY)}
                aria-label={`Mua tờ — ${buyBox.price} kẹo một tờ`}
                className={`flex cursor-pointer touch-none flex-col items-center rounded-3xl border-2 border-dashed border-pink-400/70 bg-night/50 px-4 py-2 transition select-none active:scale-95 ${ring(BUY)}`}
              >
                <span className="font-display text-2xl leading-none font-bold text-pink-400">Mua</span>
                <span className="mt-1 text-[10px] text-muted">
                  <b className="text-pink-300">{buyBox.price} kẹo</b> / tờ
                </span>
              </div>
            )}
          </div>

          {ordered.map((s, i) => {
            // Bàn vuông ≤ 4 người: mỗi người một cạnh (tôi cạnh dưới; 3 người = dưới, trái, phải; 2 người = dưới, trên)
            const sideSlots = square && n <= 4 ? SQUARE_SIDES[n] : undefined
            const angle = sideSlots ? (Math.PI / 2) * sideSlots[i] + Math.PI / 2 : Math.PI / 2 + (2 * Math.PI * i) / n
            // Bàn vuông đông hơn 4 người: chiếu hướng ngồi lên cạnh hình vuông
            const edge = square ? Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))) : 1
            const left = square ? 50 + 40 * (Math.cos(angle) / edge) : 50 + 40 * Math.cos(angle)
            const top = square ? 50 + 47 * (Math.sin(angle) / edge) : 47 + 37 * Math.sin(angle)
            // Chip cược đặt trước chỗ ngồi, về phía giữa bàn
            const side = Math.abs(Math.cos(angle)) > 0.35 ? (Math.cos(angle) < 0 ? 'right' : 'left') : Math.sin(angle) < 0 ? 'below' : 'above'
            const stake = s.cards !== undefined ? (
              <span className={`pointer-events-none absolute z-10 flex items-center rounded-full bg-night/80 py-0.5 pr-2 pl-1.5 whitespace-nowrap ${STAKE_POS[side]}`}>
                <CardBackStack count={s.cards} />
              </span>
            ) : s.tickets ? (
              <span
                className={`pointer-events-none absolute z-10 flex items-center gap-1 rounded-full bg-night/80 py-0.5 pr-2 pl-1 text-xs font-bold whitespace-nowrap ${STAKE_POS[side]}`}
                style={{ color: s.tickets.color }}
                title={`${s.tickets.count} tờ`}
              >
                <TicketIcon color={s.tickets.color} />
                <span className="num">× {s.tickets.count}</span>
              </span>
            ) : s.stake !== undefined && (
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
                // Hướng dẫn: 'me' = mình; 'other' = người ngồi đối diện (bàn tay mẫu kéo / bấm vào đây)
                data-guide={s.isMe ? 'me' : i === Math.ceil((n - 1) / 2) ? 'other' : undefined}
                onPointerDown={start(s.player.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onTap?.(s.player.id)}
                aria-label={s.isMe ? `${s.player.name} (bạn)` : `Trả kẹo cho ${s.player.name}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={`absolute flex -translate-x-1/2 cursor-pointer -translate-y-1/2 touch-none flex-col items-center text-center select-none ${size.seat} ${
                  s.dim ? 'opacity-35' : ''
                }`}
              >
                {side === 'below' && stake}
                <span
                  className={`relative grid place-items-center rounded-full border-2 bg-plum transition ${size.avatar} ${
                    s.highlight
                      ? 'border-mint ring-4 ring-mint/40 shadow-[0_0_22px_rgb(61_220_151/0.55)]'
                      : s.isMe
                        ? 'border-lemon shadow-[0_0_18px_rgb(255_210_63/0.35)]'
                        : 'border-line'
                  } ${ring(s.player.id)}`}
                >
                  <span aria-hidden className={`leading-none ${s.player.active && !s.waiting ? '' : 'opacity-40'}`}>
                    {s.player.emoji}
                  </span>
                  {s.dealer && (
                    <img
                      src={bowtie}
                      alt="Nhà cái"
                      title="Nhà cái"
                      draggable={false}
                      className="absolute -right-2.5 -bottom-1 size-7 max-w-none drop-shadow-[0_0_1.5px_#fff1e0]"
                    />
                  )}
                  {s.turnClock && <TurnRing key={s.turnClock} turnKey={s.turnClock} />}
                  {s.online && <OnlineDot className="absolute -top-0.5 -left-0.5" />}
                  {!s.player.active ? (
                    <span aria-label="Tạm nghỉ" className="absolute -top-1.5 -right-2 text-base leading-none">
                      💤
                    </span>
                  ) : (
                    s.waiting && (
                      <span aria-label="Chờ ván sau" className="absolute -top-1.5 -right-2 text-base leading-none">
                        ⏳
                      </span>
                    )
                  )}
                  {side !== 'below' && stake}
                  {s.pop && (
                    <span
                      key={s.pop.key}
                      aria-live="polite"
                      className={`candy-pop num font-display pointer-events-none absolute top-[calc(100%+3px)] left-1/2 z-20 -translate-x-1/2 rounded-lg border px-1.5 text-sm leading-5 font-extrabold whitespace-nowrap shadow-lg ${
                        s.pop.amount > 0 ? 'border-mint/60 bg-night text-mint' : 'border-berry/60 bg-night text-berry'
                      }`}
                    >
                      {signed(s.pop.amount)}
                    </span>
                  )}
                </span>
                <span
                  className={`mt-1 w-full truncate text-xs font-semibold ${s.isMe ? 'text-lemon' : ''} ${s.player.active && !s.waiting ? '' : 'opacity-50'}`}
                >
                  {s.isMe && !['bạn', 'tôi'].includes(s.player.name.toLowerCase()) ? `${s.player.name} (bạn)` : s.player.name}
                </span>
                {/* Chỉ hiện được/mất của ván đang chơi — tổng cả bàn xem ở Sổ nợ / Lịch sử */}
                {s.waiting && s.player.active && (
                  <span className="text-[10px] leading-tight font-semibold whitespace-nowrap text-muted">chờ ván sau</span>
                )}
                {s.round !== undefined && (
                  <span className={`num font-display text-base leading-tight font-extrabold ${toneOf(s.round)}`} title="Được/mất ván này">
                    {signed(s.round)}
                  </span>
                )}
                {s.badge && (
                  <span className="mt-0.5 rounded-full bg-night/70 px-1.5 text-[10px] leading-4 font-semibold whitespace-nowrap text-lemon">
                    {s.badge}
                  </span>
                )}
                {s.action && (
                  // Không để nút bắt đầu thao tác kéo của ghế
                  <div className="absolute top-12 left-[calc(100%-6px)]" onPointerDown={(e) => e.stopPropagation()}>
                    {s.action}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {cornerTop && <div className="absolute top-1 right-3 left-3 z-10 flex justify-end">{cornerTop}</div>}
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

/** Chấm xanh "đang mở app". */
export function OnlineDot({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="Đang online" title="Đang online" className={`size-3 rounded-full bg-mint ring-2 ring-plum ${className}`} />
}

/** Tờ lô tô (hình bingo) tô theo màu của từng người. */
function TicketIcon({ color }: { color: string }) {
  const mask = `url(${ticket}) center / contain no-repeat`
  return <span aria-hidden className="size-5 shrink-0" style={{ backgroundColor: color, mask, WebkitMask: mask }} />
}

/** Vòng đếm giờ quanh avatar: cạn dần theo thời gian lượt, chuyển đỏ lúc sắp hết. */
function TurnRing({ turnKey }: { turnKey: string }) {
  const arc = useRef<SVGCircleElement>(null)
  useEffect(() => {
    const el = arc.current
    if (!el) return
    const elapsed = Date.now() - turnStart(turnKey)
    const a = el.animate(
      [
        { strokeDashoffset: 0, stroke: '#3ddc97' },
        { strokeDashoffset: 0.7, stroke: '#ffd23f', offset: 0.7 },
        { strokeDashoffset: 1, stroke: '#ff5c7a' },
      ],
      { duration: TURN_MS, delay: -elapsed, fill: 'both' },
    )
    return () => a.cancel()
  }, [turnKey])
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute -inset-1.5 size-[calc(100%+12px)] -rotate-90">
      <circle cx="20" cy="20" r="19" fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="2.5" />
      <circle ref={arc} cx="20" cy="20" r="19" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" />
    </svg>
  )
}
