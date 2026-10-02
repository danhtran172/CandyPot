import type { ID } from '../types'
import { cardLabel, rankOf, shuffled, type Card } from './tienlenPlay'

/**
 * Xì dách đánh bằng bài trong app. Lá bài dùng chung cách đánh số với Tiến lên (0..51, xem tienlenPlay).
 *
 * Luật (bản phổ biến):
 * - Mỗi người 2 lá, cái 2 lá. Xì bàn (2 lá A) > Xì dách (A + 10/J/Q/K) > Ngũ linh (5 lá ≤ 21) > điểm thường.
 * - Điểm: 2–10 theo số, J/Q/K = 10, A = 1 hoặc 11 (tự lấy cách có lợi, không quá 21).
 * - Con phải đủ 16 điểm, cái đủ 15 — thiếu là "non"; quá 21 là "quắc". Tối đa 5 lá.
 *   Con non / quắc mà cái cũng non / quắc thì hòa.
 * - Vừa chia xong: cái có xì bàn / xì dách thì lật luôn, xét cả bàn; con có xì bàn / xì dách thì lật, ăn luôn.
 * - Con lần lượt rút / dằn; xong hết tới cái. Cái đủ tuổi thì xét từng người (rút thêm xen giữa được), hoặc xét tất.
 *   Cái quắc hoặc đủ 5 lá thì tự xét tất.
 * - Thắng thua theo cược của con; xì bàn ăn ×3, xì dách / ngũ linh ×2 (theo bài của bên thắng).
 */

export type HandKind = 'xiban' | 'xidach' | 'ngulinh' | 'points' | 'quac'

export interface HandScore {
  kind: HandKind
  /** Điểm (A tính 1 hoặc 11 cho có lợi). */
  points: number
}

export interface XidachResult {
  /** Theo phía con: thắng / thua / hòa với cái. */
  outcome: 'win' | 'lose' | 'draw'
  /** Hệ số nhân cược (×1, ×2, ×3). */
  mult: number
  /** Lý do ngắn, vd "Xì dách", "19 > 17", "Quắc". */
  note: string
}

export interface XidachCards {
  /** Bộ bài còn lại giữa bàn (rút từ cuối). */
  deck: Card[]
  hands: Record<ID, Card[]>
  dealer: ID
  /** Thứ tự các con (không gồm cái), theo vòng quanh bàn. */
  order: ID[]
  /** Đang tới lượt ai rút: một con, hoặc cái (= dealer); null = xong ván. */
  turn: ID | null
  /** Các con đã dằn (không rút nữa). */
  stood: ID[]
  /** Kết quả các con đã được xét (bài đã lật cho cả bàn xem). */
  settled: Record<ID, XidachResult>
  /** Bài cái đã lật cho cả bàn (sau lần xét đầu tiên). */
  dealerShown: boolean
  /** Số nước đã đi — nhận diện lượt cho đồng hồ đếm giờ. */
  step: number
}

/** Con đủ 16, cái đủ 15 mới được dằn / xét không bị non. */
export const PLAYER_MIN = 16
export const DEALER_MIN = 15
export const MAX_CARDS = 5

export const KIND_LABEL: Record<HandKind, string> = {
  xiban: 'Xì bàn',
  xidach: 'Xì dách',
  ngulinh: 'Ngũ linh',
  points: 'Điểm',
  quac: 'Quắc',
}

/** Giá trị một lá (A = 1; cộng thêm 10 ở `score` nếu có lợi). */
function valueOf(c: Card): number {
  const label = cardLabel(c).slice(0, -1)
  if (label === 'A') return 1
  if (label === 'J' || label === 'Q' || label === 'K') return 10
  return Number(label)
}
const isAce = (c: Card) => rankOf(c) === 11
const isTen = (c: Card) => valueOf(c) === 10

export function score(cards: Card[]): HandScore {
  const base = cards.reduce((s, c) => s + valueOf(c), 0)
  const points = cards.some(isAce) && base + 10 <= 21 ? base + 10 : base
  if (cards.length === 2 && cards.every(isAce)) return { kind: 'xiban', points: 21 }
  if (cards.length === 2 && cards.some(isAce) && cards.some(isTen)) return { kind: 'xidach', points: 21 }
  if (points > 21) return { kind: 'quac', points }
  if (cards.length === MAX_CARDS) return { kind: 'ngulinh', points }
  return { kind: 'points', points }
}

/** Mô tả ngắn một tay bài: "Xì dách", "Quắc 24", "15 · non", "19". */
export function describe(cards: Card[], dealer = false): string {
  const s = score(cards)
  if (s.kind === 'points') return s.points < (dealer ? DEALER_MIN : PLAYER_MIN) ? `${s.points} · non` : `${s.points}`
  if (s.kind === 'quac') return `Quắc ${s.points}`
  if (s.kind === 'ngulinh') return `Ngũ linh ${s.points}`
  return KIND_LABEL[s.kind]
}

