/**
 * Câu gọi số lô tô cho giọng đọc.
 * - Đọc thường: "Số bốn mươi sáu".
 * - Rao lô tô (kiểu hội chợ): mở đầu + đọc số kiểu lô tô ("bốn sáu", "ba mốt", "hai lăm") + câu vần theo âm cuối,
 *   vd "Ra con gì đây? Bốn sáu! Bốn sáu ông táo!".
 * Câu chọn theo `seed` (mã ván) + số → mọi máy trong phòng đọc cùng một câu.
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

/** Câu vần theo tiếng cuối của số (vần gần giống là được, cho vui tai). */
const RHYMES: Record<string, string[]> = {
  một: ['cột đình làng', 'bánh bột lọc'],
  mốt: ['cà rốt', 'trái ớt cay xè', 'gánh bột đi chợ'],
  hai: ['trái xoài', 'củ khoai lang', 'bông lài thơm'],
  ba: ['con gà trống', 'bông hoa nở', 'ông bà ngồi đó'],
  bốn: ['con chồn', 'chơi trốn tìm'],
  tư: ['cô Tư', 'ngồi lừ đừ', 'trái dưa hấu'],
  năm: ['cái mâm đồng', 'hái tăm tre'],
  lăm: ['rau răm', 'ngồi chăm chăm'],
  sáu: ['ông táo', 'con sáo', 'cái áo mới'],
  bảy: ['nhảy dây', 'máy bay', 'tay trong tay'],
  tám: ['cá trám', 'bồ câu xám'],
  chín: ['trái mít chín', 'ngồi nín thinh'],
  mười: ['tươi cười', 'mười phân vẹn mười'],
  mươi: ['tươi cười', 'chục người vui'],
  không: ['ông không'],
}

const OPENERS = ['Ra con gì đây?', 'Lắc lắc lắc… ra con số mấy?', 'Bà con cô bác nghe đây!', 'Cờ ra con mấy?', 'Con gì đây, con gì đây?']

/** Băm chuỗi ra số (ổn định giữa các máy). */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Câu gọi số `n` (rao lô tô hoặc đọc thường), chọn ổn định theo `seed`. */
export function lotoCallText(n: number, seed: string, rhyme: boolean): string {
  if (!rhyme) return `Số ${fullReading(n)}`
  const read = lotoReading(n)
  const last = read.split(' ').at(-1)!
  const h = hash(`${seed}:${n}`)
  const opener = OPENERS[h % OPENERS.length]
  const bank = RHYMES[last] ?? []
  const nick = bank.length ? bank[Math.floor(h / 7) % bank.length] : ''
  const cap = read[0].toUpperCase() + read.slice(1)
  return nick ? `${opener} ${cap}! ${cap} ${nick}!` : `${opener} ${cap}!`
}
