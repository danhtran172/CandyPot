import type { ID, Session } from '../core/types'

/** 10 màu dễ phân biệt trên nền bàn tối — đủ cho tối đa 10 người, không ai trùng ai. */
const PALETTE = ['#ff6b6b', '#ffa94d', '#ffd43b', '#a9e34b', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#f1f3f5']

/** Số giả ngẫu nhiên ổn định theo chuỗi (FNV-1a). */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Màu tờ lô tô của từng người: xáo bảng màu ngẫu nhiên theo bàn (mỗi bàn một kiểu), rồi chia lần lượt theo thứ tự
 * người trong bàn → không ai trùng màu, và màu của mỗi người giữ nguyên suốt buổi.
 */
export function ticketColors(session: Session): Record<ID, string> {
  const colors = [...PALETTE].sort((a, b) => hash(`${session.id}:${a}`) - hash(`${session.id}:${b}`))
  return Object.fromEntries(session.players.map((p, i) => [p.id, colors[i % colors.length]]))
}
