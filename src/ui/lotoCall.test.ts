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

  it('kêu lô tô ngắn gọn / đọc thường', () => {
    expect(lotoCallText(46, true)).toBe('Cờ ra con bốn sáu! Bốn sáu!')
    expect(lotoCallText(31, true)).toBe('Cờ ra con ba mốt! Ba mốt!')
    expect(lotoCallText(46, false)).toBe('Số bốn mươi sáu')
  })
})
