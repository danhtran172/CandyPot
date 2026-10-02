import type { ID } from '../types'

/**
 * Uno đánh bằng bài trong app (chỉ chơi, không tính kẹo). Lá bài = số thứ tự trong `UNO_CARDS`.
 *
 * Bộ bài gốc 108 lá: 4 màu (đỏ, vàng, xanh lá, xanh dương), mỗi màu một lá 0, hai lá mỗi số 1–9,
 * hai lá Cấm (skip), Đổi chiều (reverse), +2; thêm 4 lá Đổi màu và 4 lá +4.
 * Bộ mở rộng (Uno Storm + lá Đập tay) thêm 26 lá: Lốc xoáy, Bỏ màu, Đập tay (mỗi màu một lá),
 * 7 Đổi bài (đỏ, vàng chuyền trái; xanh lá, xanh dương chuyền phải), 6 lá Khiên, 4 lá Leo số.
 *
 * Luật:
 * - Mỗi người 7 lá. Đánh lá cùng màu, cùng số hoặc cùng ký hiệu với lá trên cùng; lá đen (đổi màu) đánh lúc nào cũng được.
 * - Không đánh thì rút 1 lá: đánh được thì đánh luôn lá đó (hoặc bỏ lượt), không thì mất lượt.
 * - Cộng bài: +2 / +4 cộng dồn — +2 nối +2, +4 nối lên mọi lá cộng, +2 nối lên +4 khi đúng màu đang chọn.
 *   Đổi chiều cùng màu phản lá cộng về người vừa đánh; Khiên đẩy lá phạt sang người kế. Không đỡ thì rút hết số lá cộng.
 * - Còn 1 lá phải hô UNO; bị người khác bắt (chưa hô mà còn 1 lá) thì rút 2, bắt hớ thì người bắt rút 2.
 * - Ai hết bài trước thắng.
 */

export type Card = number
export type UnoColor = 'r' | 'y' | 'g' | 'b'
export type UnoKind = 'num' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4' | 'tornado' | 'discard' | 'seven' | 'shield' | 'up' | 'slap'

export interface UnoCardDef {
  kind: UnoKind
  /** null = lá đen (đổi màu). */
  color: UnoColor | null
  /** Lá số (và 7 Đổi bài = 7). */
  value?: number
  /** 7 Đổi bài: chuyền bài theo chiều nào (1 = trái / theo chiều kim đồng hồ, -1 = phải). */
  dir?: 1 | -1
}

export const UNO_COLORS: UnoColor[] = ['r', 'y', 'g', 'b']
export const COLOR_NAME: Record<UnoColor, string> = { r: 'Đỏ', y: 'Vàng', g: 'Xanh lá', b: 'Xanh dương' }

/** Số lá của bộ gốc — các lá từ số này trở đi là bộ mở rộng. */
export const BASE_COUNT = 108

function buildDeck(): UnoCardDef[] {
  const out: UnoCardDef[] = []
  for (const color of UNO_COLORS) {
    out.push({ kind: 'num', color, value: 0 })
    for (let v = 1; v <= 9; v++) out.push({ kind: 'num', color, value: v }, { kind: 'num', color, value: v })
    for (const kind of ['skip', 'reverse', 'draw2'] as const) out.push({ kind, color }, { kind, color })
  }
  for (let i = 0; i < 4; i++) out.push({ kind: 'wild', color: null })
  for (let i = 0; i < 4; i++) out.push({ kind: 'wild4', color: null })
  // Bộ mở rộng
  for (const color of UNO_COLORS) out.push({ kind: 'tornado', color }, { kind: 'discard', color }, { kind: 'slap', color })
  for (const color of UNO_COLORS) out.push({ kind: 'seven', color, value: 7, dir: color === 'r' || color === 'y' ? 1 : -1 })
  for (let i = 0; i < 6; i++) out.push({ kind: 'shield', color: null })
  for (let i = 0; i < 4; i++) out.push({ kind: 'up', color: null })
  return out
}

