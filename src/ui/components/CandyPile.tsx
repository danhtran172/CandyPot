import { MAX_PILE, pileCount, pileLayout } from '../../core/pile'
import poop from '../../assets/pile/poop.webp'
import { signed } from '../format'

const CANDIES = Object.entries(
  import.meta.glob<string>('../../assets/pile/candy-*.webp', { eager: true, import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url)

/** Số giả ngẫu nhiên ổn định theo chuỗi (FNV-1a) — đống kẹo không đổi hình mỗi lần vẽ lại. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Đống kẹo biểu diễn lời/lỗ: mỗi icon = `unit` kẹo, xếp chồng như một đống.
 * Âm thì là đống 💩.
 */
export function CandyPile({ amount, unit, seed, size = 18 }: { amount: number; unit: number; seed: string; size?: number }) {
  const count = pileCount(amount, unit)
  if (!count) return null
  const layout = pileLayout(count)
  const rows = layout[layout.length - 1].row + 1
  const step = size * 0.78
  const lift = size * 0.52
  const width = layout[0].rowSize * step + size * 0.4
  const height = (rows - 1) * lift + size
  const overflow = Math.abs(amount) / unit > MAX_PILE + 0.5

  return (
    <div
      className="relative"
      style={{ width, height }}
      role="img"
      aria-label={`${signed(amount)} kẹo${amount < 0 ? ' (đang lỗ)' : ''}`}
    >
      {layout.map((p, i) => {
        const r = hash(`${seed}:${amount < 0 ? 'poop' : 'candy'}:${i}`)
        const jitterX = ((r % 7) - 3) * 0.6
        const jitterY = (((r >> 3) % 5) - 2) * 0.5
        const rotate = amount < 0 ? ((r >> 6) % 21) - 10 : ((r >> 6) % 61) - 30
        const x = width / 2 + (p.col - (p.rowSize - 1) / 2) * step + jitterX - size / 2
        const y = height - size - p.row * lift + jitterY
        return (
          <img
            key={i}
            src={amount < 0 ? poop : CANDIES[r % CANDIES.length]}
            alt=""
            draggable={false}
            className="absolute drop-shadow-[0_1px_1px_rgb(0_0_0/0.45)]"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              rotate: `${rotate}deg`,
              // Hàng trước (đáy) nằm đè lên; hàng càng phía sau càng mờ để đống kẹo có chiều sâu
              zIndex: (rows - p.row) * 10 + p.col,
              opacity: Math.max(0.4, 1 - p.row * 0.18),
            }}
          />
        )
      })}
      {overflow && (
        <span className="absolute -top-2 -right-2 rounded-full bg-night/80 px-1 text-[10px] leading-4 font-bold text-lemon">+</span>
      )}
    </div>
  )
}
