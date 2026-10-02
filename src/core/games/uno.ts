import { MAX_PLAYERS, type Game, type GameModule } from '../types'

/** Uno: chỉ chơi bằng bài trong app (bàn nhiều người), không tính kẹo, không có mode đánh ngoài. */
export const uno: GameModule = {
  type: 'uno',
  label: 'Uno',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'none',
}

/** Ván có bộ mở rộng (Uno Storm + lá Đập tay) — mặc định có. */
export const unoExpansion = (game: Game) => game.unoExpansion ?? true
