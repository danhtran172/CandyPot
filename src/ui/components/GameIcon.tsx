import type { GameType } from '../../core/types'
import loto from '../../assets/games/loto.webp'
import poker from '../../assets/games/poker.webp'
import tienlen from '../../assets/games/tienlen.webp'
import xidach from '../../assets/games/xidach.webp'

const ICONS: Record<GameType, string> = { tienlen, xidach, poker, loto }

/** Biểu tượng game (ảnh) — cỡ mặc định bằng chữ đứng cạnh. */
export function GameIcon({ type, className = 'size-[1.1em]' }: { type: GameType; className?: string }) {
  return <img src={ICONS[type]} alt="" draggable={false} className={`inline-block shrink-0 align-[-0.2em] ${className}`} />
}
