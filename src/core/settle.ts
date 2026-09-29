import { assertZeroSum } from './ledger'
import type { ID, Net, Transfer } from './types'

const EXACT_LIMIT = 15

interface Entry {
  id: ID
  value: number
}

/**
 * Phương án trả kẹo ít lượt nhất.
 * Thứ tự key của `net` được dùng để phá hòa → cùng đầu vào cho cùng đầu ra.
 */
export function settle(net: Net, reason = 'Trả kẹo'): Transfer[] {
  assertZeroSum(net)
  const entries: Entry[] = Object.entries(net)
    .filter(([, v]) => v !== 0)
    .map(([id, value]) => ({ id, value }))
  if (entries.length === 0) return []

  const groups = entries.length <= EXACT_LIMIT ? zeroSumGroups(entries) : [entries]
  return groups.flatMap((g) => greedy(g, reason))
}

/** Chia thành nhiều nhóm tổng = 0 nhất có thể (quy hoạch động trên tập con). */
function zeroSumGroups(entries: Entry[]): Entry[][] {
  const n = entries.length
  const full = (1 << n) - 1
  const sum = new Int32Array(1 << n)
  const dp = new Int8Array(1 << n)
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask
    const i = 31 - Math.clz32(low)
    sum[mask] = sum[mask ^ low] + entries[i].value
    let best = 0
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) best = Math.max(best, dp[mask ^ (1 << j)])
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0)
  }

  // Truy vết thứ tự gỡ phần tử, rồi dựng lại theo chiều thêm vào để tách nhóm.
  const removed: number[] = []
  let mask = full
  while (mask) {
    const bonus = sum[mask] === 0 ? 1 : 0
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j) && dp[mask ^ (1 << j)] + bonus === dp[mask]) {
        removed.push(j)
        mask ^= 1 << j
        break
      }
    }
  }

  const groups: Entry[][] = []
  let current: Entry[] = []
  let running = 0
  for (let k = removed.length - 1; k >= 0; k--) {
    const e = entries[removed[k]]
    current.push(e)
    running += e.value
    if (running === 0) {
      groups.push(current.sort((a, b) => entries.indexOf(a) - entries.indexOf(b)))
      current = []
    }
  }
  return groups
}

/** Người lỗ nhiều nhất trả người lời nhiều nhất cho đến khi về 0. */
function greedy(group: Entry[], reason: string): Transfer[] {
  const people = group.map((e) => ({ ...e }))
  const out: Transfer[] = []
  for (;;) {
    let debtor: Entry | undefined
    let creditor: Entry | undefined
    for (const p of people) {
      if (p.value < 0 && (!debtor || p.value < debtor.value)) debtor = p
      if (p.value > 0 && (!creditor || p.value > creditor.value)) creditor = p
    }
    if (!debtor || !creditor) return out
    const amount = Math.min(-debtor.value, creditor.value)
    out.push({ from: debtor.id, to: creditor.id, amount, reason })
    debtor.value += amount
    creditor.value -= amount
  }
}
