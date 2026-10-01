import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { BET, BUY, DEALER, POT, type ID, type Player } from '../../core/types'
import { signed, toneOf } from '../format'
import { candyFor } from '../candyIcons'
import potIcon from '../../assets/pot.webp'
import dragCandy from '../../assets/drag-candy.webp'
import bowtie from '../../assets/rules/bowtie.webp'
import ticket from '../../assets/loto-ticket.webp'
import { CardBackStack } from './CardBack'
import { PlayingCard } from './TienlenPanel'
import { TURN_MS, turnStart } from '../turnClock'
import { useLandscape } from '../landscape'

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
  /** Xì dách, lượt cái: xấp bài của con chạm được như chạm avatar (để xét); `ready` = xét được ngay → viền sáng. */
  checkable?: 'ready' | 'blocked'
  /** Bài đã lật cho cả bàn xem (Xì dách: đã được xét / bài cái) — thay cho xấp lưng bài. */
  faceUp?: number[]
  /** Làm nổi bật bài lật (bài của cái). */
  faceUpGlow?: boolean
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
  above:
    'bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 land:bottom-auto land:left-[calc(100%+6px)] land:top-1/2 land:translate-x-0 land:-translate-y-1/2',
  below: 'top-[calc(100%+2px)] left-1/2 -translate-x-1/2 land:left-[calc(100%+6px)] land:top-1/2 land:translate-x-0 land:-translate-y-1/2',
} as const

/** Kích thước ô theo số người để 10 người vẫn vừa quanh bàn. */
/** Bàn vuông: cạnh cho từng người theo số người (0 = dưới, 1 = trái, 2 = trên, 3 = phải — chiều kim đồng hồ). */
const SQUARE_SIDES: Record<number, number[]> = { 1: [0], 2: [0, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3] }

/** Hoa văn mặt bàn nhựa: lưới mảnh, ngôi sao 4 cánh ở mỗi giao điểm — vẽ 2 lớp (sáng lệch lên, tối lệch xuống) cho nổi gờ. */
const PLASTIC_STAR = 'M18 9 L19 17 L27 18 L19 19 L18 27 L17 19 L9 18 L17 17 Z'
const plasticTile = (color: string, dy: number) =>
  `<g transform="translate(0 ${dy})" fill="${color}" stroke="${color}" stroke-width="0.6"><path d="${PLASTIC_STAR}" stroke="none"/><path d="M0 18H9M27 18H36M18 0V9M18 27V36" fill="none"/></g>`
const PLASTIC_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">${plasticTile('rgba(255,255,255,0.16)', -0.7)}${plasticTile('rgba(80,0,0,0.28)', 0.7)}</svg>`,
)}")`
/** Mặt bàn nhựa đỏ (Lô tô): hoa văn + ánh bóng trên nền đỏ; viền gờ sáng, dày bên dưới, bóng đổ xuống sàn. */
const PLASTIC_TOP = {
  background: `radial-gradient(ellipse at 30% 20%, rgb(255 255 255 / 0.22), transparent 55%), ${PLASTIC_PATTERN}, linear-gradient(180deg, #e63335, #c81e24 60%, #b5171d)`,
  backgroundSize: 'auto, 36px 36px, auto',
  backgroundPosition: 'center',
  boxShadow:
    'inset 0 0 0 5px rgb(255 255 255 / 0.07), inset 0 0 0 6px rgb(120 0 0 / 0.35), inset 0 2px 0 rgb(255 255 255 / 0.45), 0 9px 0 #8f1015, 0 22px 30px rgb(0 0 0 / 0.55)',
}

/**
 * Chân bàn nhựa: bản to ở trên, vát cong phía trong rồi thon dần xuống, hơi choãi ra ngoài (vẽ chân trái, chân phải lật lại).
 */
