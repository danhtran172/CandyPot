import { describe, expect, it } from 'vitest'
import { netOfTransfers } from '../ledger'
import { tienlen, type TienLenInput } from './tienlen'

const cfg = tienlen.defaultConfig

function input(partial: Partial<TienLenInput>): TienLenInput {
  return { players: [], ranking: [], chay: [], toiTrang: null, thoi: [], chops: [], ...partial }
}

function net(i: TienLenInput, bet = 1) {
  return netOfTransfers(tienlen.resolve(i, cfg, bet).transfers)
}

describe('tienlen.resolve — xếp hạng', () => {
  it('4 người: Bét → Nhất 2u, Ba → Nhì 1u', () => {
    const i = input({ players: ['a', 'b', 'c', 'd'], ranking: ['a', 'b', 'c', 'd'] })
    expect(net(i, 5)).toEqual({ a: 10, b: 5, c: -5, d: -10 })
  })

  it('3 người: Bét → Nhất 2u, Nhì hòa', () => {
    const i = input({ players: ['a', 'b', 'c'], ranking: ['c', 'a', 'b'] })
    expect(net(i)).toEqual({ c: 2, b: -2 })
  })

  it('2 người: thua → thắng 1u', () => {
    expect(net(input({ players: ['a', 'b'], ranking: ['b', 'a'] }))).toEqual({ a: -1, b: 1 })
  })
})

describe('tienlen.resolve — đặc biệt', () => {
  it('tới trắng: nhận 3u từ mỗi người, gắn tag', () => {
    const i = input({ players: ['a', 'b', 'c', 'd'], toiTrang: 'b' })
    const r = tienlen.resolve(i, cfg, 2)
    expect(netOfTransfers(r.transfers)).toEqual({ a: -6, b: 18, c: -6, d: -6 })
    expect(r.tags).toEqual([{ type: 'toi-trang', playerId: 'b' }])
  })

  it('1 người cháy: trả Nhất 3u, 3 người còn lại theo bảng 3 người', () => {
    const i = input({ players: ['a', 'b', 'c', 'd'], ranking: ['a', 'b', 'c'], chay: ['d'] })
    const r = tienlen.resolve(i, cfg, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: 5, c: -2, d: -3 })
    expect(r.tags).toContainEqual({ type: 'chay', playerId: 'd' })
  })

  it('2 người cháy: mỗi người trả Nhất 3u, 2 người còn lại theo bảng 2 người', () => {
    const i = input({ players: ['a', 'b', 'c', 'd'], ranking: ['b', 'a'], chay: ['c', 'd'] })
    expect(net(i)).toEqual({ a: -1, b: 7, c: -3, d: -3 })
  })

  it('3 người cháy: chỉ còn Nhất, không có trả theo hạng', () => {
    const i = input({ players: ['a', 'b', 'c', 'd'], ranking: ['a'], chay: ['b', 'c', 'd'] })
    expect(net(i)).toEqual({ a: 9, b: -3, c: -3, d: -3 })
  })

  it('thối nhiều loại quân: trả cho Nhất', () => {
    const i = input({
      players: ['a', 'b'],
      ranking: ['a', 'b'],
      thoi: [{ playerId: 'b', cards: { heoDen: 1, heoDo: 2, tuQuy: 1 } }],
    })
    const r = tienlen.resolve(i, cfg, 1)
    // hạng 1 + heo đen 1 + 2 heo đỏ 4 + tứ quý 3 = 9
    expect(netOfTransfers(r.transfers)).toEqual({ a: 9, b: -9 })
    expect(r.tags).toContainEqual({ type: 'thoi', playerId: 'b' })
  })

  it('chặt đơn: người bị chặt trả người chặt', () => {
    const i = input({
      players: ['a', 'b', 'c'],
      ranking: ['a', 'b', 'c'],
      chops: [{ steps: [{ playerId: 'c', cards: { heoDo: 1 } }, { playerId: 'b', cards: { baDoiThong: 1 } }] }],
    })
    const r = tienlen.resolve(i, cfg, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: 2, b: 2, c: -4 })
    expect(r.tags).toContainEqual({ type: 'chat', playerId: 'b' })
  })

  it('chặt chồng 3 bước: người bị chặt cuối trả tổng mọi quân trừ quân chặt cuối', () => {
    const i = input({
      players: ['a', 'b', 'c'],
      ranking: ['a', 'b', 'c'],
      chops: [
        {
          steps: [
            { playerId: 'a', cards: { heoDo: 1 } },
            { playerId: 'b', cards: { baDoiThong: 1 } },
            { playerId: 'c', cards: { tuQuy: 1 } },
          ],
        },
      ],
    })
    // xếp hạng: c → a 2 ; chặt chồng: b → c (2 + 2) = 4
    expect(net(i)).toEqual({ a: 2, b: -4, c: 2 })
  })

  it('hệ số nhân theo mức cược', () => {
    const i = input({ players: ['a', 'b'], ranking: ['a', 'b'], thoi: [{ playerId: 'b', cards: { heoDen: 2 } }] })
    expect(net(i, 3)).toEqual({ a: 9, b: -9 })
  })
})

