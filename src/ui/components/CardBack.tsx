import type { CSSProperties, Ref } from 'react'

/**
 * Lưng bài riêng của CandyPot (vẽ bằng SVG, không dùng icon): viền kem, nền berry đan lưới chéo màu chanh,
 * khung chỉ mảnh, giữa là hoa văn hình thoi lồng nhau. Dựng một lần thành data URI để mọi lá dùng chung một ảnh.
 */
const SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'>
<defs>
<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ff6f8c'/><stop offset='1' stop-color='#a8203f'/></linearGradient>
<pattern id='p' width='9' height='9' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><path d='M0 0H9M0 0V9' stroke='#ffd23f' stroke-opacity='.32' stroke-width='1.3'/></pattern>
</defs>
<rect width='100' height='140' rx='9' fill='#fff1e0'/>
<rect x='5' y='5' width='90' height='130' rx='6' fill='url(#g)'/>
<rect x='5' y='5' width='90' height='130' rx='6' fill='url(#p)'/>
<rect x='10' y='10' width='80' height='120' rx='4' fill='none' stroke='#fff1e0' stroke-opacity='.85' stroke-width='1.6'/>
<rect x='13.5' y='13.5' width='73' height='113' rx='2.5' fill='none' stroke='#ffd23f' stroke-opacity='.7' stroke-width='.8'/>
<g fill='#ffd23f'><path d='M20 20l3 4-3 4-3-4z'/><path d='M80 20l3 4-3 4-3-4z'/><path d='M20 112l3 4-3 4-3-4z'/><path d='M80 112l3 4-3 4-3-4z'/></g>
<path d='M50 38l32 32-32 32-32-32z' fill='none' stroke='#fff1e0' stroke-opacity='.55' stroke-width='1.2'/>
<path d='M50 50l20 20-20 20-20-20z' fill='#ffd23f' fill-opacity='.9'/>
<path d='M50 58l12 12-12 12-12-12z' fill='#a8203f'/>
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
