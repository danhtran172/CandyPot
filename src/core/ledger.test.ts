import { describe, expect, it } from 'vitest'
import { assertZeroSum, netOf, netOfTransfers } from './ledger'
import type { Session } from './types'

function session(): Session {
  return {
    id: 's',
    name: 'Test',
    createdAt: 0,
    updatedAt: 0,
    requests: [],
    undos: [],
    hostId: null,
    players: [
      { id: 'a', name: 'An', emoji: '🐱', active: true },
      { id: 'b', name: 'Bình', emoji: '🐶', active: true },
      { id: 'c', name: 'Cường', emoji: '🐸', active: true },
    ],
    games: [
      {
        id: 'g1',
        type: 'tienlen',
        name: 'Tiến lên',
        rounds: [
          {
            id: 'r',
            at: 1,
            kind: 'play',
            status: 'closed',
            participants: ['a', 'b', 'c'],
            bet: 1,
            stakes: {},
            dealer: null,
            moves: [],
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
        rounds: [
          {
            id: 'r2',
            at: 2,
            kind: 'manual',
            status: 'closed',
            participants: ['a', 'c'],
            bet: 0,
            stakes: {},
            dealer: null,
            moves: [],
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

  it('ván đang mở không tính vào lời/lỗ', () => {
    const s = session()
    s.games[1].rounds.push({
      id: 'open',
      at: 3,
      kind: 'play',
      status: 'open',
      participants: ['a', 'b'],
      bet: 5,
      stakes: {},
      dealer: null,
      moves: [{ id: 'm', from: 'a', to: 'pot', amount: 5, label: '' }],
      transfers: [],
      tags: [],
    })
    expect(netOf(s)).toEqual({ a: 3, b: -4, c: 1 })
  })

  it('assertZeroSum throws on imbalance', () => {
    expect(() => assertZeroSum({ a: 1, b: -1 })).not.toThrow()
    expect(() => assertZeroSum({ a: 1 })).toThrow()
  })
})
