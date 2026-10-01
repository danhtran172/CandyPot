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
  /** Số nước đã đi (tăng mỗi lần đánh / bỏ lượt) — nhận diện lượt hiện tại cho đồng hồ đếm giờ. */
  step?: number
}

/** Mỗi lượt có bấy nhiêu giây; hết giờ tự bỏ lượt (vòng mới thì tự đánh lá nhỏ nhất). */
export const TURN_SECONDS = 40

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
function advance(prev: TienlenCards, from: ID): TienlenCards {
  const s = { ...prev, step: (prev.step ?? 0) + 1 }
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

/** Hết giờ: đang phải chặn thì bỏ lượt; vòng mới thì đánh lá nhỏ nhất (ván đầu đó là 3♠). */
export function autoMove(s: TienlenCards, id: ID): TienlenCards | string {
  if (s.turn !== id) return 'Chưa tới lượt.'
  if (s.table) return pass(s, id)
  const hand = s.hands[id] ?? []
  if (!hand.length) return 'Hết bài.'
  return play(s, id, [hand[0]])
}

/**
 * Chạm một lá khi đang phải chặn: tự chọn bộ nhỏ nhất có lá đó chặn được bàn
 * (cùng loại trước, không có thì hàng chặt heo). Vòng mới hoặc không có bộ nào → null.
 */
export function suggestWith(hand: Card[], table: Card[] | null, card: Card, mustOpen = false): Card[] | null {
  const prev = table ? comboOf(table) : null
  if (!prev || !hand.includes(card)) return null
  const byRank: Card[][] = Array.from({ length: 13 }, () => [])
  for (const c of [...hand].sort((a, b) => a - b)) byRank[rankOf(c)].push(c)
  const r = rankOf(card)
  const wants: { type: ComboType; size: number }[] = [{ type: prev.type, size: prev.size }]
  if (prev.type !== 'quad') wants.push({ type: 'quad', size: 4 })
  for (const n of [3, 4, 5, 6]) if (prev.type !== 'pairs' || prev.size !== n) wants.push({ type: 'pairs', size: n })
  /** Mọi cách lấy k lá từ list. */
  const choose = (list: Card[], k: number): Card[][] =>
    k === 0 ? [[]] : list.flatMap((c, i) => choose(list.slice(i + 1), k - 1).map((rest) => [c, ...rest]))
  /** Ứng viên bộ chứa `card`, mỗi hạng lấy `per` lá: hạng thường lấy lá nhỏ nhất, hạng cao nhất thử mọi cách (để vừa đủ chặn). */
  const build = (ranks: number[], per: number): Card[][] => {
    const top = ranks[ranks.length - 1]
    let acc: Card[][] = [[]]
    for (const rank of ranks) {
      const all = byRank[rank]
      const others = rank === r ? all.filter((c) => c !== card) : all
      const need = rank === r ? per - 1 : per
      if (others.length < need) return []
      const opts = (rank === top ? choose(others, need) : [others.slice(0, need)]).map((o) => (rank === r ? [card, ...o] : o))
      acc = acc.flatMap((x) => opts.map((o) => [...x, ...o]))
    }
    return acc
  }
  let best: { cards: Card[]; pri: number; top: Card } | null = null
  wants.forEach(({ type, size }, pri) => {
    const windows: { ranks: number[]; per: number }[] = []
    if (type === 'single' || type === 'pair' || type === 'triple' || type === 'quad') windows.push({ ranks: [r], per: size })
    else if (r < TWO)
      for (let a = Math.max(0, r - size + 1); a <= r && a + size - 1 < TWO; a++)
        windows.push({ ranks: Array.from({ length: size }, (_, i) => a + i), per: type === 'pairs' ? 2 : 1 })
    for (const w of windows)
      for (const cards of build(w.ranks, w.per)) {
        const combo = comboOf(cards)
        if (!combo || combo.type !== type || !cards.includes(card)) continue
        if (mustOpen && !cards.includes(THREE_SPADES)) continue
        if (!beats(prev, combo)) continue
        if (!best || pri < best.pri || (pri === best.pri && combo.top < best.top)) best = { cards, pri, top: combo.top }
      }
  })
  return best ? (best as { cards: Card[] }).cards.sort((a, b) => a - b) : null
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

/**
 * Các lá trên tay dùng được ở nước này: nằm trong ít nhất một bộ hợp lệ chặn được bộ trên bàn
 * (vòng mới: bộ nào cũng được; ván đầu: bộ phải có 3♠).
 */
export function playableCards(hand: Card[], table: Card[] | null, mustOpen = false): Set<Card> {
  const prev = table ? comboOf(table) : null
  const byRank: Card[][] = Array.from({ length: 13 }, () => [])
  for (const c of [...hand].sort((a, b) => a - b)) byRank[rankOf(c)].push(c)
  const maxOf = (r: number) => byRank[r][byRank[r].length - 1]
  const ok = (combo: Combo, withThree: boolean) => (!mustOpen || withThree) && (!prev || beats(prev, combo))
  const has3 = hand.includes(THREE_SPADES)
  const out = new Set<Card>()
  for (const c of hand) {
    const r = rankOf(c)
    const same = byRank[r]
    let usable = false
    // Rác / đôi / sám / tứ quý: lấy c cùng các lá to nhất cùng hạng
    for (let k = 1; k <= same.length && !usable; k++) {
      const top = k === 1 ? c : Math.max(c, same[same.length - 1] === c ? same[same.length - 2] : same[same.length - 1])
      const three = c === THREE_SPADES || (r === 0 && has3 && k > 1)
      usable = ok({ type: (['single', 'pair', 'triple', 'quad'] as const)[k - 1], size: k, top }, three)
    }
    // Sảnh / đôi thông: mọi đoạn hạng liên tiếp (không có 2) chứa hạng của c
    for (let a = 0; a <= r && !usable; a++)
      for (let b = Math.max(r, a + 2); b < TWO && !usable; b++) {
        const ranks = Array.from({ length: b - a + 1 }, (_, i) => a + i)
        const three = a === 0 && has3
        if (ranks.every((x) => byRank[x].length)) usable = ok({ type: 'straight', size: ranks.length, top: r === b ? c : maxOf(b) }, three)
        if (!usable && ranks.every((x) => byRank[x].length >= 2)) usable = ok({ type: 'pairs', size: ranks.length, top: maxOf(b) }, three)
      }
    if (usable) out.add(c)
  }
  return out
}

/** Cách xếp bài trên tay (chỉ đổi thứ tự hiển thị trên máy mình). */
export type HandSort = 'rank' | 'combo' | 'suit'
export const HAND_SORT_LABEL: Record<HandSort, string> = { rank: 'Theo số', combo: 'Theo bộ', suit: 'Theo chất' }

/**
 * Xếp lại bài trên tay.
 * - rank: nhỏ → lớn.
 * - suit: gom theo chất (♠ ♣ ♦ ♥), trong chất nhỏ → lớn.
 * - combo: tách sẵn thành bộ — rác bên trái, rồi đôi, sám, sảnh, đôi thông, tứ quý bên phải
 *   (lấy lần lượt tứ quý → đôi thông → sảnh dài nhất → sám → đôi, còn lại là rác).
 */
export function arrangeHand(hand: Card[], mode: HandSort): Card[] {
  const asc = [...hand].sort((a, b) => a - b)
  if (mode === 'rank') return asc
  if (mode === 'suit') return asc.sort((a, b) => suitOf(a) - suitOf(b) || a - b)
  let left = asc
  const byRank = () => {
    const m: Card[][] = Array.from({ length: 13 }, () => [])
    for (const c of left) m[rankOf(c)].push(c)
    return m
  }
  const take = (cs: Card[]) => {
    left = left.filter((c) => !cs.includes(c))
    return cs
  }
  /** Đoạn hạng liên tiếp dài nhất (không có 2) mà hạng nào cũng có ≥ per lá. */
  const longestRun = (per: number, min: number): number[] | null => {
    const m = byRank()
    let best: number[] | null = null
    let run: number[] = []
    for (let r = 0; r <= TWO; r++) {
      if (r < TWO && m[r].length >= per) run.push(r)
      else {
        if (run.length >= min && (!best || run.length > best.length)) best = run
        run = []
      }
    }
    return best
  }
  const quads: Card[][] = []
  const pairRuns: Card[][] = []
  const straights: Card[][] = []
  const triples: Card[][] = []
  const pairs: Card[][] = []
  for (const g of byRank()) if (g.length === 4) quads.push(take(g))
  for (let run = longestRun(2, 3); run; run = longestRun(2, 3)) {
    const m = byRank()
    pairRuns.push(take(run.flatMap((r) => m[r].slice(0, 2))))
  }
  for (let run = longestRun(1, 3); run; run = longestRun(1, 3)) {
    const m = byRank()
    // Hạng có đôi / sám thì lấy lá nhỏ nhất cho sảnh, để lại lá to
    straights.push(take(run.map((r) => m[r][0])))
  }
  for (const g of byRank()) {
    if (g.length === 3) triples.push(take(g))
    else if (g.length === 2) pairs.push(take(g))
  }
  return [...left, ...pairs.flat(), ...triples.flat(), ...straights.flat(), ...pairRuns.flat(), ...quads.flat()]
}
