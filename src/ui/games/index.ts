import type { GameType } from '../../core/types'
import { pokerUI } from './PokerUI'
import { tienlenUI } from './TienLenUI'
import type { GameUI } from './types'
import { xidachUI } from './XiDachUI'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAME_UIS: Record<GameType, GameUI<any, any>> = { tienlen: tienlenUI, xidach: xidachUI, poker: pokerUI }
