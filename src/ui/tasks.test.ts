import { describe, expect, it, vi } from 'vitest'
import type { Session } from '../core/types'
import { hostTasks, incomingAsks, myUndos, othersPending, outgoingAsks, tasksFor } from './tasks'

vi.mock('../store', () => ({ actions: () => ({}) }))

const session = {
  hostId: 'h',
  requests: [
    { id: 'r1', gameId: 'g', from: 'h', to: 'a', amount: 4, at: 3 },
    { id: 'r2', gameId: 'g', from: 'a', to: 'b', amount: 2, at: 1 },
  ],
  undos: [{ id: 'u1', gameId: 'g', roundId: 'r', moveId: 'm', by: 'a', at: 2 }],
} as unknown as Session

describe('Host / Yêu cầu', () => {
  it('host thấy lời đòi gửi mình và mọi yêu cầu hoàn tác, cũ nhất trước', () => {
    expect(tasksFor(session, 'h').map((t) => t.id)).toEqual(['u1', 'r1'])
    expect(othersPending(session, 'h').map((r) => r.id)).toEqual(['r2'])
    expect(hostTasks(session, 'h').map((t) => t.id)).toEqual(['u1'])
    expect(myUndos(session, 'h')).toEqual([])
  })

  it('người chơi: tab Host chỉ có yêu cầu hoàn tác của mình; tab Yêu cầu có đòi đến và đòi đi', () => {
    expect(hostTasks(session, 'a')).toEqual([])
    expect(myUndos(session, 'a').map((u) => u.id)).toEqual(['u1'])
    expect(incomingAsks(session, 'a').map((t) => t.id)).toEqual(['r2'])
    expect(outgoingAsks(session, 'a').map((r) => r.id)).toEqual(['r1'])
  })

  it('người chơi chỉ thấy lời đòi gửi mình', () => {
    expect(tasksFor(session, 'a').map((t) => t.id)).toEqual(['r2'])
    expect(othersPending(session, 'a')).toEqual([])
    expect(tasksFor(session, undefined)).toEqual([])
  })
})
