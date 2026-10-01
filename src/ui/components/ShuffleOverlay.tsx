import { useEffect, useRef, useState } from 'react'
import type { ID } from '../../core/types'
import { dealCount, DEAL_FLY_MS, DEAL_STEP_MS, PASS_MS, SHUFFLE_PASSES, shuffleMs, type ShuffleKind } from '../shuffle'
import { CardBack } from './CardBack'

const LABEL: Record<ShuffleKind, string> = { riffle: 'Đan bài', bridge: 'Bridge' }

/** Số lá vẽ trong hiệu ứng xào (chẵn — chia đôi; đủ dày để thấy xấp bài, không nặng máy). */
const N = 20
/** Độ dày một lá trong xấp (px). */
const H = 0.9
/** Hai nửa xấp tách sang hai bên bao xa (px). */
const X = 64
const EASE = 'cubic-bezier(0.45, 0, 0.25, 1)'

/**
 * Mở ván bài trong app (không chặn bấm): xào bài rồi chia bài.
 * Xào — Đan bài: tách đôi sang hai bên, nghiêng mép trong xuống, hai nửa thả xen kẽ từng lá vào giữa rồi vuốt gọn;
 *        Bridge: tách đôi, uốn hai nửa thành vòm, bài chảy xen kẽ xuống giữa rồi vuốt gọn.
 * Mỗi lá được theo dõi qua từng lượt (thứ tự trong xấp thay đổi thật), chạy bằng Web Animations nên mượt.
 * Chia — từng lá rời xấp, bay vòng cung tới chỗ ngồi từng người, lần lượt theo vòng.
 */
export function ShuffleOverlay({
  kind,
  order,
  perSeat = 13,
  onDealt,
}: {
  kind: ShuffleKind
  /** Chia theo vòng theo thứ tự này. */
  order: ID[]
  /** Mỗi người mấy lá (Tiến lên 13, Xì dách 2). */
  perSeat?: number
  /** Mỗi lá chia xong (đáp xuống chỗ ngồi): tổng số lá đã chia. */
  onDealt?: (dealt: number) => void
}) {
  const [phase, setPhase] = useState<'shuffle' | 'deal'>('shuffle')
  useEffect(() => {
    const t = window.setTimeout(() => setPhase('deal'), shuffleMs(kind))
    return () => window.clearTimeout(t)
  }, [kind])
  return (
    <div
      role="status"
      aria-label={phase === 'shuffle' ? `Đang xào bài — ${LABEL[kind]}` : 'Đang chia bài'}
      className="fade-in pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-night/45"
    >
      {phase === 'shuffle' ? <Shuffle kind={kind} /> : <Deal order={order} perSeat={perSeat} onDealt={onDealt} />}
      <p className="font-display mt-6 rounded-full bg-night/80 px-4 py-1 text-sm font-bold text-lemon">
        {phase === 'shuffle' ? `Xào bài · ${LABEL[kind]}` : 'Chia bài…'}
      </p>
    </div>
  )
}

/** Số giả ngẫu nhiên cố định theo (lượt, bước) — mọi máy thấy cùng một kiểu thả bài. */
const noise = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** Dựng keyframe cho từng lá qua tất cả các lượt xào. */
function shuffleFrames(kind: ShuffleKind): Keyframe[][] {
  const pass = PASS_MS[kind]
  const total = shuffleMs(kind)
  const half = N / 2
  const frames: Keyframe[][] = Array.from({ length: N }, () => [])
  const pose = (c: number, t: number, x: number, y: number, r: number, z: number) =>
    frames[c].push({ offset: Math.min(1, t / total), transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, zIndex: z, easing: EASE })
  /** deck[h] = lá đang ở độ cao h (0 = dưới cùng). */
  let deck = Array.from({ length: N }, (_, i) => i)
  for (let c = 0; c < N; c++) pose(c, 0, 0, -c * H, 0, c)

  for (let p = 0; p < SHUFFLE_PASSES; p++) {
    const s = p * pass
    // Hai nửa thả xen kẽ từ đáy mỗi nửa; thỉnh thoảng rơi liền 2 lá cùng bên như xào tay thật
    const sides = [deck.slice(0, half), deck.slice(half)]
    const next: number[] = []
    let from = p % 2
    for (let k = 0; next.length < N; k++) {
      if (!sides[from].length) from = 1 - from
      next.push(sides[from].shift()!)
      if (noise(p + 1, k) > 0.25) from = 1 - from
    }
    for (let h0 = 0; h0 < N; h0++) {
      const c = deck[h0]
      const h1 = next.indexOf(c)
      const side = h0 < half ? -1 : 1
      const j = h0 % half
      const drop = s + ((kind === 'bridge' ? 0.42 : 0.36) + ((kind === 'bridge' ? 0.36 : 0.42) * h1) / (N - 1)) * pass
      const land = drop + 0.08 * pass
      const jitter = (noise(p + 7, c) - 0.5) * 4
      if (kind === 'bridge') {
        // Tách đôi nằm phẳng, rồi uốn hai nửa thành vòm cầu: mép trong vểnh lên, các lá xòe dần như bị bẻ cong
        const bend = side * (22 + j * 1.6)
        pose(c, s + 0.18 * pass, side * X * 0.85, -j * H, 0, 100 + h0)
        pose(c, s + 0.36 * pass, side * X * 0.5, -j * H * 1.6 - 26, bend, 100 + h0)
        pose(c, drop, side * X * 0.5, -j * H * 1.6 - 26, bend, 100 + h0)
      } else {
        pose(c, s + 0.22 * pass, side * X, -j * H - 4, -side * 7, 100 + h0)
        pose(c, drop, side * X * 0.94, -j * H - 6, -side * 11, 100 + h0)
      }
      pose(c, land, jitter, -h1 * H, jitter * 0.6, h1)
      // Vuốt gọn xấp bài (bridge: gõ xấp xuống bàn một cái cho thẳng)
      if (kind === 'bridge') {
        pose(c, s + 0.88 * pass, 0, -h1 * H - 6, 0, h1)
        pose(c, s + 0.95 * pass, 0, -h1 * H, 0, h1)
      } else pose(c, s + 0.93 * pass, 0, -h1 * H, 0, h1)
    }
    deck = next
  }
  for (let h = 0; h < N; h++) pose(deck[h], total, 0, -h * H, 0, h)
  return frames
}