const OUTCOME: Record<XidachResult['outcome'], string> = { win: 'Thắng', lose: 'Thua', draw: 'Hòa' }
/** Dòng kết quả ngắn: "Thắng ×2 · Xì dách". */
export function resultText(r: XidachResult): string {
  return `${OUTCOME[r.outcome]}${r.outcome !== 'draw' && r.mult > 1 ? ` ×${r.mult}` : ''} · ${r.note}`
}

const RANK: Record<HandKind, number> = { xiban: 5, xidach: 4, ngulinh: 3, points: 2, quac: 0 }
const MULT: Record<HandKind, number> = { xiban: 3, xidach: 2, ngulinh: 2, points: 1, quac: 1 }
const special = (s: HandScore) => s.kind === 'xiban' || s.kind === 'xidach'

/** So bài một con với cái (kết quả theo phía con). */
export function compare(player: Card[], dealer: Card[]): XidachResult {
  const p = score(player)
  const d = score(dealer)
  const pNon = p.kind === 'points' && p.points < PLAYER_MIN
  const dNon = d.kind === 'points' && d.points < DEALER_MIN
  const dBad = d.kind === 'quac' || dNon
  // Con quắc: cái cũng quắc hoặc cái non thì hòa, còn lại con thua
  if (p.kind === 'quac')
    return dBad
      ? { outcome: 'draw', mult: 1, note: d.kind === 'quac' ? 'Cùng quắc' : 'Quắc · cái non' }
      : { outcome: 'lose', mult: 1, note: 'Quắc' }
  if (pNon) return dBad ? { outcome: 'draw', mult: 1, note: 'Cùng non / cái quắc' } : { outcome: 'lose', mult: 1, note: 'Non' }
  // Xì bàn / xì dách thắng bài thường bất kể cái còn non (vừa chia xong cái chưa rút)
  if (dBad && !special(p)) return { outcome: 'win', mult: MULT[p.kind], note: d.kind === 'quac' ? 'Cái quắc' : 'Cái non' }
  if (RANK[p.kind] !== RANK[d.kind]) {
    const win = RANK[p.kind] > RANK[d.kind]
    const top = win ? p : d
    return {
      outcome: win ? 'win' : 'lose',
      mult: MULT[top.kind],
      note: top.kind === 'points' ? `${p.points} vs ${d.points}` : KIND_LABEL[top.kind],
    }
  }
  if (p.kind !== 'points' && p.kind !== 'ngulinh') return { outcome: 'draw', mult: 1, note: `Cùng ${KIND_LABEL[p.kind]}` }
  if (p.kind === 'ngulinh') {
    // Ngũ linh cùng có: điểm thấp hơn thắng
    if (p.points === d.points) return { outcome: 'draw', mult: 1, note: 'Cùng ngũ linh' }
    return { outcome: p.points < d.points ? 'win' : 'lose', mult: 2, note: 'Ngũ linh' }
  }
  if (p.points === d.points) return { outcome: 'draw', mult: 1, note: `Cùng ${p.points}` }
  return { outcome: p.points > d.points ? 'win' : 'lose', mult: 1, note: `${p.points} vs ${d.points}` }
}

const unsettled = (s: XidachCards) => s.order.filter((id) => !s.settled[id])

/** Sau một nước của con: tới con kế (chưa dằn, chưa xét), hết thì tới cái. */
function nextTurn(s: XidachCards): XidachCards {
  const next = s.order.find((id) => !s.settled[id] && !s.stood.includes(id))
  if (next) return { ...s, turn: next }
  return { ...s, turn: unsettled(s).length ? s.dealer : null }
}

/** Chia 2 lá mỗi người (theo vòng: con trước, cái cuối), rồi xử lý xì bàn / xì dách ngay. */
export function dealXidach(players: ID[], dealer: ID, deck: Card[] = shuffled()): XidachCards {
  // Các con theo vòng quanh bàn, bắt đầu từ người ngồi ngay sau cái (chiều kim đồng hồ)
  const at = players.indexOf(dealer)
  const order = (at < 0 ? players : [...players.slice(at + 1), ...players.slice(0, at)]).filter((p) => p !== dealer)
  const seats = [...order, dealer]
  const d = [...deck]
  const hands: Record<ID, Card[]> = Object.fromEntries(seats.map((id) => [id, [] as Card[]]))
  for (let k = 0; k < 2; k++) for (const id of seats) hands[id].push(d.pop()!)
  let s: XidachCards = { deck: d, hands, dealer, order, turn: null, stood: [], settled: {}, dealerShown: false, step: 0 }
  if (special(score(hands[dealer]))) {
    // Cái có xì bàn / xì dách: lật luôn, xét cả bàn
    const settled = Object.fromEntries(order.map((id) => [id, compare(hands[id], hands[dealer])]))
    return { ...s, settled, dealerShown: true }
  }
  const settled: Record<ID, XidachResult> = {}
  for (const id of order) if (special(score(hands[id]))) settled[id] = compare(hands[id], hands[dealer])
  s = { ...s, settled }
  return nextTurn(s)
}

