import type { GameModule, GameType } from '../types'
import { loto } from './loto'
import { poker } from './poker'
import { tienlen } from './tienlen'
import { xidach } from './xidach'

export const GAMES: Record<GameType, GameModule> = { tienlen, xidach, poker, loto }

export const GAME_ORDER: GameType[] = ['tienlen', 'xidach', 'poker', 'loto']