describe('tienlen.validate', () => {
  const ok = input({ players: ['a', 'b'], ranking: ['a', 'b'] })

  it('hợp lệ', () => {
    expect(tienlen.validate(ok, cfg)).toEqual([])
  })

  it('2–4 người', () => {
    expect(tienlen.validate(input({ players: ['a'], ranking: ['a'] }), cfg)).not.toEqual([])
    const five = ['a', 'b', 'c', 'd', 'e']
    expect(tienlen.validate(input({ players: five, ranking: five }), cfg)).not.toEqual([])
  })

  it('xếp hạng phải đủ và không trùng', () => {
    expect(tienlen.validate(input({ players: ['a', 'b', 'c'], ranking: ['a', 'b'] }), cfg)).not.toEqual([])
    expect(tienlen.validate(input({ players: ['a', 'b'], ranking: ['a', 'a'] }), cfg)).not.toEqual([])
    expect(tienlen.validate(input({ players: ['a', 'b'], ranking: ['a'], chay: ['a'] }), cfg)).not.toEqual([])
  })

  it('phải có người Nhất (không thể tất cả đều cháy)', () => {
    expect(tienlen.validate(input({ players: ['a', 'b'], ranking: [], chay: ['a', 'b'] }), cfg)).not.toEqual([])
  })

  it('tới trắng thì không xếp hạng / cháy / thối / chặt', () => {
    expect(tienlen.validate(input({ players: ['a', 'b'], toiTrang: 'a' }), cfg)).toEqual([])
    expect(tienlen.validate(input({ players: ['a', 'b'], toiTrang: 'a', ranking: ['a', 'b'] }), cfg)).not.toEqual([])
    expect(tienlen.validate(input({ players: ['a', 'b'], toiTrang: 'z' }), cfg)).not.toEqual([])
  })

  it('người thối không được là Nhất và phải có quân', () => {
    expect(tienlen.validate({ ...ok, thoi: [{ playerId: 'a', cards: { heoDen: 1 } }] }, cfg)).not.toEqual([])
    expect(tienlen.validate({ ...ok, thoi: [{ playerId: 'b', cards: {} }] }, cfg)).not.toEqual([])
  })

  it('chuỗi chặt ≥ 2 bước, 2 bước liền nhau khác người, quân bị chặt có giá trị', () => {
    const step = (playerId: string) => ({ playerId, cards: { heoDen: 1 } })
    expect(tienlen.validate({ ...ok, chops: [{ steps: [step('a')] }] }, cfg)).not.toEqual([])
    expect(tienlen.validate({ ...ok, chops: [{ steps: [step('a'), step('a')] }] }, cfg)).not.toEqual([])
    expect(
      tienlen.validate({ ...ok, chops: [{ steps: [{ playerId: 'a', cards: {} }, step('b')] }] }, cfg),
    ).not.toEqual([])
    expect(tienlen.validate({ ...ok, chops: [{ steps: [step('a'), step('b')] }] }, cfg)).toEqual([])
  })
})
