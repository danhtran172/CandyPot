import { MAX_PLAYERS, type GameModule } from '../types'

/** Lô tô — tạm để trống: chỉ kéo kẹo chuyển tay, chưa có ván. */
export const loto: GameModule = {
  type: 'loto',
  label: 'Lô tô',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'common',
  soon: true,
}
