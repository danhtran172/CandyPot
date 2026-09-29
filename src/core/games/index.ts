import type { GameModule, GameType } from '../types'
import { poker } from './poker'
import { tienlen } from './tienlen'
import { xidach } from './xidach'

export const GAMES: Record<GameType, GameModule<any, any>> = { tienlen, xidach, poker }

export const GAME_ORDER: GameType[] = ['tienlen', 'xidach', 'poker']

export const GAME_ICONS: Record<GameType, string> = { tienlen: '🃏', xidach: '🂡', poker: '♠️' }
