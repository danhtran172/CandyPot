import { describe, expect, it } from 'vitest'
import { settle } from './settle'
import type { Net, Transfer } from './types'

function apply(transfers: Transfer[]): Net {
  const out: Net = {}
  for (const t of transfers) {
    out[t.from] = (out[t.from] ?? 0) - t.amount
    out[t.to] = (out[t.to] ?? 0) + t.amount
  }
  return out
}

/** Brute force: số nhóm tổng 0 tối đa (chỉ dùng cho n nhỏ). */
function maxZeroGroups(values: number[]): number {
  if (values.length === 0) return 0
  const [first, ...rest] = values
  let best = 0
  // Nhóm chứa `first` là {first} ∪ một tập con của rest có tổng = -first
  const m = rest.length
  for (let mask = 0; mask < 1 << m; mask++) {
    let s = first
    const others: number[] = []
    for (let i = 0; i < m; i++) {
      if (mask & (1 << i)) s += rest[i]
      else others.push(rest[i])
    }
    if (s === 0) best = Math.max(best, 1 + maxZeroGroups(others))
  }
  return best
}

function nonZero(net: Net): Net {
  return Object.fromEntries(Object.entries(net).filter(([, v]) => v !== 0))
}

describe('settle', () => {
  it('returns nothing when everyone is even', () => {
    expect(settle({ a: 0, b: 0 })).toEqual([])
  })

  it('single debtor pays single creditor', () => {
    const t = settle({ a: -5, b: 5 })
    expect(t).toEqual([{ from: 'a', to: 'b', amount: 5, reason: 'Trả kẹo' }])
  })

  it('uses zero-sum subgroups to minimise transfers', () => {
    // Nhóm {a,c} và {b,d} tự cấn trừ → 2 lượt thay vì 3
    const net = { a: -7, b: -3, c: 7, d: 3 }
    const t = settle(net)
    expect(t).toHaveLength(2)
    expect(nonZero(apply(t))).toEqual(net)
  })

  it('finds 3 groups among 6 people', () => {
    const net = { a: -4, b: 4, c: -9, d: 9, e: -2, f: 2 }
    expect(settle(net)).toHaveLength(3)
  })

  it('needs n-1 transfers when no subgroup cancels', () => {
    const net = { a: -10, b: 3, c: 3, d: 4 }
    const t = settle(net)
    expect(t).toHaveLength(3)
    expect(nonZero(apply(t))).toEqual(net)
  })

  it('is deterministic', () => {
    const net = { a: -6, b: -4, c: 5, d: 5 }
    expect(settle(net)).toEqual(settle({ ...net }))
  })

  it('throws when net does not sum to zero', () => {
    expect(() => settle({ a: -1, b: 2 })).toThrow()
  })

  it('falls back to greedy above 15 people and still balances', () => {
    const net: Net = {}
    for (let i = 0; i < 20; i++) net[`p${i}`] = i % 2 === 0 ? -(i + 1) : i
    // p0:-1 p1:1 p2:-3 p3:3 ... tổng = 0
    const t = settle(net)
    expect(nonZero(apply(t))).toEqual(nonZero(net))
    expect(t.length).toBeLessThanOrEqual(19)
  })

  it('random: balances and never exceeds n-1 transfers', () => {
    let seed = 42
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed / 2 ** 31
    }
    for (let run = 0; run < 1000; run++) {
      const n = 2 + Math.floor(rand() * 9)
      const net: Net = {}
      let sum = 0
      for (let i = 0; i < n - 1; i++) {
        const v = Math.floor(rand() * 41) - 20
        net[`p${i}`] = v
        sum += v
      }
      net[`p${n - 1}`] = -sum
      const t = settle(net)
      expect(nonZero(apply(t))).toEqual(nonZero(net))
      const values = Object.values(net).filter((v) => v !== 0)
      expect(t.length).toBe(values.length === 0 ? 0 : values.length - maxZeroGroups(values))
      for (const x of t) expect(x.amount).toBeGreaterThan(0)
    }
  })
})
