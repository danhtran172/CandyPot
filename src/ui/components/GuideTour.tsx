import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import dragCandy from '../../assets/drag-candy.webp'
import type { GuideStep } from '../guides'
import { Button } from './kit'

const PAD = 8

const byGuide = (name: string | undefined) => (name ? document.querySelector<HTMLElement>(`[data-guide="${name}"]`) : null)

/** Các phần tử một bước cần chỉ vào (phần tử chính, hoặc điểm đầu / cuối của bàn tay mẫu). */
function elementsOf(step: GuideStep): (HTMLElement | null)[] {
  if (step.demo?.kind === 'tap') return [byGuide(step.demo.at)]
  if (step.demo?.kind === 'drag') return [byGuide(step.demo.from), byGuide(step.demo.to)]
  return step.target ? [byGuide(step.target)] : []
}

/** Bước hiện được: thẻ giữa màn hình, hoặc đủ phần tử trên màn hình. */
const available = (step: GuideStep) => elementsOf(step).every(Boolean)

/** Khung bao các phần tử (để khoét sáng). */
function unionRect(els: HTMLElement[]) {
  if (!els.length) return null
  const rs = els.map((e) => e.getBoundingClientRect())
  const left = Math.min(...rs.map((r) => r.left))
  const top = Math.min(...rs.map((r) => r.top))
  const right = Math.max(...rs.map((r) => r.right))
  const bottom = Math.max(...rs.map((r) => r.bottom))
  return { left, top, width: right - left, height: bottom - top }
}

