import { describe, expect, it } from 'vitest'
import { folkLine, fullReading, lotoCallText, lotoReading } from './lotoCall'

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

  it('đọc thường: "Số …"; kêu lô tô: mở đầu + câu dân gian cùng vần + "là con số …", đủ 90 số, mọi máy cùng câu', () => {
    expect(lotoCallText(46, 'v1', false)).toBe('Số bốn mươi sáu')
    const keu = lotoCallText(46, 'v1', true)
    expect(keu).toMatch(/cờ ra (mà )?con mấy.*Chiều chiều ra đứng ngõ sau… là con số bốn sáu! Bốn sáu!$/)
    expect(lotoCallText(46, 'v1', true)).toBe(keu)
    expect(lotoCallText(1, 'v1', true)).toMatch(/Đứng đầu lô tô là con số một!$/)
    expect(lotoCallText(5, 'v1', true)).toMatch(/Số năm là con số năm!$/)
    for (let n = 1; n <= 90; n++) {
      expect(folkLine(n)).toBeTruthy()
      expect(lotoCallText(n, 'v1', true)).toMatch(/con số/)
    }
  })
})