function PlasticLeg({ side }: { side: 'left' | 'right' }) {
  const id = useId()
  return (
    <svg
      aria-hidden
      viewBox="0 0 28 64"
      preserveAspectRatio="none"
      className={`absolute top-[calc(100%-12px)] w-[26px] ${side === 'left' ? 'left-[2%]' : 'right-[2%] -scale-x-100'}`}
      style={{
        height: 'min(60px, 32%)',
        filter: 'drop-shadow(0 6px 6px rgb(0 0 0 / 0.5))',
      }}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#9b1218" />
          <stop offset="0.4" stopColor="#e0373a" />
          <stop offset="1" stopColor="#a8151b" />
        </linearGradient>
      </defs>
      <path d="M3 0H28C20 4 16 10 15 18L13 61Q12.5 64 10 64H3Q.5 64 .5 61Z" fill={`url(#${id})`} />
    </svg>
  )
}

/** Bàn Poker: tay vịn da nâu (dày, đổ bóng), viền bạc, mặt nỉ xanh. */
const POKER_RAIL = {
  background: 'radial-gradient(ellipse at 50% 30%, #7a3b22, #4a1f10 70%, #2e1208)',
  boxShadow: 'inset 0 2px 0 rgb(255 220 190 / 0.35), inset 0 -3px 6px rgb(0 0 0 / 0.5), 0 8px 0 #24100a, 0 22px 30px rgb(0 0 0 / 0.55)',
}
const POKER_CHROME = { background: 'linear-gradient(160deg, #f4f4f4, #9a9a9a 35%, #e8e8e8 55%, #7d7d7d 80%, #d0d0d0)' }
const POKER_FELT = {
  background: 'radial-gradient(ellipse at 50% 40%, #23874f 0%, #146238 55%, #0b3f22 100%)',
  boxShadow: 'inset 0 0 28px rgb(0 0 0 / 0.55)',
}

/** Vân gỗ: nhiễu kéo dài theo chiều ngang (feTurbulence), tô màu nâu sẫm, phủ lên nền gỗ. */
const WOOD_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.12" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.24  0 0 0 0 0.09  0 0 0 0 0.02  1.3 0 0 0 -0.45"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`,
)}")`
/** Bàn gỗ vuông (Tiến lên): vân gỗ + ánh bóng trên nền nâu đỏ; cạnh sáng, dày bên dưới, bóng đổ xuống sàn. */
const WOOD_TOP = {
  background: `radial-gradient(ellipse at 30% 20%, rgb(255 230 200 / 0.22), transparent 55%), ${WOOD_GRAIN}, linear-gradient(135deg, #b85d2b, #93431c 50%, #a8502a)`,
  backgroundSize: 'auto, 320px 320px, auto',
  boxShadow:
    'inset 0 0 0 2px rgb(255 210 170 / 0.18), inset 0 2px 0 rgb(255 235 210 / 0.4), 0 8px 0 #5b2610, 0 20px 28px rgb(0 0 0 / 0.55)',
}

/** Chân bàn gỗ: thanh vuông thẳng, sáng giữa tối hai bên. */
function WoodLeg({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={`absolute top-[calc(100%-10px)] w-[18px] rounded-b-[2px] shadow-[0_6px_8px_rgb(0_0_0/0.5)] ${side === 'left' ? 'left-[3%]' : 'right-[3%]'}`}
      style={{ height: 'min(56px, 28%)', background: 'linear-gradient(90deg, #6b2d12, #b0582a 45%, #7a3515)' }}
    />
  )
}

/** Bàn xì dách: nửa bầu dục, cạnh thẳng bên trái (chỗ nhà cái), cung bên phải. */
const BJ_RADIUS = '0 100% 100% 0 / 0 50% 50% 0'
/** Đệm tay vịn da đen dọc theo cung. */
const BJ_RAIL = {
  borderRadius: BJ_RADIUS,
  background: 'radial-gradient(ellipse at 30% 35%, #3a3a3a, #121212 65%, #050505)',
  boxShadow: 'inset 0 2px 0 rgb(255 255 255 / 0.18), inset 0 -3px 6px rgb(0 0 0 / 0.6), 0 8px 0 #000, 0 22px 30px rgb(0 0 0 / 0.55)',
}
const BJ_FELT = {
  borderRadius: BJ_RADIUS,
  background: 'radial-gradient(ellipse at 25% 50%, #1f8048 0%, #136137 55%, #0b4023 100%)',
  boxShadow: 'inset 0 0 26px rgb(0 0 0 / 0.55)',
}
/** Màu phỉnh trong khay của nhà cái. */
const BJ_CHIPS = ['#d62828', '#f7f7f7', '#2b9348', '#1d3557', '#111', '#ffb703']