/** Toàn bộ lá Uno (gốc + mở rộng); lá bài = chỉ số trong mảng này. */
export const UNO_CARDS: readonly UnoCardDef[] = buildDeck()
export const cardOf = (c: Card) => UNO_CARDS[c]
export const isWild = (c: Card) => UNO_CARDS[c].color === null

/** Tên lá để đọc / hiện hướng dẫn. */
export const KIND_LABEL: Record<UnoKind, string> = {
  num: 'Số',
  skip: 'Cấm',
  reverse: 'Đổi chiều',
  draw2: '+2',
  wild: 'Đổi màu',
  wild4: '+4',
  tornado: 'Lốc xoáy',
  discard: 'Bỏ màu',
  seven: '7 Đổi bài',
  shield: 'Khiên',
  up: 'Leo số',
  slap: 'Đập tay',
}

export function cardName(c: Card): string {
  const d = UNO_CARDS[c]
  const base = d.kind === 'num' ? String(d.value) : KIND_LABEL[d.kind]
  return d.color ? `${base} ${COLOR_NAME[d.color]}` : base
}

/** Đòn đang chờ người tới lượt đỡ: rút cộng dồn, Lốc xoáy (rút tới khi ra màu), Leo số (đánh số ≥ `top`). */
export type UnoAttack =
  { kind: 'draw'; n: number; by: ID } | { kind: 'tornado'; color: UnoColor; by: ID } | { kind: 'up'; top: number; by: ID }

/** Sự kiện vừa xảy ra (báo cho cả bàn: toast, giọng đọc). `seq` tăng dần để nhận ra sự kiện mới. */
export type UnoEvent = { seq: number } & (
  | { kind: 'uno'; who: ID }
  | { kind: 'caught'; who: ID; by: ID }
  | { kind: 'false-catch'; who: ID; by: ID }
  | { kind: 'slap-lose'; who: ID[] }
  | { kind: 'penalty'; who: ID; n: number }
  | { kind: 'swap'; dir: 1 | -1 }
)

export interface UnoState {
  /** Xấp bài úp giữa bàn (rút từ cuối). */
  deck: Card[]
  /** Xấp bài đã đánh (lá trên cùng ở cuối). */
  discard: Card[]
  hands: Record<ID, Card[]>
  /** Thứ tự ngồi quanh bàn. */
  order: ID[]
  /** 1 = theo thứ tự ngồi (chiều kim đồng hồ), -1 = ngược lại. */
  dir: 1 | -1
  /** Người tới lượt; null = xong ván. */
  turn: ID | null
  /** Màu đang phải theo (lá đen thì là màu đã chọn). */
  color: UnoColor
  attack?: UnoAttack
  /** Vừa rút được lá đánh được: chỉ đánh lá này hoặc bỏ lượt. */
  drawn?: Card
  /** Những người đã hô UNO (còn ≤ 2 lá). */
  uno: ID[]
  /** Lá Đập tay: mọi người (trừ người đánh) đập vào bộ bài; người chậm nhất rút 2. */
  slap?: { id: number; by: ID; need: ID[]; tapped: ID[] }
  /** Lượt đập tay vừa xong: ai đã đập (theo thứ tự), ai chậm — hiện cạnh bộ bài tới nước đánh kế tiếp. */
  slapDone?: { tapped: ID[]; late: ID[] }
  winner?: ID
  /** Số nước đã đi (đánh / rút / bỏ lượt) — nhận diện lượt cho đồng hồ đếm giờ. */
  step: number
  /** Lá vừa đánh (kèm các lá bỏ theo của lá Bỏ màu) — hiện hướng dẫn lá đặc biệt. */
  last?: { by: ID; card: Card; extra?: Card[] }
  event?: UnoEvent
  seq: number
  /** Ván này có bộ mở rộng. */
  expansion: boolean
}

/** Đập tay: bấy nhiêu ms mà chưa đập thì bị tính chậm (rút 2). */
export const SLAP_MS = 5000
export const HAND_SIZE = 7

