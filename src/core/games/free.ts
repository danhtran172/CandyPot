import { MAX_PLAYERS, type GameModule } from '../types'

/**
 * Tự do: một Pot để cược (tự mở ván) → Chốt cược → kéo Pot trao thưởng; pot hết thì ván tự xong.
 * Gửi kẹo cho nhau thoải mái.
 */
export const free: GameModule = {
  type: 'free',
  label: 'Tự do',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'pot',
  phases: true,
}
