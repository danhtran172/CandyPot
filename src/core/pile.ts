import type { Game } from './types'

/** Số icon tối đa trong một đống (5 hàng xếp tam giác). */
export const MAX_PILE = 15

function mean(values: number[]): number {
  const positive = values.filter((v) => v > 0)
  return positive.length ? positive.reduce((a, b) => a + b, 0) / positive.length : 0
}

/**
 * Bao nhiêu kẹo thì vẽ 1 icon, theo ván gần nhất của game:
 * Tiến lên = cược Nhì, Xì dách = trung bình cược của con, Poker = trung bình kẹo bỏ vào lúc mở ván.
 */
export function pileUnit(game?: Game): number {
  const last = game && [...game.rounds].reverse().find((r) => r.kind === 'play')
  if (!game || !last) return 1
  const unit = game.type === 'tienlen' ? (last.bet2 ?? last.bet) : mean(Object.values(last.stakes)) || last.bet
  return Math.max(1, Math.round(unit))
}

/** Số icon cho một lượng kẹo: làm tròn, ít nhất 1 nếu khác 0, tối đa MAX_PILE. */
export function pileCount(amount: number, unit: number): number {
  if (amount === 0) return 0
  return Math.min(MAX_PILE, Math.max(1, Math.round(Math.abs(amount) / unit)))
}

/** Vị trí icon trong đống: hàng dưới rộng nhất, xếp dần lên như đống kẹo. row 0 = đáy. */
export function pileLayout(count: number): { row: number; col: number; rowSize: number }[] {
  let base = 1
  while ((base * (base + 1)) / 2 < count) base++
  const out: { row: number; col: number; rowSize: number }[] = []
  for (let row = 0, size = base; out.length < count; row++, size--) {
    for (let col = 0; col < size && out.length < count; col++) out.push({ row, col, rowSize: size })
  }
  return out
}
