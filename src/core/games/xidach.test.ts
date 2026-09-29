import { describe, expect, it } from 'vitest'
import { netOfTransfers } from '../ledger'
import { dealerBust, dealerNatural, xidach, type XiDachHand, type XiDachInput } from './xidach'

const cfg = xidach.defaultConfig

function hand(playerId: string, result: XiDachHand['result'], bet = 10, label: XiDachHand['label'] = null): XiDachHand {
  return { playerId, bet, result, label }
}

function input(hands: XiDachHand[], dealerLabel: XiDachInput['dealerLabel'] = null): XiDachInput {
  return { dealer: 'd', dealerLabel, hands }
}

describe('xidach.resolve', () => {
  it('thắng / thua / hòa ×1', () => {
    const r = xidach.resolve(input([hand('a', 'win'), hand('b', 'lose', 5), hand('c', 'push')]), cfg, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: 10, b: -5, d: -5 })
    expect(r.tags).toEqual([{ type: 'lam-cai', playerId: 'd' }])
  })

  it('con thắng có nhãn xì bàn / xì dách / ngũ linh → ×2', () => {
    const r = xidach.resolve(
      input([hand('a', 'win', 10, 'xiban'), hand('b', 'win', 10, 'xidach'), hand('c', 'win', 10, 'ngulinh')]),
      cfg,
      1,
    )
    expect(netOfTransfers(r.transfers)).toEqual({ a: 20, b: 20, c: 20, d: -60 })
  })

  it('con thua khi cái có nhãn → ×hệ số của cái', () => {
    const r = xidach.resolve(input([hand('a', 'lose'), hand('b', 'lose', 10, 'quac')], 'xidach'), cfg, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: -20, b: -20, d: 40 })
  })

  it('nhãn quắc / non không nhân hệ số', () => {
    const r = xidach.resolve(input([hand('a', 'win', 10, 'non')], 'quac'), cfg, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: 10, d: -10 })
  })

  it('hệ số lấy từ config', () => {
    const r = xidach.resolve(input([hand('a', 'win', 10, 'xiban')]), { ...cfg, multipliers: { ...cfg.multipliers, xiban: 3 } }, 1)
    expect(netOfTransfers(r.transfers)).toEqual({ a: 30, d: -30 })
  })
})

describe('xidach — nút nhanh', () => {
  it('cái xì bàn: mọi con thua, nhãn cái = xiban', () => {
    const out = dealerNatural(input([hand('a', 'win'), hand('b', 'push')]), 'xiban')
    expect(out.dealerLabel).toBe('xiban')
    expect(out.hands.map((h) => h.result)).toEqual(['lose', 'lose'])
    expect(netOfTransfers(xidach.resolve(out, cfg, 1).transfers)).toEqual({ a: -20, b: -20, d: 40 })
  })

  it('cái quắc (mặc định): con không quắc thắng, con quắc hòa', () => {
    const out = dealerBust(input([hand('a', 'lose'), hand('b', 'lose', 10, 'quac')]), cfg)
    expect(out.dealerLabel).toBe('quac')
    expect(out.hands.map((h) => h.result)).toEqual(['win', 'push'])
  })

  it('cái quắc (cấu hình thua): con quắc vẫn thua', () => {
    const out = dealerBust(input([hand('a', 'lose'), hand('b', 'win', 10, 'quac')]), { ...cfg, bothBust: 'lose' })
    expect(out.hands.map((h) => h.result)).toEqual(['win', 'lose'])
  })
})

describe('xidach.validate', () => {
  it('hợp lệ', () => {
    expect(xidach.validate(input([hand('a', 'win')]), cfg)).toEqual([])
  })

  it('cần cái và ≥ 1 con', () => {
    expect(xidach.validate({ ...input([hand('a', 'win')]), dealer: '' }, cfg)).not.toEqual([])
    expect(xidach.validate(input([]), cfg)).not.toEqual([])
  })

  it('cái không được là con, con không trùng', () => {
    expect(xidach.validate(input([hand('d', 'win')]), cfg)).not.toEqual([])
    expect(xidach.validate(input([hand('a', 'win'), hand('a', 'lose')]), cfg)).not.toEqual([])
  })

  it('cược phải là số nguyên > 0, mọi con phải có kết quả', () => {
    expect(xidach.validate(input([hand('a', 'win', 0)]), cfg)).not.toEqual([])
    expect(xidach.validate(input([hand('a', 'win', 1.5)]), cfg)).not.toEqual([])
    expect(xidach.validate(input([hand('a', null)]), cfg)).not.toEqual([])
  })
})
