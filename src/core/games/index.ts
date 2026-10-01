import type { GameModule, GameType } from '../types'
import { free } from './free'
import { loto } from './loto'
import { poker } from './poker'
import { tienlen } from './tienlen'
import { xidach } from './xidach'

export const GAMES: Record<GameType, GameModule> = { tienlen, xidach, poker, loto, free }

/** Thứ tự trong ô chọn game — Tự do luôn nằm cuối (thêm game mới thì chèn trước nó). */
/** Các game chơi được bằng bài trong app (bàn nhiều người). */
export const CARD_GAMES: GameType[] = ['tienlen', 'xidach']

export const GAME_ORDER: GameType[] = ['tienlen', 'xidach', 'poker', 'loto', 'free']