/** Rút một lá từ bộ giữa bàn. */
export function draw(s: XidachCards, id: ID): XidachCards | string {
  if (s.turn !== id) return 'Chưa tới lượt bạn.'
  const hand = s.hands[id] ?? []
  if (hand.length >= MAX_CARDS) return 'Đã đủ 5 lá.'
  if (!s.deck.length) return 'Hết bài.'
  const deck = s.deck.slice(0, -1)
  const next: XidachCards = { ...s, deck, hands: { ...s.hands, [id]: [...hand, s.deck[s.deck.length - 1]] }, step: s.step + 1 }
  if (id === s.dealer) {
    const sc = score(next.hands[id])
    // Cái quắc hoặc đủ 5 lá: tự xét tất
    return sc.kind === 'quac' || next.hands[id].length >= MAX_CARDS ? checkAll(next, id) : next
  }
  // Con đủ 5 lá thì tự dằn
  return next.hands[id].length >= MAX_CARDS ? stand(next, id) : next
}

/** Con dằn (không rút nữa). Cái "dằn" = xét tất. */
export function stand(s: XidachCards, id: ID): XidachCards | string {
  if (s.turn !== id) return 'Chưa tới lượt bạn.'
  if (id === s.dealer) return checkAll(s, id)
  return nextTurn({ ...s, stood: [...s.stood, id], step: s.step + 1 })
}

/** Cái xét một con: lật bài hai bên, tính thắng thua. Cái phải đủ tuổi (≥ 15) mới xét lẻ được. */
export function check(s: XidachCards, by: ID, target: ID): XidachCards | string {
  if (by !== s.dealer) return 'Chỉ cái mới được xét.'
  if (s.turn !== s.dealer) return 'Chưa tới lượt cái — đợi các con rút xong.'
  if (!s.order.includes(target)) return 'Người này không chơi ván này.'
  if (s.settled[target]) return 'Đã xét người này rồi.'
  const d = score(s.hands[s.dealer])
  if (d.kind === 'points' && d.points < DEALER_MIN) return `Cái chưa đủ ${DEALER_MIN} — rút thêm, hoặc Xét tất (chịu non).`
  const settled = { ...s.settled, [target]: compare(s.hands[target], s.hands[s.dealer]) }
  const next = { ...s, settled, dealerShown: true, step: s.step + 1 }
  return unsettled(next).length ? next : { ...next, turn: null }
}

/** Cái xét tất cả những con còn lại. */
export function checkAll(s: XidachCards, by: ID): XidachCards | string {
  if (by !== s.dealer) return 'Chỉ cái mới được xét.'
  if (s.turn !== s.dealer) return 'Chưa tới lượt cái — đợi các con rút xong.'
  const settled = { ...s.settled }
  for (const id of unsettled(s)) settled[id] = compare(s.hands[id], s.hands[s.dealer])
  return { ...s, settled, dealerShown: true, turn: null, step: s.step + 1 }
}

/** Hết giờ: con thì dằn, cái thì xét tất. */
export function autoXidach(s: XidachCards, id: ID): XidachCards | string {
  return id === s.dealer ? checkAll(s, id) : stand(s, id)
}

/** Kẹo phải trả cho các kết quả mới (chưa có trong `before`). Thắng: cái trả con; thua: con trả cái. */
export function newPayouts(
  before: XidachCards | undefined,
  after: XidachCards,
  stakes: Record<ID, number>,
): { from: ID; to: ID; amount: number; label: string }[] {
  const out: { from: ID; to: ID; amount: number; label: string }[] = []
  for (const [id, r] of Object.entries(after.settled)) {
    if (before?.settled[id] || r.outcome === 'draw') continue
    const amount = (stakes[id] ?? 0) * r.mult
    if (amount <= 0) continue
    const label = `Bài: ${r.note}${r.mult > 1 ? ` ×${r.mult}` : ''}`
    out.push(r.outcome === 'win' ? { from: after.dealer, to: id, amount, label } : { from: id, to: after.dealer, amount, label })
  }
  return out
}
