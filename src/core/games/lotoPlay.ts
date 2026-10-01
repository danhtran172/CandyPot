import type { ID } from '../types'
import { rowNumbers, ROWS, type Sheet } from './lotoSheets'

/**
 * Lô tô chơi bằng giấy trong app: mỗi người chọn tờ trong bộ giấy (không trùng), người gọi số lắc túi ra từng số,
 * ai đủ một hàng 5 số đã gọi thì "Kinh!" — app kiểm tra rồi trao pot.
 */
export interface LotoState {
  /** Tờ mỗi người đã mua (chỉ số trong bộ giấy). */
  sheets: Record<ID, number[]>
  /** Người gọi số (lắc túi). */
  caller: ID | null
  /** Các số đã gọi, theo thứ tự. */
  called: number[]
  /** Người kinh (thắng): tờ, hàng. */
  winner?: { id: ID; sheet: number; row: number }
}

export const emptyLoto = (caller: ID | null): LotoState => ({ sheets: {}, caller, called: [] })

/** Ai đang cầm tờ này (trừ `except`). */
export function ownerOf(s: LotoState, sheet: number, except?: ID): ID | undefined {
  return Object.entries(s.sheets).find(([id, list]) => id !== except && list.includes(sheet))?.[0]
}

/** Chọn tờ: không trùng tờ người khác đã mua, không quá `max`, đúng trong bộ giấy (`total` tờ). */
export function pickSheets(s: LotoState, playerId: ID, ids: number[], max: number, total: number): LotoState | string {
  const unique = [...new Set(ids)]
  if (unique.length !== ids.length) return 'Chọn trùng tờ.'
  if (unique.length > max) return `Mỗi người mua tối đa ${max} tờ một ván.`
  if (unique.some((i) => !Number.isInteger(i) || i < 0 || i >= total)) return 'Tờ không có trong bộ giấy.'
  const taken = unique.find((i) => ownerOf(s, i, playerId))
  if (taken !== undefined) return 'Tờ này đã có người mua — chọn tờ khác.'
  const sheets = { ...s.sheets }
  if (unique.length) sheets[playerId] = unique
  else delete sheets[playerId]
  return { ...s, sheets }
}

/** Người gọi lắc ra số `n`. */
export function callNumber(s: LotoState, by: ID, n: number): LotoState | string {
  if (s.winner) return 'Đã có người kinh — ván xong.'
  if (by !== s.caller) return 'Chỉ người gọi số mới lắc được.'
  if (!Number.isInteger(n) || n < 1 || n > 90) return 'Số phải từ 1 đến 90.'
  if (s.called.includes(n)) return `Số ${n} đã gọi rồi.`
  return { ...s, called: [...s.called, n] }
}

/** Số còn trong túi. */
export const remaining = (s: LotoState) => Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !s.called.includes(n))

/** Các hàng đã đủ 5 số được gọi trên một tờ. */
export function fullRows(sheet: Sheet, called: number[]): number[] {
  return Array.from({ length: ROWS }, (_, r) => r).filter((r) => rowNumbers(sheet, r).every((n) => called.includes(n)))
}

/** Kinh: tờ của mình, hàng đã đủ 5 số được gọi, chưa ai kinh trước. */
export function claim(s: LotoState, sheets: Sheet[], playerId: ID, sheet: number, row: number): LotoState | string {
  if (s.winner) return s.winner.id === playerId ? 'Bạn đã kinh rồi.' : 'Có người kinh trước rồi.'
  if (!s.sheets[playerId]?.includes(sheet)) return 'Tờ này không phải của bạn.'
  const paper = sheets[sheet]
  if (!paper || row < 0 || row >= ROWS) return 'Không có hàng này.'
  const missing = rowNumbers(paper, row).filter((n) => !s.called.includes(n))
  if (missing.length) return `Chưa kinh — số ${missing.join(', ')} chưa được gọi.`
  return { ...s, winner: { id: playerId, sheet, row } }
}
