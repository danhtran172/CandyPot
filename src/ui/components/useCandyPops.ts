import { useEffect, useRef, useState } from 'react'
import { netOf } from '../../core/ledger'
import { movesNet } from '../../core/round'
import type { ID, Session } from '../../core/types'

/** Ô +/- dưới avatar hiện bao lâu (ms). */
export const POP_MS = 1000

export type CandyPop = { amount: number; key: number }

/** Số kẹo hiện có của mỗi người: các ván đã chốt + các ván đang mở (mọi game). */
function balances(session: Session): Record<ID, number> {
  const out = netOf(session)
  for (const g of session.games)
    for (const r of g.rounds) if (r.status === 'open') for (const [id, v] of Object.entries(movesNet(r.moves))) out[id] = (out[id] ?? 0) + v
  return out
}

/**
 * Số kẹo của ai vừa đổi (trả / nhận / cược / mua / hoàn tác — từ máy này hay máy khác) → ô "+N / −N" dưới avatar ~1 giây.
 * Chỉ so sánh dữ liệu bàn đã có trên máy — không đọc / ghi thêm gì lên Firebase.
 * Đổi liên tiếp khi ô còn hiện thì cộng dồn vào một ô. `hold` = tạm chưa báo (thôi giữ thì báo dồn).
 */
export function useCandyPops(session: Session, hold = false): Record<ID, CandyPop> {
  const prev = useRef<{ sessionId: ID; bal: Record<ID, number> } | null>(null)
  const timers = useRef<Record<ID, number>>({})
  const [pops, setPops] = useState<Record<ID, CandyPop>>({})

  useEffect(() => {
    // Đang giữ (vd đang chia bài): chưa báo, giữ mốc cũ — thôi giữ thì báo một lượt các thay đổi trong lúc đó
    if (hold && prev.current?.sessionId === session.id) return
    const bal = balances(session)
    const before = prev.current
    prev.current = { sessionId: session.id, bal }
    // Lần đầu mở bàn (hoặc đổi bàn): chỉ ghi nhận, không báo
    if (before?.sessionId !== session.id) return
    const changed = Object.keys(bal)
      .map((id) => [id, bal[id] - (before.bal[id] ?? 0)] as const)
      .filter(([, d]) => d !== 0)
    if (!changed.length) return
    const now = Date.now()
    setPops((cur) => {
      const next = { ...cur }
      for (const [id, d] of changed) next[id] = { amount: (cur[id]?.amount ?? 0) + d, key: now }
      // Cộng dồn về 0 (vd kéo rồi hoàn tác ngay) thì thôi không hiện
      for (const [id] of changed) if (next[id].amount === 0) delete next[id]
      return next
    })
    for (const [id] of changed) {
      window.clearTimeout(timers.current[id])
      timers.current[id] = window.setTimeout(() => {
        setPops((cur) => {
          const next = { ...cur }
          delete next[id]
          return next
        })
      }, POP_MS)
    }
  }, [session, hold])

  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach((id) => window.clearTimeout(id))
  }, [])

  return pops
}
