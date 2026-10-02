/**
 * Câu gọi số lô tô cho giọng đọc.
 * - Kêu lô tô (ngắn gọn): "Cờ ra con bốn sáu! Bốn sáu!" — đọc số kiểu lô tô ("bốn sáu", "ba mốt", "hai lăm").
 * - Đọc thường: "Số bốn mươi sáu".
 */

const DIGIT = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

/** Đọc số kiểu lô tô: 46 → "bốn sáu", 31 → "ba mốt", 25 → "hai lăm", 14 → "mười bốn", 20 → "hai mươi". */
export function lotoReading(n: number): string {
  if (n < 10) return DIGIT[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 1) return u === 0 ? 'mười' : `mười ${u === 5 ? 'lăm' : DIGIT[u]}`
  if (u === 0) return `${DIGIT[t]} mươi`
  const unit = u === 1 ? 'mốt' : u === 4 ? 'tư' : u === 5 ? 'lăm' : DIGIT[u]
  return `${DIGIT[t]} ${unit}`
}

/** Đọc đầy đủ: 46 → "bốn mươi sáu" (dưới 20 và số chẵn chục đọc như kiểu lô tô). */
export function fullReading(n: number): string {
  const short = lotoReading(n)
  return n < 20 || n % 10 === 0 ? short : short.replace(' ', ' mươi ')
}

/** Câu gọi số `n`: kêu lô tô ngắn gọn ("Cờ ra con bốn sáu! Bốn sáu!") hoặc đọc thường ("Số bốn mươi sáu"). */
export function lotoCallText(n: number, short: boolean): string {
  if (!short) return `Số ${fullReading(n)}`
  const read = lotoReading(n)
  return `Cờ ra con ${read}! ${read[0].toUpperCase() + read.slice(1)}!`
}