const center = (el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * Hướng dẫn trên giao diện: làm tối màn hình, khoét sáng phần tử đang nói tới và hiện thẻ giải thích cạnh nó.
 * Bước có `demo` thì có bàn tay mẫu làm thử ngay trên bàn (bấm, hoặc kéo gói kẹo), lặp lại liên tục.
 */
export function GuideTour({ steps, onClose }: { steps: GuideStep[]; onClose: () => void }) {
  // Chỉ giữ các bước có đủ phần tử trên màn hình
  const [list] = useState(() => steps.filter(available))
  const [i, setI] = useState(0)
  const [box, setBox] = useState<ReturnType<typeof unionRect>>(null)
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const step = list[i]

  const measure = useCallback(() => {
    if (!step) return
    const els = elementsOf(step).filter((e): e is HTMLElement => !!e)
    els[0]?.scrollIntoView({ block: 'nearest' })
    setBox(unionRect(els))
    setPoints(step.demo ? els.map(center) : [])
  }, [step])

  // Đo vị trí ở khung hình kế tiếp (sau khi cuộn tới)
  useLayoutEffect(() => {
    const id = requestAnimationFrame(measure)
    // Dự phòng khi trình duyệt không vẽ khung hình (tab ẩn) — vẫn đo được
    const t = window.setTimeout(measure, 80)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(t)
    }
  }, [measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, list.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [list.length, onClose])

  if (!step) return null
  const last = i === list.length - 1
  const vh = window.innerHeight
  const hole = box && { left: box.left - PAD, top: box.top - PAD, width: box.width + 2 * PAD, height: box.height + 2 * PAD }
  // Thẻ nằm dưới vùng sáng nếu còn chỗ, không thì nằm trên; vùng sáng quá cao thì thẻ ở đáy màn hình
  const below = hole ? hole.top + hole.height + 200 < vh : false
  const above = hole ? hole.top > 200 : false
  const cardStyle = !hole
    ? { top: '50%', transform: 'translateY(-50%)' }
    : below
      ? { top: hole.top + hole.height + 14 }
      : above
        ? { bottom: vh - hole.top + 14 }
        : { bottom: 16 }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Hướng dẫn: ${step.title}`}>
      {hole ? (
        <>
          {/* Lỗ sáng: bóng đổ khổng lồ phủ tối phần còn lại */}
          <div
            className="pointer-events-none absolute rounded-2xl shadow-[0_0_0_9999px_rgb(12_5_16/0.78)] transition-all duration-300"
            style={hole}
          />
          {!step.demo && <div className="pointer-events-none absolute animate-ping rounded-2xl border-2 border-lemon/70" style={hole} />}
          <div className="pointer-events-none absolute rounded-2xl border-2 border-lemon transition-all duration-300" style={hole} />
        </>
      ) : (
        <div className="absolute inset-0 bg-night/80" />
      )}
      {/* Chặn bấm xuống dưới trong lúc hướng dẫn */}
      <div className="absolute inset-0" />

      {step.demo && points.length > 0 && <DemoHand key={i} kind={step.demo.kind} points={points} />}

      <div className="pop absolute inset-x-4 mx-auto max-w-sm" style={cardStyle} key={`card-${i}`}>
        <div className="rounded-3xl border-2 border-lemon bg-plum-2 p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg leading-tight font-bold text-lemon">{step.title}</h2>
            <span className="num text-xs text-muted">
              {i + 1}/{list.length}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug">{step.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="text-xs font-semibold text-muted" onClick={onClose}>
              Bỏ qua
            </button>
            <span className="flex-1" />
            {i > 0 && (
              <Button className="px-3 py-1.5 text-sm" onClick={() => setI(i - 1)}>
                Trước
              </Button>
            )}
            <Button variant="primary" className="px-4 py-1.5 text-sm" onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? 'Xong' : 'Tiếp'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const LOOP_MS = 2400

/**
 * Bàn tay mẫu: `tap` = ngón tay bấm vào điểm (có gợn sóng); `drag` = đặt ngón tay ở điểm đầu, gói kẹo
 * hiện ra, kéo sang điểm cuối rồi thả. Lặp liên tục.
 */
function DemoHand({ kind, points }: { kind: 'tap' | 'drag'; points: { x: number; y: number }[] }) {
  const hand = useRef<HTMLDivElement>(null)
  const candy = useRef<HTMLImageElement>(null)
  const ripple = useRef<HTMLDivElement>(null)
  const [a, b = a] = points

  useEffect(() => {
    const at = (p: { x: number; y: number }, scale = 1) => `translate(${p.x}px, ${p.y}px) scale(${scale})`
    const opts = { duration: LOOP_MS, iterations: Infinity, easing: 'ease-in-out' }
    const anims: Animation[] = []
    if (kind === 'drag') {
      anims.push(
        hand.current!.animate(
          [
            { transform: at(a), opacity: 0, offset: 0 },
            { transform: at(a), opacity: 1, offset: 0.1 },
            { transform: at(a, 0.85), opacity: 1, offset: 0.22 },
            { transform: at(b, 0.85), opacity: 1, offset: 0.7 },
            { transform: at(b), opacity: 1, offset: 0.8 },
            { transform: at(b), opacity: 0, offset: 1 },
          ],
          opts,
        ),
        candy.current!.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: 0.2 },
            { opacity: 1, offset: 0.26 },
            { opacity: 1, offset: 0.72 },
            { opacity: 0, offset: 0.8 },
            { opacity: 0, offset: 1 },
          ],
          opts,
        ),
      )
    } else {
      anims.push(
        hand.current!.animate(
          [
            { transform: at({ x: a.x + 24, y: a.y + 30 }), opacity: 0, offset: 0 },
            { transform: at(a), opacity: 1, offset: 0.25 },
            { transform: at(a, 0.8), opacity: 1, offset: 0.38 },
            { transform: at(a), opacity: 1, offset: 0.5 },
            { transform: at(a), opacity: 1, offset: 0.8 },
            { transform: at(a), opacity: 0, offset: 1 },
          ],
          opts,
        ),
        ripple.current!.animate(
          [
            { transform: `${at(a, 0.2)}`, opacity: 0, offset: 0 },
            { transform: `${at(a, 0.2)}`, opacity: 0, offset: 0.36 },
            { transform: `${at(a, 0.4)}`, opacity: 0.9, offset: 0.4 },
            { transform: `${at(a, 1.4)}`, opacity: 0, offset: 0.75 },
            { transform: `${at(a, 1.4)}`, opacity: 0, offset: 1 },
          ],
          opts,
        ),
      )
    }
    return () => anims.forEach((x) => x.cancel())
  }, [kind, a.x, a.y, b.x, b.y]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {kind === 'tap' && <div ref={ripple} className="absolute top-0 left-0 -mt-8 -ml-8 size-16 rounded-full border-4 border-lemon opacity-0" />}
      <div ref={hand} className="absolute top-0 left-0 opacity-0">
        {kind === 'drag' && (
          <img ref={candy} src={dragCandy} alt="" className="absolute -top-9 -left-7 size-14 max-w-none opacity-0 drop-shadow-lg" />
        )}
        {/* Đầu ngón tay đúng ở điểm (x, y) */}
        <span className="absolute -top-1 -left-3.5 text-4xl leading-none drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)]">👆</span>
      </div>
    </div>
  )
}
