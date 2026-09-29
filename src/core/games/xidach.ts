import { MAX_PLAYERS, type GameModule, type Option } from '../types'
import { multiplierOptions } from './options'

export interface XiDachConfig {
  multipliers: { xiban: number; xidach: number; ngulinh: number }
}

export const xidach: GameModule<XiDachConfig> = {
  type: 'xidach',
  label: 'Xì dách',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  stakeMode: 'dealer',
  defaultConfig: { multipliers: { xiban: 2, xidach: 2, ngulinh: 2 } },
}

/** 4 mức gợi ý = bội số tiền cược của người con. */
export function xidachOptions(cfg: XiDachConfig, stake: number): Option[] {
  return multiplierOptions(
    [
      [1, 'Thường'],
      [cfg.multipliers.xiban, 'Xì bàn'],
      [cfg.multipliers.xidach, 'Xì dách'],
      [cfg.multipliers.ngulinh, 'Ngũ linh'],
    ],
    stake,
  )
}
