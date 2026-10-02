import { describe, expect, it } from 'vitest'
import { fullReading, lotoCallText, lotoReading, lotoTag } from './lotoCall'

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

  it('kêu lô tô: câu vần ngắn theo tiếng cuối, đủ 90 số; tắt thì đọc thường', () => {
    expect(lotoCallText(35, true)).toBe('Tham thì thâm, con ba lăm!')
    expect(lotoCallText(33, true)).toBe('Ba ba con cá tra!')
    expect(lotoCallText(1, true)).toBe('Đứng đầu lô tô, con số một!')
    expect(lotoCallText(35, false)).toBe('Số ba mươi lăm')
    for (let n = 1; n <= 90; n++) expect(lotoTag(n)).toMatch(/!$/)
  })
})
