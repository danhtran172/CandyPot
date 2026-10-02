import type { GameType } from '../../core/types'
import free from '../../assets/games/free.webp'
import loto from '../../assets/games/loto.webp'
import poker from '../../assets/games/poker.webp'
import tienlen from '../../assets/games/tienlen.webp'
import xidach from '../../assets/games/xidach.webp'

/** Uno: ba lá xòe (xanh dương, vàng, đỏ +2) — vẽ bằng SVG. */
const UNO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
<g transform='rotate(-20 32 46)'><rect x='17' y='9' width='27' height='40' rx='5' fill='#1e7fd8' stroke='#fff' stroke-width='2.5'/></g>
<g transform='rotate(-3 32 46)'><rect x='18' y='8' width='27' height='40' rx='5' fill='#f9c623' stroke='#fff' stroke-width='2.5'/></g>
<g transform='rotate(16 32 46)'><rect x='19' y='9' width='27' height='40' rx='5' fill='#e53935' stroke='#fff' stroke-width='2.5'/>
<ellipse cx='32.5' cy='29' rx='8' ry='14' transform='rotate(28 32.5 29)' fill='#fff'/>
<text x='32.5' y='34' font-family='Arial Black,Arial,sans-serif' font-weight='900' font-size='14' text-anchor='middle' fill='#e53935'>+2</text></g>
</svg>`
const uno = `data:image/svg+xml,${encodeURIComponent(UNO_SVG.replace(/\n/g, ''))}`

const ICONS: Record<GameType, string> = { tienlen, xidach, poker, loto, uno, free }

/** Biểu tượng game (ảnh) — cỡ mặc định bằng chữ đứng cạnh. */
export function GameIcon({ type, className = 'size-[1.1em]' }: { type: GameType; className?: string }) {
  return <img src={ICONS[type]} alt="" draggable={false} className={`inline-block shrink-0 align-[-0.2em] ${className}`} />
}
