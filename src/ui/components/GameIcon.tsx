import type { GameType } from '../../core/types'
import free from '../../assets/games/free.webp'
import loto from '../../assets/games/loto.webp'
import poker from '../../assets/games/poker.webp'
import tienlen from '../../assets/games/tienlen.webp'
import xidach from '../../assets/games/xidach.webp'

const ICONS: Record<GameType, string> = { tienlen, xidach, poker, loto, free }

/** Biểu tượng game (ảnh) — cỡ mặc định bằng chữ đứng cạnh. */
export function GameIcon({ type, className = 'size-[1.1em]' }: { type: GameType; className?: string }) {
  return <img src={ICONS[type]} alt="" draggable={false} className={`inline-block shrink-0 align-[-0.2em] ${className}`} />
}

/** Biểu tượng game khắc chìm trên mặt bàn: ảnh gốc chuyển xám tối (giữ chi tiết), mép bắt sáng như chữ `.engraved`. */
export function EngravedGameIcon({ type, className = 'size-7' }: { type: GameType; className?: string }) {
  return <img src={ICONS[type]} alt="" aria-hidden draggable={false} className={`engraved-icon inline-block shrink-0 ${className}`} />
}
