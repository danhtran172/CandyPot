import type { GameModule, Option } from '../types'
import { multiplierOptions } from './options'

export type CardKey = 'heoDen' | 'heoDo' | 'baDoiThong' | 'tuQuy' | 'bonDoiThong'

export const CARD_LABELS: Record<CardKey, string> = {
  heoDen: 'Heo đen',
  heoDo: 'Heo đỏ',
  baDoiThong: '3 đôi thông',
  tuQuy: 'Tứ quý',
  bonDoiThong: '4 đôi thông',
}

export const CARD_KEYS = Object.keys(CARD_LABELS) as CardKey[]

export interface TienLenConfig {
  pay4Bet: number
  pay4Ba: number
  pay3Bet: number
  pay2Bet: number
  toiTrang: number
  chay: number
  cards: Record<CardKey, number>
}

export const tienlen: GameModule<TienLenConfig> = {
  type: 'tienlen',
  label: 'Tiến lên',
  minPlayers: 2,
  maxPlayers: 4,
  stakeMode: 'common',
  defaultConfig: {
    pay4Bet: 2,
    pay4Ba: 1,
    pay3Bet: 2,
    pay2Bet: 1,
    toiTrang: 3,
    chay: 3,
    cards: { heoDen: 1, heoDo: 2, baDoiThong: 2, tuQuy: 3, bonDoiThong: 4 },
  },
}

/** 4 mức gợi ý = các hệ số trong luật (× mức cược chung), kèm tên tình huống. */
export function tienlenOptions(cfg: TienLenConfig, bet: number): Option[] {
  const named: [number, string][] = [
    [cfg.pay4Ba, 'Ba→Nhì'],
    [cfg.pay2Bet, 'Thua (2 người)'],
    [cfg.pay4Bet, 'Bét→Nhất'],
    [cfg.pay3Bet, 'Bét→Nhất'],
    [cfg.chay, 'Cháy'],
    [cfg.toiTrang, 'Tới trắng'],
    ...Object.entries(cfg.cards).map(([k, v]): [number, string] => [v, CARD_LABELS[k as CardKey]]),
  ]
  return multiplierOptions(named, bet)
}
