import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { GuideStep } from '../guides'
import { Button } from './kit'

const PAD = 8

function findTarget(step: GuideStep | undefined): HTMLElement | null {
  if (!step?.target) return null
  return document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`)
}

/**
 * Hướng dẫn trên giao diện: làm tối màn hình, khoét sáng phần tử đang nói tới (có vòng nhấp nháy)
 * và hiện thẻ giải thích cạnh nó. Bước nào không tìm thấy phần tử thì tự bỏ qua.
 */
export function GuideTour({ steps, onClose }: { steps: GuideStep[]; onClose: () => void }) {
  // Chỉ giữ các bước có phần tử trên màn hình (hoặc bước giữa màn hình)
  const [list] = useState(() => steps.filter((s) => !s.target || findTarget(s)))
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = list[i]

  const measure = useCallback(() => {
    const el = findTarget(step)
    if (el) el.scrollIntoView({ block: 'nearest' })
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  // Đo vị trí phần tử ở khung hình kế tiếp (sau khi cuộn tới nó)
  useLayoutEffect(() => {
    const id = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(id)
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
  const hole = rect && { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD }
  // Thẻ nằm dưới phần tử nếu còn chỗ, không thì nằm trên
  const below = hole ? hole.top + hole.height + 220 < vh || hole.top < 240 : false
  const cardStyle = hole
    ? below
      ? { top: Math.min(hole.top + hole.height + 14, vh - 200) }
      : { bottom: Math.max(vh - hole.top + 14, 16) }
    : { top: '50%', transform: 'translateY(-50%)' }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Hướng dẫn: ${step.title}`}>
      {hole ? (
        <>
          {/* Lỗ sáng: bóng đổ khổng lồ phủ tối phần còn lại */}
          <div
            className="pointer-events-none absolute rounded-2xl shadow-[0_0_0_9999px_rgb(12_5_16/0.78)] transition-all duration-300"
            style={hole}
          />
          <div className="pointer-events-none absolute animate-ping rounded-2xl border-2 border-lemon/70" style={hole} />
          <div className="pointer-events-none absolute rounded-2xl border-2 border-lemon" style={hole} />
        </>
      ) : (
        <div className="absolute inset-0 bg-night/80" />
      )}
      {/* Chặn bấm xuống dưới trong lúc hướng dẫn */}
      <div className="absolute inset-0" />

      <div className="pop absolute inset-x-4 mx-auto max-w-sm" style={cardStyle} key={i}>
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
