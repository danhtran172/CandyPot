import { describe, expect, it } from 'vitest'
import { assertZeroSum, handOf, netOf, netOfTransfers, renewCount } from './ledger'
import type { Session } from './types'

function session(): Session {
  return {
    id: 's',
    name: 'Test',
    createdAt: 0,
    updatedAt: 0,
    players: [
      { id: 'a', name: 'An', emoji: '🐱', active: true },
      { id: 'b', name: 'Bình', emoji: '🐶', active: true },
      { id: 'c', name: 'Cường', emoji: '🐸', active: true },
    ],
    settings: { packSize: 50 },
    renews: [{ id: 'r1', playerId: 'b', at: 1 }],
    games: [
      {
        id: 'g1',
        type: 'tienlen',
        name: 'Tiến lên',
        config: {},
        rounds: [
          {
            id: 'r',
            at: 1,
            kind: 'play',
            participants: ['a', 'b', 'c'],
            bet: 1,
            input: null,
            transfers: [
              { from: 'b', to: 'a', amount: 4, reason: '' },
              { from: 'c', to: 'a', amount: 1, reason: '' },
            ],
            tags: [],
          },
        ],
      },
      {
        id: 'g2',
        type: 'xidach',
        name: 'Xì dách',
        config: {},
        rounds: [
          {
            id: 'r2',
            at: 2,
            kind: 'manual',
            participants: ['a', 'c'],
            bet: 0,
            input: null,
            transfers: [{ from: 'a', to: 'c', amount: 2, reason: '' }],
            tags: [],
          },
        ],
      },
    ],
  }
}

describe('ledger', () => {
  it('netOfTransfers sums received minus paid', () => {
    expect(netOfTransfers([{ from: 'a', to: 'b', amount: 3, reason: '' }])).toEqual({ a: -3, b: 3 })
  })

  it('netOf covers every player, across all games', () => {
    expect(netOf(session())).toEqual({ a: 3, b: -4, c: 1 })
  })

  it('netOf can filter by game', () => {
    expect(netOf(session(), 'g2')).toEqual({ a: -2, b: 0, c: 2 })
  })

  it('hand = pack × (1 + renews) + net', () => {
    const s = session()
    expect(renewCount(s, 'b')).toBe(1)
    expect(handOf(s, 'b')).toBe(50 * 2 - 4)
    expect(handOf(s, 'a')).toBe(53)
  })

  it('assertZeroSum throws on imbalance', () => {
    expect(() => assertZeroSum({ a: 1, b: -1 })).not.toThrow()
    expect(() => assertZeroSum({ a: 1 })).toThrow()
  })
})
