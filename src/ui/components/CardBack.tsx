import type { CSSProperties } from 'react'
import cardBack from '../../assets/card-back.webp'

/** Lưng một lá bài. Ảnh vuông, lá nằm giữa (tỉ lệ ~0,73) — object-cover vào khung lá là vừa khít. */
export function CardBack({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <img src={cardBack} alt="" draggable={false} style={style} className={`object-cover ${className}`} />
}

/** Xấp lưng bài xòe nhẹ biểu thị số lá còn trên tay (vẽ tối đa 5 lá) + con số. */
export function CardBackStack({ count }: { count: number }) {
  const shown = Math.min(count, 5)
  const mid = (shown - 1) / 2
  return (
    <span className="flex items-center gap-1" title={`${count} lá`}>
      <span className="relative h-7" style={{ width: 20 + (shown - 1) * 4 }}>
        {Array.from({ length: shown }, (_, i) => (
          <CardBack
            key={i}
            className="absolute bottom-0 h-7 w-5 origin-bottom drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]"
            style={{ left: i * 4, rotate: `${(i - mid) * 6}deg` }}
          />
        ))}
      </span>
      <span className="num text-xs font-bold text-cream">{count}</span>
    </span>
  )
}
