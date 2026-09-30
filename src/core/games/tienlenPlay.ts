import type { ID } from '../types'

/**
 * Tiến lên đánh bằng bài trong app. Lá bài = số 0..51: hạng × 4 + chất.
 * Hạng 0..12 = 3 4 5 6 7 8 9 10 J Q K A 2; chất 0..3 = ♠ ♣ ♦ ♥ (bé → lớn). Số càng lớn lá càng to.
 */
export type Card = number

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
export const SUITS = ['♠', '♣', '♦', '♥']
export const rankOf = (c: Card) => Math.floor(c / 4)
export const suitOf = (c: Card) => c % 4
export const isRed = (c: Card) => suitOf(c) >= 2
export const cardLabel = (c: Card) => `${RANKS[rankOf(c)]}${SUITS[suitOf(c)]}`
/** Hạng của lá 2 (heo). */
const TWO = 12
/** 3♠ — ván đầu ai cầm lá này đi trước và phải đánh kèm nó. */
export const THREE_SPADES: Card = 0

export interface TienlenCards {
  /** Bài trên tay từng người (đã xếp). */
  hands: Record<ID, Card[]>
  /** Thứ tự lượt (vòng quanh bàn). */
  order: ID[]
  /** Người đang tới lượt; null = ván bài đã xong. */
  turn: ID | null
  /** Bộ đang nằm trên bàn (người phải chặn); null = vòng mới, đánh gì cũng được. */
  table: { by: ID; cards: Card[] } | null
  /** Người đã bỏ lượt trong vòng này (không được đánh lại tới khi hết vòng). */
  passed: ID[]
  /** Thứ tự về: Nhất, Nhì, … */
  finished: ID[]
  /** Ván đầu: nước đầu tiên phải có 3♠. */
  mustOpen?: boolean
}

export type ComboType = 'single' | 'pair' | 'triple' | 'quad' | 'straight' | 'pairs'
export interface Combo {
  type: ComboType
  /** Số lá (sảnh) / số đôi (đôi thông). */
  size: number
  /** Lá to nhất — so bộ cùng loại. */
  top: Card
}

export const COMBO_LABEL: Record<ComboType, string> = {
  single: 'Rác',
  pair: 'Đôi',
  triple: 'Sám',
  quad: 'Tứ quý',
  straight: 'Sảnh',
  pairs: 'Đôi thông',
}

export function comboOf(cards: Card[]): Combo | null {
  const cs = [...cards].sort((a, b) => a - b)
  const n = cs.length
  if (!n) return null
  const top = cs[n - 1]
  const ranks = cs.map(rankOf)
  const same = ranks.every((r) => r === ranks[0])
  if (same && n <= 4) return { type: (['single', 'pair', 'triple', 'quad'] as const)[n - 1], size: n, top }
  // Sảnh: ≥ 3 lá liên tiếp, không có 2
  if (n >= 3 && !ranks.includes(TWO) && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1))
    return { type: 'straight', size: n, top }
  // Đôi thông: ≥ 3 đôi liên tiếp, không có 2
  if (n >= 6 && n % 2 === 0 && !ranks.includes(TWO)) {
    const ok = ranks.every((r, i) => (i % 2 ? r === ranks[i - 1] : i === 0 || r === ranks[i - 1] + 1))
    if (ok) return { type: 'pairs', size: n / 2, top }
  }
  return null
}

/** `next` có chặn được `prev` không (kể cả chặt heo / chặt hàng). */
export function beats(prev: Combo, next: Combo): boolean {
  if (prev.type === next.type && prev.size === next.size) return next.top > prev.top
  const prevTwo = rankOf(prev.top) === TWO
  if (prev.type === 'single' && prevTwo) return next.type === 'quad' || next.type === 'pairs'
  if (prev.type === 'pair' && prevTwo) return next.type === 'quad' || (next.type === 'pairs' && next.size >= 4)
  if (prev.type === 'pairs' && prev.size === 3) return next.type === 'quad' || (next.type === 'pairs' && next.size >= 4)
  if (prev.type === 'quad') return next.type === 'pairs' && next.size >= 4
  if (prev.type === 'pairs' && next.type === 'pairs') return next.size > prev.size
  return false
}

