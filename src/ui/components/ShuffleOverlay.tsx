import type { CSSProperties } from 'react'
import type { ShuffleKind } from '../shuffle'
import { CardBack } from './CardBack'

const LABEL: Record<ShuffleKind, string> = { riffle: 'Đan bài', bridge: 'Bridge' }

/** Số lá vẽ trong hiệu ứng (đủ dày để thấy xấp bài, không nặng máy). */
const N = 18

/**
 * Hiệu ứng xào bài phủ giữa màn hình (~2 giây, không chặn bấm).
 * Đan bài: chia đôi sang hai bên, hai nửa đan xen rơi vào giữa.
 * Bridge: chia đôi, uốn cong hai nửa thành vòm, bài chảy xuống giữa rồi vuốt gọn.
 */
export function ShuffleOverlay({ kind }: { kind: ShuffleKind }) {
  return (
    <div
      role="status"
      aria-label={`Đang xào bài — ${LABEL[kind]}`}
      className="shuffle-fade pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-night/55"
    >
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
      <p className="font-display mt-6 rounded-full bg-night/80 px-4 py-1 text-sm font-bold text-lemon">🔀 Xào bài · {LABEL[kind]}</p>
    </div>
  )
}
