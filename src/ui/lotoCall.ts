/**
 * Câu gọi số lô tô cho giọng đọc.
 * - Đọc thường: "Số bốn mươi sáu".
 * - Kêu lô tô (theo cách kêu ở hội chợ / gánh lô tô miền Nam): câu mở đầu "…cờ ra mà con mấy, con mấy gì đây",
 *   hát một câu có chữ cuối đồng âm / cùng vần với con số, rồi chốt "là con số …".
 *   Người kêu thật ứng tác câu hát tại chỗ (ca dao, dân ca, cả bài hát hiện đại); ở đây chỉ dùng ca dao / tục ngữ
 *   dân gian quen thuộc, chọn theo vần của tiếng cuối con số — đủ cả 90 số.
 * Câu mở đầu chọn theo `seed` (mã ván) + số; câu hát cố định theo con số → mọi máy trong phòng đọc cùng một câu.
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
const OPENERS = ['Lẳng lặng mà nghe tôi kêu con cờ ra, cờ ra mà con mấy, con mấy gì đây…', 'Con mấy gì đây, con mấy gì đây, cờ ra con mấy…']

/**
 * Ca dao / tục ngữ có chữ cuối đồng âm hoặc cùng vần với tiếng cuối của con số (luật kêu lô tô).
 * Khóa = tiếng cuối khi đọc số kiểu lô tô.
 */
const FOLK: Record<string, string[]> = {
  một: ['Thương cho roi cho vọt'],
  mốt: ['Thương cho roi cho vọt'],
  hai: [
    'Thân em như tấm lụa đào, phất phơ giữa chợ biết vào tay ai',
    'Tháng hai trồng đậu, trồng khoai',
    'Ai ơi giữ chí cho bền, dù ai xoay hướng đổi nền mặc ai',
  ],
  ba: ['Bao giờ cho đến tháng ba', 'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra'],
  bốn: ['Đi một ngày đàng học một sàng khôn', 'Cái khó ló cái khôn'],
  tư: ['Nhất tự vi sư, bán tự vi sư'],
  năm: ['Lấy nhau chẳng đặng, thương hoài ngàn năm', 'Tháng tư đi tậu trâu bò, để ta sắp sửa làm mùa tháng năm'],
  lăm: ['Lấy nhau chẳng đặng, thương hoài ngàn năm', 'Ai ơi chớ lấy học trò, dài lưng tốn vải ăn no lại nằm'],
  sáu: ['Chiều chiều ra đứng ngõ sau'],
  bảy: ['Gió đưa cây cải về trời, rau răm ở lại chịu lời đắng cay', 'Ăn quả nhớ kẻ trồng cây'],
  tám: ['Tham thì thâm'],
  chín: ['Một lần bất tín, vạn lần bất tin', 'Có công mài sắt có ngày nên kim'],
  mười: ['Tốt gỗ hơn tốt nước sơn, xấu người đẹp nết còn hơn đẹp người'],
  mươi: ['Tốt gỗ hơn tốt nước sơn, xấu người đẹp nết còn hơn đẹp người'],
}

/** Câu kêu riêng quen thuộc của vài con số (thay cho câu chốt chung). */
const SPECIAL: Record<number, string> = {
  1: 'Đứng đầu lô tô là con số một!',
  5: 'Lấy nhau chẳng đặng, thương hoài ngàn năm… Số năm là con số năm!',
}

/** Băm chuỗi ra số (ổn định giữa các máy). */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Câu hát dân gian cho con số `n` (cố định theo số; số cùng vần thì lần lượt các câu trong vần đó). */
export function folkLine(n: number): string {
  const last = lotoReading(n).split(' ').at(-1)!
  const bank = FOLK[last]
  return bank[Math.floor(n / 10) % bank.length]
}

/** Câu gọi số `n` (kêu lô tô hoặc đọc thường), câu mở đầu chọn ổn định theo `seed`. */
export function lotoCallText(n: number, seed: string, rhyme: boolean): string {
  if (!rhyme) return `Số ${fullReading(n)}`
  const opener = OPENERS[hash(`${seed}:${n}`) % OPENERS.length]
  if (SPECIAL[n]) return `${opener} ${SPECIAL[n]}`
  const read = lotoReading(n)
  const cap = read[0].toUpperCase() + read.slice(1)
  return `${opener} ${folkLine(n)}… là con số ${read}! ${cap}!`
}
