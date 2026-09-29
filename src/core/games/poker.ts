import { settle } from '../settle'
import type { GameModule, ID, Net } from '../types'

export type PokerConfig = Record<string, never>

export interface PokerInput {
  /** Theo thứ tự danh sách người chơi — dùng để chia kẹo lẻ. */
  players: ID[]
  /** Tổng kẹo mỗi người bỏ vào pot trong cả ván. */
  contributions: Record<ID, number>
  folded: ID[]
  /** Dùng khi không có side pot. */
  winners: ID[]
  /** Dùng khi có side pot: 1 = bài mạnh nhất, cho phép đồng hạng. */
  ranks: Record<ID, number>
}

function live(input: PokerInput): ID[] {
  return input.players.filter((p) => !input.folded.includes(p))
}

function contrib(input: PokerInput, p: ID): number {
  return input.contributions[p] ?? 0
}

/** Có side pot khi những người chưa fold bỏ vào không bằng nhau. */
export function needsRanking(input: PokerInput): boolean {
  return new Set(live(input).map((p) => contrib(input, p))).size > 1
}

function rankOf(input: PokerInput, p: ID, ranked: boolean): number {
  if (ranked) return input.ranks[p] ?? Infinity
  return input.winners.includes(p) ? 1 : 2
}

/** Lời/lỗ ròng của ván (nhận − bỏ vào). */
export function pokerNet(input: PokerInput): Net {
  const ranked = needsRanking(input)
  const alive = live(input)
  const won: Net = Object.fromEntries(input.players.map((p) => [p, 0]))
  const levels = [...new Set(alive.map((p) => contrib(input, p)))].filter((v) => v > 0).sort((a, b) => a - b)

  let prev = 0
  for (const level of levels) {
    const pot = input.players.reduce((s, p) => s + Math.min(contrib(input, p), level) - Math.min(contrib(input, p), prev), 0)
    const eligible = alive.filter((p) => contrib(input, p) >= level)
    const best = Math.min(...eligible.map((p) => rankOf(input, p, ranked)))
    const winners = eligible.filter((p) => rankOf(input, p, ranked) === best)
    const share = Math.floor(pot / winners.length)
    winners.forEach((p, i) => {
      won[p] += share + (i === 0 ? pot - share * winners.length : 0)
    })
    prev = level
  }

  // Phần bỏ vào vượt mức cao nhất của người chưa fold → trả lại
  const top = levels.length ? levels[levels.length - 1] : 0
  const net: Net = {}
  for (const p of input.players) {
    const c = contrib(input, p)
    net[p] = won[p] + Math.max(0, c - top) - c
  }
  return net
}

export const poker: GameModule<PokerConfig, PokerInput> = {
  type: 'poker',
  label: 'Poker',
  defaultConfig: {},

  validate(input) {
    const errors: string[] = []
    const values = input.players.map((p) => contrib(input, p))
    if (input.players.length < 2) errors.push('Poker cần ít nhất 2 người chơi.')
    if (values.some((v) => !Number.isInteger(v) || v < 0)) errors.push('Số kẹo bỏ vào phải là số nguyên ≥ 0.')
    else if (values.reduce((a, b) => a + b, 0) <= 0) errors.push('Pot đang trống.')

    const alive = live(input)
    if (alive.length === 0) {
      errors.push('Phải còn ít nhất 1 người chưa fold.')
      return errors
    }
    if (needsRanking(input)) {
      if (alive.some((p) => !Number.isInteger(input.ranks[p]) || input.ranks[p] < 1)) {
        errors.push('Có side pot: cần xếp hạng bài cho mọi người chưa fold.')
      }
    } else {
      if (input.winners.length === 0) errors.push('Chưa chọn người thắng.')
      if (input.winners.some((p) => !alive.includes(p))) errors.push('Người thắng phải là người chưa fold.')
    }
    return errors
  },

  resolve(input) {
    return { transfers: settle(pokerNet(input), 'Poker'), tags: [] }
  },
}
