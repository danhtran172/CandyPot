import { POT, type ID, type Move, type PokerHand, type Street } from '../types'

/**
 * Luật một tay Poker (Texas Hold'em, không theo dõi bài — bài chia ngoài đời):
 * blind → Preflop → Flop → Turn → River → Showdown; mỗi vòng đi theo lượt, tố thì mở lại lượt.
 * Chip thật là các lượt kéo người → POT; pot chia thành pot chính/pot phụ khi có người all-in thiếu.
 */

export const DEFAULT_SB = 1
/** All-in mặc định = 10 × small blind. */
export const ALL_IN_MULTIPLIER = 10

export const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river', 'showdown']
export const STREET_LABEL: Record<Street, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  done: 'Xong',
}

export interface HandState {
  hand: PokerHand
  moves: Move[]
}

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Tố lên tổng `to` trong vòng này. */
  | { type: 'raise'; to: number }
  /** Bỏ hết (mặc định tới mức all-in; thiếu thì nhập số nhỏ hơn). */
  | { type: 'allin'; amount: number }

export interface Pot {
  amount: number
  /** Người được ăn pot này (chưa bỏ bài và bỏ đủ tới mức pot). */
  eligible: ID[]
}

type NewId = () => string

/** Người kế tiếp sau `id` theo chiều ngồi, thỏa `ok`. */
function nextSeat(order: ID[], id: ID, ok: (p: ID) => boolean): ID | null {
  const i = order.indexOf(id)
  for (let k = 1; k <= order.length; k++) {
    const p = order[(i + k) % order.length]
    if (ok(p)) return p
  }
  return null
}

/** Tổng mỗi người đã bỏ vào pot trong tay này. */
export function handTotals(moves: Move[]): Record<ID, number> {
  const out: Record<ID, number> = {}
  for (const m of moves) if (m.to === POT) out[m.from] = (out[m.from] ?? 0) + m.amount
  return out
}

/** Còn bỏ thêm được bao nhiêu trước khi chạm mức all-in. */
export function remaining(state: HandState, id: ID): number {
  return Math.max(0, state.hand.cap - (handTotals(state.moves)[id] ?? 0))
}

export function toCall(hand: PokerHand, id: ID): number {
  return Math.max(0, hand.currentBet - (hand.streetBets[id] ?? 0))
}

export function blindsOf(hand: Pick<PokerHand, 'order' | 'button'>): { sb: ID; bb: ID } {
  // Hai người: người chia là SB
  const sb = hand.order.length === 2 ? hand.button : nextSeat(hand.order, hand.button, () => true)!
  return { sb, bb: nextSeat(hand.order, sb, () => true)! }
}

/** Bắt đầu tay bài: đặt SB/BB vào pot, lượt đầu là người sau BB. */
export function startHand(order: ID[], button: ID, sb: number, cap: number, newId: NewId): HandState {
  const bbAmount = 2 * sb
  const base: PokerHand = {
    street: 'preflop',
    order,
    button,
    sb,
    cap,
    folded: [],
    allIn: [],
    toAct: null,
    acted: [],
    streetBets: {},
    currentBet: 0,
    minRaise: bbAmount,
    awarded: [],
    undo: [],
  }
  const blinds = blindsOf(base)
  const moves: Move[] = []
  const post = (id: ID, amount: number, label: string) => {
    const a = Math.min(amount, cap)
    moves.push({ id: newId(), from: id, to: POT, amount: a, label })
    base.streetBets[id] = a
    if (a >= cap) base.allIn.push(id)
  }
  post(blinds.sb, sb, 'SB')
  post(blinds.bb, bbAmount, 'BB')
  base.currentBet = Math.max(...Object.values(base.streetBets))
  base.toAct = nextSeat(order, blinds.bb, (p) => !base.allIn.includes(p))
  return settleStreet({ hand: base, moves }, blinds.bb, newId, true)
}