export function shuffled(cards: Card[], rand: () => number = Math.random): Card[] {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Số ngẫu nhiên theo hạt giống — xào lại xấp bài giữa ván ra cùng một kết quả trên mọi máy (và khi chạy lại trên phòng). */
function seeded(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Chia bài: mỗi người 7 lá, lật lá số đầu tiên làm lá mở màn (lá chức năng gặp trước thì nhét xuống đáy xấp).
 * `first` = người đi trước (người thắng ván trước nếu còn chơi), không có thì người ngồi đầu.
 */
export function dealUno(order: ID[], opts: { expansion: boolean; first?: ID }, rand: () => number = Math.random): UnoState {
  const all = UNO_CARDS.map((_, i) => i).filter((i) => opts.expansion || i < BASE_COUNT)
  const deck = shuffled(all, rand)
  const hands: Record<ID, Card[]> = {}
  for (const id of order) hands[id] = deck.splice(deck.length - HAND_SIZE, HAND_SIZE)
  let at = deck.length - 1
  while (at > 0 && UNO_CARDS[deck[at]].kind !== 'num') at--
  const [top] = deck.splice(at, 1)
  return {
    deck,
    discard: [top],
    hands,
    order,
    dir: 1,
    turn: opts.first && order.includes(opts.first) ? opts.first : order[0],
    color: UNO_CARDS[top].color!,
    uno: [],
    step: 0,
    seq: 0,
    expansion: opts.expansion,
  }
}

export const topCard = (s: UnoState) => s.discard[s.discard.length - 1]

/** Mặt lá để so "cùng số / cùng ký hiệu" (7 Đổi bài tính như số 7). Lá đen không có. */
function face(c: Card): string | null {
  const d = UNO_CARDS[c]
  if (d.color === null) return null
  return d.value !== undefined ? `n${d.value}` : d.kind
}

/** Đánh được lên bàn lúc bình thường (không bị đòn): lá đen, cùng màu, hay cùng số / ký hiệu. */
function matches(s: UnoState, c: Card): boolean {
  const d = UNO_CARDS[c]
  if (d.kind === 'slap' && s.slap) return false
  if (d.color === null || d.color === s.color) return true
  const f = face(c)
  return f !== null && f === face(topCard(s))
}

/** Đỡ được đòn đang chờ bằng lá này không. */
function counters(s: UnoState, c: Card): boolean {
  const a = s.attack
  const d = UNO_CARDS[c]
  if (!a) return false
  if (d.kind === 'shield') return true
  if (a.kind === 'draw') {
    if (d.kind === 'wild4') return true
    if (d.kind === 'draw2') return d.color === s.color || UNO_CARDS[topCard(s)].kind === 'draw2'
    return d.kind === 'reverse' && d.color === s.color
  }
  if (a.kind === 'up') return d.kind === 'num' && (d.value ?? 0) >= a.top
  return false
}

/** Các lá người này đánh được ngay bây giờ (chưa tới lượt / xong ván = không lá nào). */
export function playableCards(s: UnoState, id: ID): Card[] {
  if (s.winner || s.turn !== id) return []
  const hand = s.hands[id] ?? []
  if (s.attack) return hand.filter((c) => counters(s, c))
  if (s.drawn !== undefined) return hand.includes(s.drawn) && matches(s, s.drawn) ? [s.drawn] : []
  return hand.filter((c) => matches(s, c))
}

/** Người kế sau `from` theo chiều đang chơi (bước `k`). */
export function nextOf(s: Pick<UnoState, 'order' | 'dir'>, from: ID, k = 1, dir: 1 | -1 = s.dir): ID {
  const n = s.order.length
  const i = s.order.indexOf(from)
  return s.order[(((i + dir * k) % n) + n) % n]
}

const withEvent = (s: UnoState, e: DistributiveOmit<UnoEvent, 'seq'>): UnoState => ({
  ...s,
  seq: s.seq + 1,
  event: { ...e, seq: s.seq + 1 } as UnoEvent,
})
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

/** Bỏ khỏi danh sách đã hô UNO những người đã có lại hơn 2 lá. */
const tidyUno = (s: UnoState): UnoState => ({ ...s, uno: s.uno.filter((id) => (s.hands[id]?.length ?? 0) <= 2) })

/** Rút `n` lá cho một người; hết xấp thì xào lại xấp đã đánh (giữ lá trên cùng). */
function drawCards(s: UnoState, id: ID, n: number): { s: UnoState; got: Card[] } {
  let deck = s.deck
  let discard = s.discard
  const got: Card[] = []
  for (let i = 0; i < n; i++) {
    if (!deck.length) {
      if (discard.length <= 1) break
      deck = shuffled(discard.slice(0, -1), seeded(s.step * 7919 + discard.length * 31 + s.seq))
      discard = discard.slice(-1)
    }
    got.push(deck[deck.length - 1])
    deck = deck.slice(0, -1)
  }
  return { s: tidyUno({ ...s, deck, discard, hands: { ...s.hands, [id]: [...(s.hands[id] ?? []), ...got] } }), got }
}

/** Rút tới khi ra lá màu `color` (Lốc xoáy); hết bài thì thôi. */
function drawUntil(s: UnoState, id: ID, color: UnoColor): { s: UnoState; got: Card[] } {
  let cur = s
  const got: Card[] = []
  for (;;) {
    const r = drawCards(cur, id, 1)
    if (!r.got.length) break
    cur = r.s
    got.push(r.got[0])
    if (UNO_CARDS[r.got[0]].color === color) break
  }
  return { s: cur, got }
}

/** Sang lượt người kế (bỏ trạng thái "vừa rút"). */
function passTo(s: UnoState, to: ID): UnoState {
  const t = { ...s, turn: to, step: s.step + 1 }
  delete t.drawn
  return t
}

const running = (s: UnoState) => !s.winner && s.turn !== null

export function play(s: UnoState, id: ID, card: Card, color?: UnoColor): UnoState | string {
  if (!running(s)) return 'Ván đã xong.'
  if (s.turn !== id) return 'Chưa tới lượt bạn.'
  const hand = s.hands[id] ?? []
  if (!hand.includes(card)) return 'Lá này không có trên tay.'
  if (!playableCards(s, id).includes(card)) {
    if (s.attack?.kind === 'draw')
      return `Đang bị cộng ${s.attack.n} lá — chỉ đỡ bằng +2, +4, Đổi chiều cùng màu hoặc Khiên; không thì rút.`
    if (s.attack?.kind === 'tornado') return 'Lốc xoáy — chỉ Khiên đỡ được; không thì rút tới khi ra đúng màu.'
    if (s.attack?.kind === 'up') return `Leo số — đánh lá số từ ${s.attack.top} trở lên (hoặc Khiên); không thì rút.`
    if (s.drawn !== undefined) return 'Vừa rút — chỉ đánh được lá vừa rút, hoặc bỏ lượt.'
    if (UNO_CARDS[card].kind === 'slap' && s.slap) return 'Đang đập tay — chờ xong đã.'
    return 'Lá này không hợp màu / số / ký hiệu trên bàn.'
  }
  const d = UNO_CARDS[card]
  if (d.color === null && !color) return 'Chọn màu.'
  let left = hand.filter((c) => c !== card)
  // Bỏ màu: bỏ luôn mọi lá cùng màu trên tay
  const extra = d.kind === 'discard' ? left.filter((c) => UNO_CARDS[c].color === d.color) : []
  if (extra.length) left = left.filter((c) => !extra.includes(c))
  let t: UnoState = {
    ...s,
    hands: { ...s.hands, [id]: left },
    discard: [...s.discard, ...extra, card],
    color: d.color ?? color!,
    last: { by: id, card, ...(extra.length && { extra }) },
  }
  delete t.drawn
  delete t.slapDone
  if (!left.length) {
    // Hết bài → thắng, ván xong
    t = { ...t, winner: id, turn: null, step: s.step + 1 }
    delete t.attack
    delete t.slap
    return tidyUno(t)
  }
  const a = s.attack
  if (a) {
    // Đỡ đòn
    if (d.kind === 'draw2' || d.kind === 'wild4')
      t.attack = { kind: 'draw', n: (a.kind === 'draw' ? a.n : 0) + (d.kind === 'draw2' ? 2 : 4), by: id }
    else if (d.kind === 'num') t.attack = { kind: 'up', top: d.value ?? 0, by: id }
    else {
      if (d.kind === 'reverse') t.dir = s.dir === 1 ? -1 : 1
      t.attack = { ...a, by: id }
    }
    return tidyUno(passTo(t, nextOf(t, id)))
  }
  switch (d.kind) {
    case 'skip':
      return tidyUno(passTo(t, nextOf(t, id, 2)))
    case 'reverse':
      t.dir = s.dir === 1 ? -1 : 1
      // Hai người: đổi chiều = cấm, người đánh đi tiếp
      return tidyUno(passTo(t, s.order.length === 2 ? id : nextOf(t, id)))
    case 'draw2':
    case 'wild4':
      t.attack = { kind: 'draw', n: d.kind === 'draw2' ? 2 : 4, by: id }
      break
    case 'tornado':
      t.attack = { kind: 'tornado', color: d.color!, by: id }
      break
    case 'up':
      t.attack = { kind: 'up', top: 0, by: id }
      break
    case 'slap':
      t.slap = { id: s.step + 1, by: id, need: s.order.filter((p) => p !== id), tapped: [] }
      break
    case 'seven': {
      // Cả bàn chuyền nguyên bài trên tay sang người bên cạnh theo chiều lá, rồi chơi tiếp theo chiều đó
      const dir = d.dir!
      const hands: Record<ID, Card[]> = {}
      for (const p of s.order) hands[nextOf(s, p, 1, dir)] = t.hands[p] ?? []
      t = withEvent({ ...t, hands, dir, uno: [] }, { kind: 'swap', dir })
      break
    }
  }
  return tidyUno(passTo(t, nextOf(t, id)))
}

/**
 * Chạm / kéo bộ bài: đang bị đòn thì chịu phạt (rút hết số lá cộng / rút tới khi ra màu / rút theo số cao nhất) và mất lượt;
 * không thì rút 1 lá — đánh được thì giữ lượt để đánh lá đó (hoặc bỏ lượt), không thì mất lượt.
 */
export function draw(s: UnoState, id: ID): UnoState | string {
  if (!running(s)) return 'Ván đã xong.'
  if (s.turn !== id) return 'Chưa tới lượt bạn.'
  const a = s.attack
  if (a) {
    const r = a.kind === 'tornado' ? drawUntil(s, id, a.color) : drawCards(s, id, a.kind === 'draw' ? a.n : Math.max(1, a.top))
    const t = withEvent(r.s, { kind: 'penalty', who: id, n: r.got.length })
    delete t.attack
    return passTo(t, nextOf(t, id))
  }
  if (s.drawn !== undefined) return 'Đã rút rồi — đánh lá vừa rút hoặc bỏ lượt.'
  const r = drawCards(s, id, 1)
  const got = r.got[0]
  if (got !== undefined && matches(r.s, got)) return { ...r.s, drawn: got, step: s.step + 1 }
  return passTo(r.s, nextOf(r.s, id))
}

/** Vừa rút được lá đánh được mà không muốn đánh → bỏ lượt. */
export function pass(s: UnoState, id: ID): UnoState | string {
  if (!running(s)) return 'Ván đã xong.'
  if (s.turn !== id) return 'Chưa tới lượt bạn.'
  if (s.drawn === undefined) return 'Rút bài trước (kéo bộ bài giữa bàn về phía bạn).'
  return passTo(s, nextOf(s, id))
}

/** Hô UNO (còn 2 lá sắp đánh, hoặc còn 1 lá). */
export function sayUno(s: UnoState, id: ID): UnoState | string {
  if (!running(s)) return 'Ván đã xong.'
  if (!s.order.includes(id)) return 'Bạn không chơi ván này.'
  if ((s.hands[id]?.length ?? 0) > 2) return 'Còn 2 lá trở xuống mới hô UNO.'
  if (s.uno.includes(id)) return 'Bạn đã hô UNO rồi.'
  return withEvent({ ...s, uno: [...s.uno, id] }, { kind: 'uno', who: id })
}

/**
 * Bắt UNO: `target` còn 1 lá mà chưa hô → `target` rút 2; không (chưa còn 1 lá, hoặc đã hô) → bắt hớ, `by` rút 2.
 */
export function catchUno(s: UnoState, by: ID, target: ID): UnoState | string {
  if (!running(s)) return 'Ván đã xong.'
  if (!s.order.includes(by) || !s.order.includes(target)) return 'Chỉ bắt được người trong ván.'
  if (by === target) return 'Không tự bắt mình được.'
  const caught = (s.hands[target]?.length ?? 0) === 1 && !s.uno.includes(target)
  const loser = caught ? target : by
  return withEvent(drawCards(s, loser, 2).s, caught ? { kind: 'caught', who: target, by } : { kind: 'false-catch', who: target, by })
}

/** Đập tay vào bộ bài. Còn đúng một người chưa đập (bàn từ 3 người) → người đó chậm nhất, rút 2. */
export function slapDeck(s: UnoState, id: ID): UnoState | string {
  const sl = s.slap
  if (!sl) return 'Không có lá Đập tay nào.'
  if (!sl.need.includes(id)) return 'Bạn đánh lá Đập tay — không phải đập.'
  if (sl.tapped.includes(id)) return 'Bạn đập rồi.'
  const tapped = [...sl.tapped, id]
  const rest = sl.need.filter((p) => !tapped.includes(p))
  if (rest.length > 1) return { ...s, slap: { ...sl, tapped } }
  const t: UnoState = { ...s, slapDone: { tapped, late: rest } }
  delete t.slap
  if (!rest.length) return t
  return withEvent(drawCards(t, rest[0], 2).s, { kind: 'slap-lose', who: rest })
}

/** Hết giờ đập tay: ai chưa đập đều rút 2. */
export function slapTimeout(s: UnoState, slapId: number): UnoState | string {
  const sl = s.slap
  if (!sl || sl.id !== slapId) return 'Đã xong lượt đập tay.'
  const late = sl.need.filter((p) => !sl.tapped.includes(p))
  let t: UnoState = { ...s, slapDone: { tapped: sl.tapped, late } }
  delete t.slap
  for (const p of late) t = drawCards(t, p, 2).s
  return late.length ? withEvent(t, { kind: 'slap-lose', who: late }) : t
}

/** Hết giờ lượt: đang bị đòn thì chịu phạt; vừa rút thì bỏ lượt; không thì rút 1 lá rồi bỏ lượt. */
export function autoMove(s: UnoState, id: ID): UnoState | string {
  if (s.turn !== id) return 'Chưa tới lượt.'
  if (s.attack) return draw(s, id)
  if (s.drawn !== undefined) return pass(s, id)
  const t = draw(s, id)
  return typeof t !== 'string' && t.turn === id ? pass(t, id) : t
}

/** Xếp bài trên tay để hiện: theo màu (đỏ, vàng, xanh lá, xanh dương, đen), trong màu theo số rồi ký hiệu. */
export function sortHand(hand: Card[]): Card[] {
  const rank = (c: Card) => {
    const d = UNO_CARDS[c]
    const color = d.color === null ? 4 : UNO_COLORS.indexOf(d.color)
    const kinds: UnoKind[] = ['num', 'seven', 'skip', 'reverse', 'draw2', 'tornado', 'discard', 'slap', 'wild', 'shield', 'up', 'wild4']
    return color * 1000 + kinds.indexOf(d.kind) * 20 + (d.value ?? 0)
  }
  return [...hand].sort((a, b) => rank(a) - rank(b) || a - b)
}
