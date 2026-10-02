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

  it('đọc thường: "Số …"; kêu lô tô: câu mở đầu + đọc số + "là con số …", cùng ván cùng số thì cùng câu', () => {
    expect(lotoCallText(46, 'v1', false)).toBe('Số bốn mươi sáu')
    const keu = lotoCallText(46, 'v1', true)
    expect(keu).toMatch(/^(Con mấy gì đây|Cờ ra con mấy).*Bốn sáu! Là con số bốn sáu!$/)
    expect(lotoCallText(46, 'v1', true)).toBe(keu)
    // Câu dân gian quen thuộc
    expect(lotoCallText(1, 'v1', true)).toMatch(/Đứng đầu lô tô là con số một!$/)
    expect(lotoCallText(5, 'v1', true)).toMatch(/Số năm là con số năm!$/)
  })
})
