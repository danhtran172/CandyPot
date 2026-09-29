import { GAMES } from '../../core/games'
import type { GameType } from '../../core/types'

/** Tên game, kèm chữ (Beta) nghiêng, nhỏ, xanh nếu game đang thử nghiệm. */
export function GameName({ type }: { type: GameType }) {
  return (
    <>
      {GAMES[type].label}
      {GAMES[type].beta && <i className="ml-1 align-middle font-sans text-[0.6em] font-semibold text-sky">(Beta)</i>}
    </>
  )
}
