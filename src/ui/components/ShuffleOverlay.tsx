import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ID } from '../../core/types'
import { dealCount, DEAL_FLY_MS, DEAL_STEP_MS, SHUFFLE_MS, type ShuffleKind } from '../shuffle'
import { CardBack } from './CardBack'

const LABEL: Record<ShuffleKind, string> = { riffle: 'Đan bài', bridge: 'Bridge' }

/** Số lá vẽ trong hiệu ứng xào (đủ dày để thấy xấp bài, không nặng máy). */
const N = 18

/**
 * Mở ván bài trong app (không chặn bấm): xào bài rồi chia bài.
 * Xào — Đan bài: chia đôi sang hai bên, hai nửa đan xen rơi vào giữa;
 *        Bridge: chia đôi, uốn cong hai nửa thành vòm, bài chảy xuống giữa rồi vuốt gọn.
 * Chia — từng lá bay từ xấp giữa màn hình tới chỗ ngồi của từng người, lần lượt theo vòng.
 */
export function ShuffleOverlay({
  kind,
  order,
  onDealt,
}: {
  kind: ShuffleKind
  order: ID[]
  /** Mỗi lá chia xong (đáp xuống chỗ ngồi): tổng số lá đã chia. */
  onDealt?: (dealt: number) => void
}) {
  const [phase, setPhase] = useState<'shuffle' | 'deal'>('shuffle')
  useEffect(() => {
    const t = window.setTimeout(() => setPhase('deal'), SHUFFLE_MS)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div
      role="status"
      aria-label={phase === 'shuffle' ? `Đang xào bài — ${LABEL[kind]}` : 'Đang chia bài'}
      className="fade-in pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-night/45"
    >
      {phase === 'shuffle' ? <Shuffle kind={kind} /> : <Deal order={order} onDealt={onDealt} />}
      <p className="font-display mt-6 rounded-full bg-night/80 px-4 py-1 text-sm font-bold text-lemon">
        {phase === 'shuffle' ? `🔀 Xào bài · ${LABEL[kind]}` : '🃏 Chia bài…'}
      </p>
    </div>
  )
}

function Shuffle({ kind }: { kind: ShuffleKind }) {
  return (
    <div className="relative h-20 w-[58px]">
      {Array.from({ length: N }, (_, i) => {
        // Lá chẵn nửa trái, lá lẻ nửa phải — rơi xuống theo thứ tự i nên hai nửa đan xen nhau
        const left = i % 2 === 0
        const half = Math.floor(i / 2)
        const style = {
          '--x': `${left ? -62 : 62}px`,
          '--y0': `${-half * 1.6}px`,
          '--y1': `${-i * 1}px`,
          '--r': kind === 'bridge' ? `${left ? 22 : -22}deg` : `${left ? -7 : 7}deg`,
          zIndex: i,
          animationDelay: `${(kind === 'bridge' ? 0.12 : 0.06) + i * (kind === 'bridge' ? 0.022 : 0.03)}s`,
        } as CSSProperties
        return (
          <CardBack
            key={i}
            style={style}
            className={`${kind === 'bridge' ? 'shuffle-bridge' : 'shuffle-riffle'} absolute inset-0 size-full origin-bottom drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)]`}
          />
        )
      })}
    </div>
  )
}

/** Chia bài đều theo vòng: lá thứ k bay tới người order[k % số người] (tìm chỗ ngồi trên bàn qua data-drop). */
function Deal({ order, onDealt }: { order: ID[]; onDealt?: (dealt: number) => void }) {
  const total = dealCount(order.length)
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
      const spin = ((k * 37) % 30) - 15
      return el.animate(
        [
          { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.55)`, opacity: 1, offset: 0.85 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.5)`, opacity: 0 },
        ],
        { duration: DEAL_FLY_MS, delay: k * DEAL_STEP_MS, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'both' },
      )
    })
    // Xấp giữa mỏng dần theo số lá đã chia
    const tick = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), DEAL_STEP_MS)
    // Lá đáp xuống → báo để xấp lưng bài ở chỗ ngồi tăng dần
    const landed = anims.map((_, k) => window.setTimeout(() => onDealtRef.current?.(k + 1), k * DEAL_STEP_MS + DEAL_FLY_MS * 0.85))
    return () => {
      window.clearInterval(tick)
      landed.forEach((t) => window.clearTimeout(t))
      anims.forEach((a) => a?.cancel())
    }
  }, [order])
  return (
    <div ref={stage} className="relative h-20 w-[58px]">
      {/* Xấp bài còn lại */}
      {Array.from({ length: Math.ceil(left / 4) }, (_, i) => (
        <CardBack key={`d${i}`} className="absolute inset-0 size-full" style={{ transform: `translateY(${-i}px)` }} />
      ))}
      {Array.from({ length: total }, (_, k) => (
        <CardBack
          key={k}
          ref={(el) => {
            cards.current[k] = el
          }}
          className="absolute inset-0 size-full opacity-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)]"
        />
      ))}
    </div>
  )
}
