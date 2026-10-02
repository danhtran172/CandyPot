/**
 * Câu gọi số lô tô cho giọng đọc.
 * - Kêu lô tô: một câu vần ngắn theo tiếng cuối của số — "Tham thì thâm, con ba lăm!", "Ba ba con cá tra!".
 * - Đọc thường: "Số ba mươi lăm".
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

/**
 * Câu kêu ngắn theo vần tiếng cuối của số: "Tham thì thâm, con ba lăm!", "Ba ba con cá tra!".
 * `{n}` = số đọc kiểu lô tô. Khóa = tiếng cuối.
 */
const TAGS: Record<string, string[]> = {
  một: ['Thương cho roi cho vọt, con {n}', '{n} củ cà rốt'],
  mốt: ['{n} củ cà rốt', 'Thương cho roi cho vọt, con {n}', '{n} cây cột'],
  hai: ['{n} củ khoai', 'Biết vào tay ai, con {n}', '{n} trái xoài'],
  ba: ['{n} con cá tra', '{n} con gà', 'Đi đâu cũng nhớ nhà, con {n}'],
  bốn: ['Cái khó ló cái khôn, con {n}', '{n} con chồn'],
  tư: ['{n} cô Tư', 'Lừ đừ, con {n}'],
  năm: ['Thương hoài ngàn năm, con {n}', '{n} rau răm'],
  lăm: ['Tham thì thâm, con {n}', '{n} rau răm', 'Ăn no lại nằm, con {n}'],
  sáu: ['{n} ông táo', '{n} con sáo', 'Ra đứng ngõ sau, con {n}'],
  bảy: ['{n} máy bay', 'Đắng cay, con {n}', 'Nhảy dây, con {n}'],
  tám: ['{n} cá trám', 'Tham thì thâm, con {n}', '{n} trái cam'],
  chín: ['Mài sắt nên kim, con {n}', 'Nín thinh, con {n}'],
  mười: ['Tươi cười, con {n}'],
  mươi: ['Tươi cười, con {n}', 'Xấu người đẹp nết, con {n}'],
}

/** Câu kêu ngắn cho số `n` (cố định theo số; số cùng vần thì lần lượt các câu trong vần đó). */
export function lotoTag(n: number): string {
  if (n === 1) return 'Đứng đầu lô tô, con số một!'
  const read = lotoReading(n)
  const bank = TAGS[read.split(' ').at(-1)!]
  const line = bank[Math.floor(n / 10) % bank.length].replace('{n}', read)
  return `${line[0].toUpperCase()}${line.slice(1)}!`
}

/** Câu gọi số `n`: kêu lô tô ngắn ("Tham thì thâm, con ba lăm!") hoặc đọc thường ("Số ba mươi lăm"). */
export function lotoCallText(n: number, short: boolean): string {
  return short ? lotoTag(n) : `Số ${fullReading(n)}`
}