function Shuffle({ kind }: { kind: ShuffleKind }) {
  const cards = useRef<(HTMLImageElement | null)[]>([])
  useEffect(() => {
    const frames = shuffleFrames(kind)
    const anims = cards.current.map((el, c) => el?.animate(frames[c], { duration: shuffleMs(kind), fill: 'both' }))
    return () => anims.forEach((a) => a?.cancel())
  }, [kind])
  return (
    <div className="relative h-20 w-[58px]">
      {Array.from({ length: N }, (_, c) => (
        <CardBack
          key={c}
          ref={(el) => {
            cards.current[c] = el
          }}
          style={{ zIndex: c, transform: `translateY(${-c * H}px)` }}
          className="absolute inset-0 size-full origin-bottom drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)] will-change-transform"
        />
      ))}
    </div>
  )
}

/** Chia bài đều theo vòng: lá thứ k bay tới người order[k % số người] (tìm chỗ ngồi trên bàn qua data-drop). */
function Deal({ order, perSeat, onDealt }: { order: ID[]; perSeat: number; onDealt?: (dealt: number) => void }) {
  const total = dealCount(order.length, perSeat)
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLImageElement | null)[]>([])
  const [left, setLeft] = useState(total)
  const onDealtRef = useRef(onDealt)
  useEffect(() => {
    onDealtRef.current = onDealt
  })
  useEffect(() => {
    const box = stage.current?.getBoundingClientRect()
    if (!box) return
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const anims = cards.current.map((el, k) => {
      const seat = document.querySelector(`[data-drop="${order[k % order.length]}"]`)?.getBoundingClientRect()
      if (!el || !seat) return null
      const dx = seat.left + seat.width / 2 - cx
      const dy = seat.top + seat.height / 2 - cy
      // Lá bay lệch một chút sang bên (vòng cung) và xoay dần theo hướng bay
      const dist = Math.hypot(dx, dy) || 1
      const bend = Math.min(40, dist * 0.18)
      const mx = dx * 0.55 + (-dy / dist) * bend
      const my = dy * 0.55 + (dx / dist) * bend - 18
      const spin = ((k * 37) % 30) - 15 + (dx >= 0 ? 90 : -90) * (Math.abs(dx) > Math.abs(dy) ? 1 : 0)
      const top = -Math.ceil(total / 4) * 1
      return el.animate(
        [
          { transform: `translate(0, ${top}px) rotate(0) scale(1)`, opacity: 1, easing: 'ease-out' },
          { transform: `translate(0, ${top - 8}px) rotate(0) scale(1.05)`, opacity: 1, offset: 0.12, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
          { transform: `translate(${mx}px, ${my}px) rotate(${spin * 0.6}deg) scale(0.78)`, opacity: 1, offset: 0.55, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.55)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.5)`, opacity: 0 },
        ],
        { duration: DEAL_FLY_MS, delay: k * DEAL_STEP_MS, fill: 'forwards' },
      )
    })
    // Xấp giữa mỏng dần theo số lá đã chia
    const tick = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), DEAL_STEP_MS)
    // Lá đáp xuống → báo để xấp lưng bài ở chỗ ngồi tăng dần
    const landed = anims.map((_, k) => window.setTimeout(() => onDealtRef.current?.(k + 1), k * DEAL_STEP_MS + DEAL_FLY_MS * 0.9))
    return () => {
      window.clearInterval(tick)
      landed.forEach((t) => window.clearTimeout(t))
      anims.forEach((a) => a?.cancel())
    }
  }, [order, total])
  return (
    <div ref={stage} className="relative h-20 w-[58px]">
      {/* Xấp bài còn lại */}
      {Array.from({ length: Math.ceil(left / 4) }, (_, i) => (
        <CardBack key={`d${i}`} className="absolute inset-0 size-full drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]" style={{ transform: `translateY(${-i}px)` }} />
      ))}
      {Array.from({ length: total }, (_, k) => (
        <CardBack
          key={k}
          ref={(el) => {
            cards.current[k] = el
          }}
          style={{ zIndex: 100 + total - k }}
          className="absolute inset-0 size-full opacity-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)] will-change-transform"
        />
      ))}
    </div>
  )
}
