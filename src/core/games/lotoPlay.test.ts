import { describe, expect, it } from 'vitest'
import { callNumber, claim, emptyLoto, fullRows, judge, pickSheets, remaining, setWaiting, waitRows, type LotoState } from './lotoPlay'
import { rowNumbers, sheetSet } from './lotoSheets'

const ok = (r: LotoState | string) => {
  if (typeof r === 'string') throw new Error(r)
  return r
}

describe('lotoPlay', () => {
  const sheets = sheetSet('g', 6)

  it('chọn tờ: không trùng người khác, không quá tối đa, chọn lại thay tờ cũ', () => {
    let s = emptyLoto('h')
    s = ok(pickSheets(s, 'a', [0, 1], 2, 12))
    expect(pickSheets(s, 'b', [1], 2, 12)).toBe('Tờ này đã có người mua — chọn tờ khác.')
    expect(pickSheets(s, 'b', [2, 3, 4], 2, 12)).toMatch(/tối đa 2/)
    expect(pickSheets(s, 'b', [2, 2], 2, 12)).toBe('Chọn trùng tờ.')
    s = ok(pickSheets(s, 'a', [5], 2, 12))
    expect(s.sheets.a).toEqual([5])
    s = ok(pickSheets(s, 'b', [0], 2, 12))
    expect(s.sheets.b).toEqual([0])
  })

  it('gọi số: chỉ người gọi, không lặp; kinh khi đủ 5 số một hàng', () => {
    let s = ok(pickSheets(emptyLoto('h'), 'a', [0], 2, 12))
    expect(typeof callNumber(s, 'a', 5)).toBe('string')
    const row = rowNumbers(sheets[0], 4)
    for (const n of row.slice(0, 4)) s = ok(callNumber(s, 'h', n))
    expect(callNumber(s, 'h', row[0])).toMatch(/đã gọi/)
    expect(claim(s, sheets, 'a', 0, 4)).toMatch(/chưa được gọi/)
    s = ok(callNumber(s, 'h', row[4]))
    expect(fullRows(sheets[0], s.called)).toContain(4)
    expect(claim(s, sheets, 'b', 0, 4)).toBe('Tờ này không phải của bạn.')
    s = ok(claim(s, sheets, 'a', 0, 4))
    expect(s.winner).toEqual({ id: 'a', sheet: 0, row: 4 })
    expect(callNumber(s, 'h', remaining(s)[0])).toMatch(/kinh/)
  })

  it('gọi ở ngoài: kinh theo hàng đã đánh, không cần số trong app', () => {
    const s = ok(pickSheets(emptyLoto('h'), 'a', [0], 2, 12))
    expect(claim(s, sheets, 'a', 0, 2)).toMatch(/chưa được gọi/)
    const p = ok(claim(s, sheets, 'a', 0, 2, true))
    // Chưa tính: chờ host xác nhận
    expect(p.winner).toBeUndefined()
    expect(p.pending).toEqual({ id: 'a', sheet: 0, row: 2 })
    expect(claim(p, sheets, 'a', 0, 3, true)).toMatch(/chờ host/)
    const no = ok(judge(p, false))
    expect([no.pending, no.rejected, no.winner]).toEqual([undefined, 'a', undefined])
    expect(ok(judge(ok(claim(no, sheets, 'a', 0, 2, true)), true)).winner).toEqual({ id: 'a', sheet: 0, row: 2 })
  })
})

describe('lotoPlay — đợi', () => {
  const sheets = sheetSet('g', 6)
  it('hàng có 4/5 số là đợi; báo / thôi báo; kinh rồi thì thôi', () => {
    const row = rowNumbers(sheets[0], 3)
    expect(waitRows(sheets[0], row.slice(0, 3))).not.toContain(3)
    expect(waitRows(sheets[0], row.slice(0, 4))).toContain(3)
    let s = ok(pickSheets(emptyLoto('h'), 'a', [0], 2, 12))
    s = ok(pickSheets(s, 'b', [1], 2, 12))
    expect(setWaiting(s, 'c', true)).toMatch(/không mua/)
    s = ok(setWaiting(s, 'a', true))
    s = ok(setWaiting(s, 'b', true))
    s = ok(setWaiting(s, 'a', true))
    expect(s.waiting).toEqual(['b', 'a'])
    s = ok(setWaiting(s, 'b', false))
    expect(s.waiting).toEqual(['a'])
    expect(setWaiting({ ...s, winner: { id: 'a', sheet: 0, row: 3 } }, 'b', true)).toMatch(/kinh/)
  })
})

describe('lotoCalling — cách gọi số', () => {
  it('mặc định gọi ở ngoài; chọn rồi thì theo lựa chọn; game cũ bật máy gọi thì giữ', async () => {
    const { lotoCalling } = await import('./loto')
    const g = (x: object) => ({ id: 'g', type: 'loto', name: '', rounds: [], ...x }) as never
    expect(lotoCalling(g({}))).toBe('outside')
    expect(lotoCalling(g({ lotoOutside: false }))).toBe('bag')
    expect(lotoCalling(g({ lotoOutside: false, lotoAuto: true }))).toBe('auto')
    expect(lotoCalling(g({ lotoAuto: true }))).toBe('auto')
    expect(lotoCalling(g({ lotoOutside: true, lotoAuto: false }))).toBe('outside')
  })
})
