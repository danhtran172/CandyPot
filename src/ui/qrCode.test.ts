import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { codeFromQr } from './qrCode'

/** Vẽ mã QR thành ảnh RGBA (màu như trong app: chấm tím đậm trên nền kem, có viền). */
function render(text: string, cell = 6, margin = 4) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = (modules.size + margin * 2) * cell
  const data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / cell) - margin
      const my = Math.floor(y / cell) - margin
      const dark = mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx)
      const [r, g, b] = dark ? [0x1c, 0x0e, 0x22] : [0xff, 0xf1, 0xe0]
      data.set([r, g, b, 255], (y * size + x) * 4)
    }
  }
  return { data, size }
}

describe('Quét mã QR vào bàn', () => {
  it('đọc được mã QR của bàn và lấy ra mã 5 số', () => {
    const { data, size } = render('https://candypot.web.app/join?code=26779')
    const hit = jsQR(data, size, size, { inversionAttempts: 'dontInvert' })
    expect(hit?.data).toBe('https://candypot.web.app/join?code=26779')
    expect(codeFromQr(hit!.data)).toBe('26779')
  })

  it('nhận cả mã 5 số trần; bỏ qua QR không phải của bàn', () => {
    expect(codeFromQr(' 12345 ')).toBe('12345')
    expect(codeFromQr('https://example.com/?code=abc')).toBeNull()
    expect(codeFromQr('https://example.com/page/123456')).toBeNull()
    expect(codeFromQr('hello')).toBeNull()
  })
})