/** Thực hiện một hành động của người đang tới lượt. Trả về trạng thái mới, hoặc lỗi. */
export function act(state: HandState, id: ID, action: PokerAction, newId: NewId): HandState | string {
  const { hand } = state
  if (hand.street === 'showdown' || hand.street === 'done') return 'Hết vòng cược — trao pot cho người thắng.'
  if (hand.toAct !== id) return 'Chưa tới lượt người này.'
  const snapshot = { hand: withoutUndo(hand), moves: state.moves.length }
  const h: PokerHand = {
    ...hand,
    folded: [...hand.folded],
    allIn: [...hand.allIn],
    acted: [...hand.acted],
    streetBets: { ...hand.streetBets },
    undo: [...hand.undo, snapshot],
  }
  const moves = [...state.moves]
  const left = remaining(state, id)
  const street = h.streetBets[id] ?? 0
  const need = toCall(h, id)

  const put = (amount: number, label: string) => {
    if (amount <= 0) return
    moves.push({ id: newId(), from: id, to: POT, amount, label })
    h.streetBets[id] = (h.streetBets[id] ?? 0) + amount
    if (amount >= left && !h.allIn.includes(id)) h.allIn.push(id)
  }
  /** Tổng vòng này vượt cược hiện tại → là tố: mở lại lượt cho người khác. */
  const raiseTo = (to: number) => {
    if (to <= h.currentBet) return
    h.minRaise = Math.max(h.minRaise, to - h.currentBet)
    h.currentBet = to
    h.acted = []
  }

  switch (action.type) {
    case 'fold':
      h.folded.push(id)
      break
    case 'check':
      if (need > 0) return `Phải theo ${need} kẹo (hoặc bỏ bài).`
      break
    case 'call':
      if (need === 0) break
      put(Math.min(need, left), need >= left ? 'All-in' : 'Theo')
      break
    case 'raise': {
      const max = street + left
      if (action.to <= h.currentBet) return `Tố phải cao hơn cược hiện tại (${h.currentBet}).`
      if (action.to > max) return `Tối đa tố lên ${max} (mức all-in).`
      if (action.to < h.currentBet + h.minRaise && action.to < max)
        return `Tố tối thiểu lên ${h.currentBet + h.minRaise}.`
      put(action.to - street, action.to === max ? 'All-in' : 'Tố')
      raiseTo(action.to)
      break
    }
    case 'allin': {
      const amount = Math.min(action.amount, left)
      if (amount <= 0) return 'Không còn kẹo để all-in.'
      put(amount, 'All-in')
      if (!h.allIn.includes(id)) h.allIn.push(id)
      raiseTo(street + amount)
      break
    }
  }
  h.acted = h.acted.includes(id) ? h.acted : [...h.acted, id]
  return settleStreet({ hand: h, moves }, id, newId, false)
}

/** Sau mỗi hành động: còn 1 người → ăn hết; hết vòng → sang vòng sau / showdown; chưa hết → lượt kế. */
function settleStreet(state: HandState, lastId: ID, newId: NewId, opening: boolean): HandState {
  const h = state.hand
  const live = h.order.filter((p) => !h.folded.includes(p))
  if (live.length === 1) {
    // Những người khác bỏ bài hết → người còn lại ăn cả pot
    const won = handTotalsSum(state.moves)
    const moves = won > 0 ? [...state.moves, { id: newId(), from: POT, to: live[0], amount: won, label: 'Ăn pot' }] : state.moves
    return { hand: { ...h, street: 'done', toAct: null, awarded: pots(state).map((_, i) => i) }, moves }
  }
  const canAct = live.filter((p) => !h.allIn.includes(p))
  const pending = canAct.filter((p) => !h.acted.includes(p) || (h.streetBets[p] ?? 0) < h.currentBet)
  const noMoreBetting = canAct.length === 0 || (canAct.length === 1 && (h.streetBets[canAct[0]] ?? 0) >= h.currentBet)

  if (!opening && (pending.length === 0 || noMoreBetting)) {
    if (h.street === 'river' || noMoreBetting) return { ...state, hand: { ...h, street: 'showdown', toAct: null } }
    const next = STREETS[STREETS.indexOf(h.street) + 1]
    return {
      ...state,
      hand: {
        ...h,
        street: next,
        streetBets: {},
        currentBet: 0,
        minRaise: 2 * h.sb,
        acted: [],
        toAct: nextSeat(h.order, h.button, (p) => canAct.includes(p)),
      },
    }
  }
  if (opening) {
    if (noMoreBetting && pending.length === 0) return { ...state, hand: { ...h, street: 'showdown', toAct: null } }
    return state
  }
  return { ...state, hand: { ...h, toAct: nextSeat(h.order, lastId, (p) => pending.includes(p)) } }
}

function handTotalsSum(moves: Move[]): number {
  return moves.reduce((s, m) => s + (m.to === POT ? m.amount : 0) - (m.from === POT ? m.amount : 0), 0)
}

/**
 * Chia pot: mỗi mức all-in của người chưa bỏ bài tạo một pot; người được ăn pot là người chưa bỏ bài
 * và bỏ ít nhất tới mức đó. Kẹo của người đã bỏ bài vẫn nằm trong pot.
 */