/** Đế trụ bàn Poker: thân trụ đen, hai bậc đế rộng dần. */
function PokerPedestal() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      className="absolute top-[calc(100%-10px)] left-1/2 w-[42%] -translate-x-1/2 drop-shadow-[0_6px_8px_rgb(0_0_0/0.6)]"
      style={{ height: 'min(56px, 30%)' }}
    >
      <defs>
        <linearGradient id="poker-base" x1="0" x2="1">
          <stop offset="0" stopColor="#050505" />
          <stop offset="0.45" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      <path d="M26 0H74V40H26Z" fill="url(#poker-base)" />
      <path d="M18 40H82Q86 40 86 44V48H14V44Q14 40 18 40Z" fill="url(#poker-base)" stroke="#555" strokeWidth="0.6" />
      <path d="M8 48H92Q96 48 96 52V60H4V52Q4 48 8 48Z" fill="url(#poker-base)" stroke="#555" strokeWidth="0.6" />
    </svg>
  )
}

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
  /** Hình bàn: oval (mặc định), vuông — 4 người ngồi 4 cạnh (`wood`: vuông bằng gỗ, Tiến lên), hay bàn nhựa đỏ chữ nhật (Lô tô), hay bàn Poker (nỉ xanh, tay vịn da, đế trụ) — ngồi quanh như oval;
   * hay bàn xì dách bán nguyệt: nhà cái ngồi giữa cạnh thẳng bên trái, người chơi dọc theo cung bên phải. */
  shape?: 'oval' | 'square' | 'wood' | 'plastic' | 'poker' | 'blackjack'
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
    hover === id && drag?.from !== id ? 'ring-4 ring-mint scale-110' : drag?.moved && drag.from === id ? 'ring-4 ring-lemon' : ''

  // "Tôi" ở dưới cùng, những người khác xếp đều theo chiều kim đồng hồ
  // Giữ đúng thứ tự ngồi (chiều kim đồng hồ), xoay để "tôi" ở dưới cùng
  const meAt = Math.max(
    0,
    seats.findIndex((s) => s.isMe),
  )
  const ordered = [...seats.slice(meAt), ...seats.slice(0, meAt)]
  const n = ordered.length
  const size = sizeFor(n)
  const square = shape === 'square' || shape === 'wood'
  const land = useLandscape()
  // Bàn xì dách: nhà cái ngồi giữa cạnh thẳng bên trái (kể cả khi mình là cái); người chơi dọc theo cung từ trên xuống,
  // mình (nếu không làm cái) ở cuối cung phía dưới. `angle` = hướng nhìn từ tâm bàn (để đặt bài / cược về phía bàn).
  const blackjack = (() => {
    if (shape !== 'blackjack') return undefined
    const pos = new Map<ID, { left: number; top: number; angle: number }>()
    const dealer = ordered.find((s) => s.dealer)
    if (dealer) pos.set(dealer.player.id, { left: 9, top: 47, angle: Math.PI })
    const arc = ordered.filter((s) => s !== dealer)
    // ordered bắt đầu từ mình → đưa mình xuống cuối cung
    const seq = arc[0]?.isMe ? [...arc.slice(1), arc[0]] : arc
    // Ít người thì cung hẹp lại (không dồn về hai đầu sát cạnh nhà cái): 2 người ±40°, 3 người ±55°, từ 4 người ±70°.
    // Xoay ngang bàn dẹt: người chơi quây quanh đầu cong bên phải (giữa bàn dồn sang trái), cung rộng tới ±80°
    const span = land ? Math.min(80, 40 + 20 * (seq.length - 1)) : Math.min(70, 25 + 15 * (seq.length - 1))
    const [cx, rx, ry] = land ? [58, 30, 42] : [16, 68, 38]
    seq.forEach((s, j) => {
      const t = seq.length === 1 ? 0.5 : j / (seq.length - 1)
      const angle = ((-span + 2 * span * t) * Math.PI) / 180
      pos.set(s.player.id, { left: cx + rx * Math.cos(angle), top: 47 + ry * Math.sin(angle), angle })
    })
    return pos
  })()

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
            square
              ? 'absolute top-[48%] left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 land:aspect-auto land:h-full'
              : 'absolute inset-0'
          }
          // Xoay ngang: bàn "vuông" thành chữ nhật trải hết bề ngang
          style={square ? { width: 'var(--board-w)' } : undefined}
        >
          {/* Mặt bàn */}
          {shape === 'blackjack' ? (
            <div className="absolute top-[14%] right-[18%] bottom-[20%] left-[16%]">
              {/* Đệm da đen dọc cung → mặt nỉ xanh (cạnh nhà cái chỉ một gờ mỏng) */}
              <div className="absolute inset-0" style={BJ_RAIL}>
                <div className="absolute top-[13px] right-[13px] bottom-[13px] left-[5px]" style={BJ_FELT}>
                  {/* Hai đường kẻ vàng mờ song song với cung, như vạch bảo hiểm trên bàn thật */}
                  <span
                    className="absolute top-[16%] right-[14%] bottom-[16%] left-0 border border-l-0 border-[#d4a72c]/35"
                    style={{ borderRadius: BJ_RADIUS }}
                  />
                  <span
                    className="absolute top-[22%] right-[20%] bottom-[22%] left-0 border border-l-0 border-[#d4a72c]/25"
                    style={{ borderRadius: BJ_RADIUS }}
                  />
                  {/* Khay phỉnh của nhà cái sát cạnh thẳng */}
                  <span className="absolute top-1/2 left-1 flex h-[26%] w-[10%] min-w-5 -translate-y-1/2 flex-col gap-[2px] rounded-sm bg-black/60 p-[2px] shadow-[inset_0_1px_3px_rgb(0_0_0/0.8)]">
                    {BJ_CHIPS.map((c) => (
                      <span
                        key={c}
                        className="flex-1 rounded-[2px]"
                        style={{ background: `linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 60%, #fff), ${c})` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          ) : shape === 'poker' ? (
            <div className="absolute inset-x-[17%] top-[16%] bottom-[22%]">
              <PokerPedestal />
              {/* Tay vịn da → viền bạc → mặt nỉ (có đường kẻ mờ chỗ đặt cược) */}
              <div className="absolute inset-0 rounded-full" style={POKER_RAIL}>
                <div className="absolute inset-[12px] rounded-full p-[3px]" style={POKER_CHROME}>
                  <div className="relative size-full rounded-full" style={POKER_FELT}>
                    <span className="absolute inset-[13%] rounded-full border border-white/10" />
                  </div>
                </div>
              </div>
            </div>
          ) : shape === 'wood' ? (
            <div className="absolute inset-[22%]">
              <WoodLeg side="left" />
              <WoodLeg side="right" />
              <div className="absolute inset-0 rounded-md" style={WOOD_TOP} />
            </div>
          ) : shape === 'plastic' ? (
            <div className="absolute inset-x-[19%] top-[17%] bottom-[25%]">
              {/* 2 chân trước, mặt bàn đè lên trên */}
              <PlasticLeg side="left" />
              <PlasticLeg side="right" />
              <div className="absolute inset-0 rounded-[1.4rem]" style={PLASTIC_TOP} />
            </div>
          ) : (
            <div
              className={`absolute border-2 border-line shadow-[inset_0_0_40px_rgb(0_0_0/0.45)] ${
                square
                  ? 'inset-[22%] rounded-[2rem] bg-[radial-gradient(circle_at_center,#3b2147_0%,#2b1734_75%)]'
                  : 'inset-x-[17%] top-[16%] bottom-[22%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,#3b2147_0%,#2b1734_70%)]'
              }`}
            />
          )}
          <div
            className={`absolute flex flex-col items-center justify-center gap-1 text-center ${
              square
                ? 'inset-[26%]'
                : shape === 'blackjack'
                  ? 'top-[24%] right-[24%] bottom-[28%] left-[25%] land:right-[42%] land:left-[21%]'
                  : 'inset-x-[22%] top-[23%] bottom-[29%]'
            } ${
              // Bàn nhựa đỏ / nỉ xanh / gỗ: chữ xám mờ khó đọc trên nền màu → sáng lên
              shape === 'plastic' || shape === 'poker' || shape === 'wood' || shape === 'blackjack' ? '[&_.text-muted]:text-white/80' : ''
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
            const bj = blackjack?.get(s.player.id)
            const angle = bj ? bj.angle : sideSlots ? (Math.PI / 2) * sideSlots[i] + Math.PI / 2 : Math.PI / 2 + (2 * Math.PI * i) / n
            // Bàn vuông đông hơn 4 người: chiếu hướng ngồi lên cạnh hình vuông
            const edge = square ? Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle))) : 1
            const left = bj ? bj.left : square ? 50 + 40 * (Math.cos(angle) / edge) : 50 + 40 * Math.cos(angle)
            const top = bj ? bj.top : square ? 50 + 47 * (Math.sin(angle) / edge) : 47 + 37 * Math.sin(angle)
            // Chip cược đặt trước chỗ ngồi, về phía giữa bàn
            const side =
              Math.abs(Math.cos(angle)) > 0.35 ? (Math.cos(angle) < 0 ? 'right' : 'left') : Math.sin(angle) < 0 ? 'below' : 'above'
            const stake = s.faceUp?.length ? (
              <span
                className={`pointer-events-none absolute z-10 flex items-center rounded-xl py-1 pr-1.5 pl-1 whitespace-nowrap ${STAKE_POS[side]} ${
                  s.faceUpGlow ? 'pop bg-lemon/20 shadow-[0_0_18px_rgb(255_210_63/0.6)] ring-2 ring-lemon' : 'bg-night/80'
                }`}
              >
                <span className="flex">
                  {s.faceUp.map((c, k) => (
                    <span key={c} className={k ? (s.faceUpGlow ? '-ml-3' : '-ml-3.5') : ''}>
                      <PlayingCard card={c} tiny={!s.faceUpGlow} small={s.faceUpGlow} />
                    </span>
                  ))}
                </span>
                {s.stake !== undefined && <span className="num ml-1 text-xs font-bold text-lemon">{s.stake}</span>}
              </span>
            ) : s.cards !== undefined ? (
              <span
                className={`absolute z-10 flex items-center gap-1 rounded-full bg-night/80 py-0.5 pr-2 pl-1.5 whitespace-nowrap ${STAKE_POS[side]} ${
                  // Chạm được (xét) thì nhận chạm — chạm nổi lên chỗ ngồi như chạm avatar
                  s.checkable ? `cursor-pointer ${s.checkable === 'ready' ? 'ring-2 ring-lemon/80' : ''}` : 'pointer-events-none'
                }`}
              >
                <CardBackStack count={s.cards} />
                {/* Xì dách: tiền cược nằm cạnh xấp bài */}
                {s.stake !== undefined && (
                  <span className="num flex items-center gap-0.5 text-xs font-bold text-lemon">
                    · <img src={candyFor(s.player.id)} alt="" className="size-4" draggable={false} />
                    {s.stake}
                  </span>
                )}
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
            ) : (
              s.stake !== undefined && (
                <span
                  className={`pointer-events-none absolute z-10 flex items-center gap-0.5 rounded-full bg-night/80 py-0.5 pr-2 pl-1 text-xs font-bold whitespace-nowrap text-lemon ${STAKE_POS[side]} ${
                    s.stakeDim ? 'opacity-45' : ''
                  }`}
                >
                  <img src={candyFor(s.player.id)} alt="" className="size-5" draggable={false} />
                  <span className="num">× {s.stake}</span>
                </span>
              )
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
  return (
    <span role="img" aria-label="Đang online" title="Đang online" className={`size-3 rounded-full bg-mint ring-2 ring-plum ${className}`} />
  )
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
