import medal1 from '../../assets/rules/medal-1.webp'
import medal2 from '../../assets/rules/medal-2.webp'
import pigBlack from '../../assets/rules/pig-black.webp'
import pigRed from '../../assets/rules/pig-red.webp'
import price from '../../assets/rules/price.webp'

/** Biểu tượng cho các mức trong phần cài đặt luật (Nhất, Nhì, heo, giá, min/max). */
export type RuleIconName = 'first' | 'second' | 'pigRed' | 'pigBlack' | 'price' | 'min' | 'max'

const IMAGES: Partial<Record<RuleIconName, string>> = { first: medal1, second: medal2, pigRed, pigBlack, price }

export function RuleIcon({ name, className = 'size-5' }: { name: RuleIconName; className?: string }) {
  if (name === 'min' || name === 'max') return <LimitIcon up={name === 'max'} className={className} />
  return (
    <img
      src={IMAGES[name]}
      alt=""
      draggable={false}
      // Heo đen tối màu → viền sáng cho dễ thấy trên nền tối
      className={`inline-block max-w-none shrink-0 ${name === 'pigBlack' ? 'drop-shadow-[0_0_1.5px_#fff1e0]' : ''} ${className}`}
    />
  )
}

/** Min / max: mũi tên chạm vạch (xuống = tối thiểu, lên = tối đa). */
function LimitIcon({ up, className }: { up: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`inline-block shrink-0 ${up ? 'text-berry' : 'text-mint'} ${className}`}>
      <rect x="3" y={up ? 2.5 : 18.5} width="18" height="3" rx="1.5" fill="currentColor" />
      <path
        d={up ? 'M12 21V9m0 0-5 5m5-5 5 5' : 'M12 3v12m0 0-5-5m5 5 5-5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

