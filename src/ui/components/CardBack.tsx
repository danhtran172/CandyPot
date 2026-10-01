import type { CSSProperties, Ref } from 'react'

/**
 * Lưng bài kẻ caro (gingham) xanh dương xéo 45°, viền be — vẽ bằng SVG.
 * Dựng một lần thành data URI để mọi lá dùng chung một ảnh.
 */
const SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'>
<defs>
<pattern id='p' width='8' height='8' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
<rect width='8' height='8' fill='#b3c7ea'/>
<rect width='8' height='4' fill='#2f5fae' fill-opacity='.65'/>
<rect width='4' height='8' fill='#2f5fae' fill-opacity='.65'/>
</pattern>
</defs>
<rect width='100' height='140' rx='8' fill='#e2d8cf'/>
<rect x='7' y='7' width='86' height='126' fill='url(#p)'/>
</svg>`
const SRC = `data:image/svg+xml,${encodeURIComponent(SVG.replace(/\n/g, ''))}`

/** Lưng một lá bài (tỉ lệ 5:7). */
export function CardBack({ className = '', style, ref }: { className?: string; style?: CSSProperties; ref?: Ref<HTMLImageElement> }) {
  return <img ref={ref} src={SRC} alt="" draggable={false} style={style} className={`object-fill ${className}`} />
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