export function pots(state: HandState): Pot[] {
  const { hand } = state
  const totals = handTotals(state.moves)
  const of = (p: ID) => totals[p] ?? 0
  const live = hand.order.filter((p) => !hand.folded.includes(p))
  if (!live.length) return []
  const top = Math.max(...live.map(of))
  const levels = [...new Set([...live.filter((p) => hand.allIn.includes(p)).map(of), top])].filter((l) => l > 0).sort((a, b) => a - b)
  const out: Pot[] = []
  let prev = 0
  for (const level of levels) {
    const amount = hand.order.reduce((s, p) => s + Math.min(of(p), level) - Math.min(of(p), prev), 0)
    const eligible = live.filter((p) => of(p) >= level)
    const last = out[out.length - 1]
    if (last && last.eligible.join() === eligible.join()) last.amount += amount
    else if (amount > 0) out.push({ amount, eligible })
    prev = level
  }
  // Người đã bỏ bài bỏ nhiều hơn mức cao nhất còn lại → dồn vào pot cuối
  const extra = hand.order.reduce((s, p) => s + Math.max(0, of(p) - prev), 0)
  if (extra && out.length) out[out.length - 1].amount += extra
  return out
}

/** Trao pot thứ `index` cho người thắng (nhiều người thì chia đều, dư lẻ cho người ngồi gần nút D trước). */
export function award(state: HandState, index: number, winners: ID[], newId: NewId): HandState | string {
  const { hand } = state
  if (hand.street !== 'showdown') return 'Chưa tới showdown.'
  const pot = pots(state)[index]
  if (!pot) return 'Không có pot này.'
  if (hand.awarded.includes(index)) return 'Pot này đã trao rồi.'
  if (!winners.length) return 'Chọn người thắng.'
  const bad = winners.find((w) => !pot.eligible.includes(w))
  if (bad) return 'Người này không được ăn pot này (đã bỏ bài hoặc all-in ít hơn).'
  const seated = hand.order.filter((p) => winners.includes(p))
  // Dư lẻ: bắt đầu từ người ngồi sau nút D
  const from = hand.order.indexOf(hand.button)
  const ordered = [...hand.order.slice(from + 1), ...hand.order.slice(0, from + 1)].filter((p) => seated.includes(p))
  const share = Math.floor(pot.amount / ordered.length)
  const rest = pot.amount - share * ordered.length
  const label = index === 0 ? 'Ăn pot chính' : `Ăn pot phụ ${index}`
  const moves = [
    ...state.moves,
    ...ordered.map((p, i) => ({ id: newId(), from: POT, to: p, amount: share + (i < rest ? 1 : 0), label })),
  ].filter((m) => m.amount > 0)
  const awarded = [...hand.awarded, index]
  const all = pots(state).length
  return {
    hand: { ...hand, awarded, street: awarded.length >= all ? 'done' : 'showdown', undo: [...hand.undo, { hand: withoutUndo(hand), moves: state.moves.length }] },
    moves,
  }
}

/** Hoàn tác thao tác cuối (hành động hoặc trao pot). */
export function undoLast(state: HandState): HandState | string {
  const snap = state.hand.undo[state.hand.undo.length - 1]
  if (!snap) return 'Chưa có thao tác nào để hoàn tác.'
  return { hand: { ...snap.hand, undo: state.hand.undo.slice(0, -1) }, moves: state.moves.slice(0, snap.moves) }
}

function withoutUndo(hand: PokerHand): Omit<PokerHand, 'undo'> {
  const { undo: _undo, ...rest } = hand
  return rest
}

/** Các mức gợi ý khi tố (tổng vòng này): tối thiểu, ×1,5, ×2 — không vượt mức all-in. */
export function raiseOptions(state: HandState, id: ID): number[] {
  const h = state.hand
  const max = (h.streetBets[id] ?? 0) + remaining(state, id)
  const min = h.currentBet + h.minRaise
  if (min >= max) return []
  return [...new Set([min, Math.round(min * 1.5), min * 2].filter((v) => v < max))]
}

/** Nút D của tay sau: người kế tiếp (trong số người chơi tay mới) sau nút D cũ. */
export function nextButton(order: ID[], prevOrder: ID[] | undefined, prevButton: ID | undefined): ID {
  if (!prevButton || !prevOrder) return order[0]
  const i = prevOrder.indexOf(prevButton)
  for (let k = 1; k <= prevOrder.length; k++) {
    const p = prevOrder[(i + k) % prevOrder.length]
    if (order.includes(p)) return p
  }
  return order[0]
}
