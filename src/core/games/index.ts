import type { GameModule, GameType } from '../types'
import { free } from './free'
import { loto } from './loto'
import { poker } from './poker'
import { tienlen } from './tienlen'
import { xidach } from './xidach'

export const GAMES: Record<GameType, GameModule> = { tienlen, xidach, poker, loto, free }

/** Thứ tự trong ô chọn game — Tự do luôn nằm cuối (thêm game mới thì chèn trước nó). */
export const GAME_ORDER: GameType[] = ['tienlen', 'xidach', 'poker', 'loto', 'free']
