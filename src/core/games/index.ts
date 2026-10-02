import type { GameModule, GameType } from '../types'
import { free } from './free'
import { loto } from './loto'
import { poker } from './poker'
import { tienlen } from './tienlen'
import { uno } from './uno'
import { xidach } from './xidach'

export const GAMES: Record<GameType, GameModule> = { tienlen, xidach, poker, loto, uno, free }

/** Thứ tự trong ô chọn game — Tự do luôn nằm cuối (thêm game mới thì chèn trước nó). */
/** Các game chơi được bằng bài trong app (bàn nhiều người). */
export const CARD_GAMES: GameType[] = ['tienlen', 'xidach', 'loto']

export const GAME_ORDER: GameType[] = ['tienlen', 'xidach', 'poker', 'loto', 'uno', 'free']

/** Game chỉ chơi bằng bài trong app (không có mode đánh ngoài, không tính kẹo) — cần bàn nhiều người. */
export const APP_ONLY: GameType[] = ['uno']
