/**
 * Câu gọi số lô tô cho giọng đọc.
 * - Đọc thường: "Số bốn mươi sáu".
 * - Kêu lô tô (theo cách kêu ở hội chợ / gánh lô tô miền Nam): mở đầu "Con mấy gì đây, con mấy gì đây, cờ ra con mấy…",
 *   (số nào có câu hát dân gian quen thuộc mà chữ cuối đồng âm với con số thì hát câu đó), rồi chốt "là con số …".
 *   Người kêu thật ứng tác câu hát tại chỗ — ở đây chỉ dùng những câu dân gian quen thuộc, không tự chế.
 * Câu mở đầu chọn theo `seed` (mã ván) + số → mọi máy trong phòng đọc cùng một câu.
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

/** Câu mở đầu quen thuộc khi bốc số. */
const OPENERS = ['Con mấy gì đây, con mấy gì đây, cờ ra con mấy…', 'Cờ ra con mấy, con mấy gì ra…']

/** Số có câu kêu dân gian quen thuộc (chữ cuối đồng âm với con số). */
const FOLK: Record<number, string> = {
  1: 'Đứng đầu lô tô là con số một!',
  5: 'Lấy nhau chẳng đặng, thương hoài ngàn năm… Số năm là con số năm!',
}

/** Băm chuỗi ra số (ổn định giữa các máy). */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Câu gọi số `n` (kêu lô tô hoặc đọc thường), chọn ổn định theo `seed`. */
export function lotoCallText(n: number, seed: string, rhyme: boolean): string {
  if (!rhyme) return `Số ${fullReading(n)}`
  const opener = OPENERS[hash(`${seed}:${n}`) % OPENERS.length]
  if (FOLK[n]) return `${opener} ${FOLK[n]}`
  const read = lotoReading(n)
  const cap = read[0].toUpperCase() + read.slice(1)
  return `${opener} ${cap}! Là con số ${read}!`
}
