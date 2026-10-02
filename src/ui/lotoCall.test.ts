import { describe, expect, it } from 'vitest'
import { fullReading, lotoCallText, lotoReading } from './lotoCall'

describe('lotoCall — gọi số lô tô', () => {
  it('đọc số kiểu lô tô và đọc đầy đủ', () => {
    expect([5, 10, 14, 15, 20, 21, 24, 25, 31, 46, 90].map(lotoReading)).toEqual([
      'năm',
      'mười',
      'mười bốn',
      'mười lăm',
      'hai mươi',
      'hai mốt',
      'hai tư',
      'hai lăm',
      'ba mốt',
      'bốn sáu',
      'chín mươi',
    ])
    expect([7, 15, 40, 46, 21].map(fullReading)).toEqual(['bảy', 'mười lăm', 'bốn mươi', 'bốn mươi sáu', 'hai mươi mốt'])
  })

  it('đọc thường: "Số …"; rao lô tô: đọc số kiểu lô tô kèm câu vần, cùng ván cùng số thì cùng câu', () => {
    expect(lotoCallText(46, 'v1', false)).toBe('Số bốn mươi sáu')
    const rao = lotoCallText(46, 'v1', true)
    expect(rao).toMatch(/Bốn sáu! Bốn sáu (ông táo|con sáo|cái áo mới)!$/)
    expect(lotoCallText(46, 'v1', true)).toBe(rao)
    // Số nào cũng có câu vần
    for (let n = 1; n <= 90; n++) expect(lotoCallText(n, 'v1', true)).toMatch(/! .+ .+!$/)
  })
})