export function shuffled(rand: () => number = Math.random): Card[] {
  const deck = Array.from({ length: 52 }, (_, i) => i)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/**
 * Chia 13 lá mỗi người. Người đi trước: người về Nhất ván trước (nếu còn chơi),
 * không thì người cầm lá nhỏ nhất (ván đầu: 3♠, phải đánh kèm 3♠).
 */
export function deal(order: ID[], deck: Card[], prevWinner?: ID): TienlenCards {
  const hands: Record<ID, Card[]> = {}
  order.forEach((id, i) => (hands[id] = deck.slice(i * 13, i * 13 + 13).sort((a, b) => a - b)))
  const lowest = order.reduce((best, id) => (hands[id][0] < hands[best][0] ? id : best), order[0])
  const first = !prevWinner
  const turn = prevWinner && order.includes(prevWinner) ? prevWinner : lowest
  return {
    hands,
    order,
    turn,
    table: null,
    passed: [],
    finished: [],
    ...(first && hands[turn][0] === THREE_SPADES && { mustOpen: true }),
  }
}

const live = (s: TienlenCards) => s.order.filter((id) => !s.finished.includes(id))

/** Người kế tiếp sau `id` (vòng quanh bàn) thỏa `ok`. */
function nextAfter(s: TienlenCards, id: ID, ok: (p: ID) => boolean): ID | null {
  const i = s.order.indexOf(id)
  for (let k = 1; k <= s.order.length; k++) {
    const p = s.order[(i + k) % s.order.length]
    if (ok(p)) return p
  }
  return null
}

/** Sau một nước (đánh / bỏ lượt): xong ván, hết vòng, hay tới người kế. */
function advance(s: TienlenCards, from: ID): TienlenCards {
  const alive = live(s)
  if (alive.length <= 1) return { ...s, finished: [...s.finished, ...alive], turn: null, table: null, passed: [] }
  const by = s.table?.by
  const next = nextAfter(s, from, (p) => !s.finished.includes(p) && !s.passed.includes(p) && p !== by)
  if (next) return { ...s, turn: next }
  // Không còn ai chặn → hết vòng: người đánh cuối đi tiếp (đã về thì người kế sau họ)
  const lead = by && !s.finished.includes(by) ? by : nextAfter(s, by ?? from, (p) => !s.finished.includes(p))
  return { ...s, table: null, passed: [], turn: lead }
}

export function play(s: TienlenCards, id: ID, cards: Card[]): TienlenCards | string {
  if (s.turn !== id) return 'Chưa tới lượt.'
  const hand = s.hands[id] ?? []
  if (!cards.length || !cards.every((c) => hand.includes(c)) || new Set(cards).size !== cards.length) return 'Chọn lá bài trên tay.'
  const combo = comboOf(cards)
  if (!combo) return 'Bộ bài không hợp lệ (rác, đôi, sám, tứ quý, sảnh, đôi thông).'
  if (s.mustOpen && !cards.includes(THREE_SPADES)) return 'Ván đầu: nước đầu tiên phải có 3♠.'
  if (s.table) {
    const prev = comboOf(s.table.cards)!
    if (!beats(prev, combo)) return `Không chặn được ${COMBO_LABEL[prev.type]} trên bàn.`
  }
  const left = hand.filter((c) => !cards.includes(c))
  const next: TienlenCards = {
    ...s,
    hands: { ...s.hands, [id]: left },
    table: { by: id, cards: [...cards].sort((a, b) => a - b) },
    finished: left.length ? s.finished : [...s.finished, id],
    mustOpen: undefined,
  }
  delete next.mustOpen
  return advance(next, id)
}

export function pass(s: TienlenCards, id: ID): TienlenCards | string {
  if (s.turn !== id) return 'Chưa tới lượt.'
  if (!s.table) return 'Vòng mới — bạn phải đánh.'
  return advance({ ...s, passed: [...s.passed, id] }, id)
}

/** Hạng từng người khi ván bài xong. */
export const PLACE_LABEL = ['Nhất', 'Nhì', 'Ba', 'Bét']
export function placeOf(s: TienlenCards, id: ID): string | undefined {
  const i = s.finished.indexOf(id)
  if (i < 0) return undefined
  return i === s.order.length - 1 ? 'Bét' : PLACE_LABEL[i]
}

/** Trả kẹo theo hạng: Bét trả Nhất `bet`; 4 người thì Ba trả Nhì `bet2`. */
export function payouts(s: TienlenCards, bet: number, bet2: number): { from: ID; to: ID; amount: number; label: string }[] {
  const f = s.finished
  if (s.turn !== null || f.length < 2) return []
  const out = [{ from: f[f.length - 1], to: f[0], amount: bet, label: 'Nhất' }]
  if (f.length >= 4) out.push({ from: f[2], to: f[1], amount: bet2, label: 'Nhì' })
  return out
}
