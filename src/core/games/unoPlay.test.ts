import { describe, expect, it } from 'vitest'
import {
  BASE_COUNT,
  catchUno,
  dealUno,
  draw,
  pass,
  play,
  playableCards,
  sayUno,
  slapDeck,
  slapTimeout,
  autoMove,
  UNO_CARDS,
  type Card,
  type UnoCardDef,
  type UnoState,
} from './unoPlay'

/** Lá đầu tiên trong bộ khớp mô tả (bỏ qua các lá đã dùng). */
function find(want: Partial<UnoCardDef>, used: Card[] = []): Card {
  const i = UNO_CARDS.findIndex((d, k) => !used.includes(k) && Object.entries(want).every(([key, v]) => d[key as keyof UnoCardDef] === v))
  if (i < 0) throw new Error(`Không có lá ${JSON.stringify(want)}`)
  return i
}

/** Bàn mẫu: A B C, lá trên cùng 5 đỏ, xấp rút = các lá số xanh dương (không đánh được lên đỏ trừ khi trùng số). */
function table(hands: Record<string, Partial<UnoCardDef>[]>, extra: Partial<UnoState> = {}): UnoState {
  const used: Card[] = []
  const take = (w: Partial<UnoCardDef>) => {
    const c = find(w, used)
    used.push(c)
    return c
  }
  const top = take({ kind: 'num', color: 'r', value: 5 })
  const h = Object.fromEntries(Object.entries(hands).map(([id, list]) => [id, list.map(take)]))
  const deck = Array.from({ length: 6 }, () => take({ kind: 'num', color: 'b', value: 1 + (used.length % 4) }))
  return {
    deck,
    discard: [top],
    hands: h,
    order: Object.keys(hands),
    dir: 1,
    turn: Object.keys(hands)[0],
    color: 'r',
    uno: [],
    step: 0,
    seq: 0,
    expansion: true,
    ...extra,
  }
}

const ok = (r: UnoState | string): UnoState => {
  if (typeof r === 'string') throw new Error(r)
  return r
}

describe('Uno — bộ bài và chia bài', () => {
  it('bộ gốc 108 lá, mở rộng thêm 26 lá', () => {
    expect(BASE_COUNT).toBe(108)
    expect(UNO_CARDS.length).toBe(134)
    expect(UNO_CARDS.slice(0, BASE_COUNT).filter((d) => d.kind === 'wild4').length).toBe(4)
    expect(UNO_CARDS.filter((d) => d.kind === 'shield').length).toBe(6)
  })

  it('chia 7 lá mỗi người, lật một lá số mở màn; bộ gốc không có lá mở rộng', () => {
    const s = dealUno(['a', 'b', 'c'], { expansion: false })
    expect(Object.values(s.hands).every((h) => h.length === 7)).toBe(true)
    expect(UNO_CARDS[s.discard[0]].kind).toBe('num')
    const all = [...s.deck, ...s.discard, ...Object.values(s.hands).flat()]
    expect(all.length).toBe(108)
    expect(all.every((c) => c < BASE_COUNT)).toBe(true)
    expect(dealUno(['a', 'b'], { expansion: true, first: 'b' }).turn).toBe('b')
  })
})

describe('Uno — đánh bài', () => {
  it('đánh được lá cùng màu / cùng số / lá đen; lá không hợp thì báo', () => {
    const s = table({
      a: [
        { kind: 'num', color: 'r', value: 2 },
        { kind: 'num', color: 'g', value: 5 },
        { kind: 'num', color: 'g', value: 3 },
        { kind: 'wild' },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
    })
    const [red2, green5, green3, wild] = s.hands.a
    expect(playableCards(s, 'a').sort()).toEqual([red2, green5, wild].sort())
    expect(typeof play(s, 'a', green3)).toBe('string')
    expect(typeof play(s, 'a', wild)).toBe('string') // chưa chọn màu
    const t = ok(play(s, 'a', wild, 'g'))
    expect(t.color).toBe('g')
    expect(t.turn).toBe('b')
  })

  it('Cấm bỏ qua người kế; Đổi chiều đổi chiều (2 người thì như Cấm)', () => {
    const s = table({
      a: [
        { kind: 'skip', color: 'r' },
        { kind: 'reverse', color: 'r' },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
      c: [{ kind: 'num', color: 'y', value: 2 }],
    })
    expect(ok(play(s, 'a', s.hands.a[0])).turn).toBe('c')
    const r = ok(play(s, 'a', s.hands.a[1]))
    expect(r.dir).toBe(-1)
    expect(r.turn).toBe('c')
    const two = table({
      a: [
        { kind: 'reverse', color: 'r' },
        { kind: 'num', color: 'r', value: 9 },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
    })
    expect(ok(play(two, 'a', two.hands.a[0])).turn).toBe('a')
  })

  it('cộng dồn +2 → +4 → +2 đúng màu; không đỡ thì rút hết và mất lượt', () => {
    const s = table({
      a: [
        { kind: 'draw2', color: 'r' },
        { kind: 'num', color: 'r', value: 1 },
      ],
      b: [{ kind: 'wild4' }, { kind: 'num', color: 'y', value: 1 }],
      c: [
        { kind: 'draw2', color: 'y' },
        { kind: 'draw2', color: 'g' },
        { kind: 'num', color: 'y', value: 2 },
      ],
    })
    let t = ok(play(s, 'a', s.hands.a[0]))
    expect(t.attack).toMatchObject({ kind: 'draw', n: 2 })
    t = ok(play(t, 'b', t.hands.b[0], 'y'))
    expect(t.attack).toMatchObject({ kind: 'draw', n: 6 })
    // +2 xanh lá không nối được lên +4 đang chọn màu vàng; +2 vàng thì được
    expect(playableCards(t, 'c')).toEqual([t.hands.c[0]])
    t = ok(play(t, 'c', t.hands.c[0]))
    expect(t.attack).toMatchObject({ kind: 'draw', n: 8 })
    expect(t.turn).toBe('a')
    const before = t.hands.a.length
    t = ok(draw(t, 'a'))
    expect(t.hands.a.length).toBe(before + 8)
    expect(t.attack).toBeUndefined()
    expect(t.turn).toBe('b')
    expect(t.event).toMatchObject({ kind: 'penalty', who: 'a', n: 8 })
  })

  it('Đổi chiều cùng màu phản lá cộng về người vừa đánh; Khiên đẩy sang người kế', () => {
    const s = table({
      a: [
        { kind: 'draw2', color: 'r' },
        { kind: 'num', color: 'r', value: 1 },
      ],
      b: [{ kind: 'reverse', color: 'r' }, { kind: 'shield' }, { kind: 'num', color: 'y', value: 1 }],
      c: [{ kind: 'num', color: 'y', value: 2 }],
    })
    const t = ok(play(s, 'a', s.hands.a[0]))
    const back = ok(play(t, 'b', t.hands.b[0]))
    expect(back.turn).toBe('a')
    expect(back.attack).toMatchObject({ kind: 'draw', n: 2, by: 'b' })
    const shielded = ok(play(t, 'b', t.hands.b[1], 'g'))
    expect(shielded.turn).toBe('c')
    expect(shielded.color).toBe('g')
    expect(shielded.attack).toMatchObject({ kind: 'draw', n: 2 })
  })

  it('Lốc xoáy: người kế rút tới khi ra lá đúng màu', () => {
    const s = table({
      a: [
        { kind: 'tornado', color: 'r' },
        { kind: 'num', color: 'r', value: 1 },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
    })
    // Xấp rút toàn xanh dương, lá dưới đáy là đỏ
    s.deck = [find({ kind: 'num', color: 'r', value: 3 }), ...s.deck]
    let t = ok(play(s, 'a', s.hands.a[0]))
    expect(t.attack).toMatchObject({ kind: 'tornado', color: 'r' })
    t = ok(draw(t, 'b'))
    expect(t.hands.b.length).toBe(1 + 7)
    expect(UNO_CARDS[t.hands.b[t.hands.b.length - 1]].color).toBe('r')
    expect(t.turn).toBe('a')
  })

  it('Leo số: đánh số ≥ số trước (màu nào cũng được), không được thì rút bằng số cao nhất', () => {
    const s = table({
      a: [{ kind: 'up' }, { kind: 'num', color: 'r', value: 1 }],
      b: [
        { kind: 'num', color: 'y', value: 3 },
        { kind: 'num', color: 'g', value: 0 },
      ],
      c: [{ kind: 'num', color: 'b', value: 2 }],
    })
    let t = ok(play(s, 'a', s.hands.a[0], 'r'))
    t = ok(play(t, 'b', t.hands.b[0]))
    expect(t.attack).toMatchObject({ kind: 'up', top: 3 })
    expect(playableCards(t, 'c')).toEqual([])
    t = ok(draw(t, 'c'))
    expect(t.hands.c.length).toBe(1 + 3)
    expect(t.attack).toBeUndefined()
  })

  it('Bỏ màu: bỏ luôn mọi lá cùng màu trên tay', () => {
    const s = table({
      a: [
        { kind: 'discard', color: 'r' },
        { kind: 'num', color: 'r', value: 1 },
        { kind: 'draw2', color: 'r' },
        { kind: 'num', color: 'g', value: 1 },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
    })
    const t = ok(play(s, 'a', s.hands.a[0]))
    expect(t.hands.a.map((c) => UNO_CARDS[c].color)).toEqual(['g'])
    expect(t.attack).toBeUndefined()
    expect(t.last?.extra?.length).toBe(2)
  })

  it('7 Đổi bài: cả bàn chuyền bài sang bên cạnh, chơi tiếp theo chiều lá', () => {
    const s = table({
      a: [
        { kind: 'seven', color: 'g' },
        { kind: 'num', color: 'g', value: 1 },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
      c: [
        { kind: 'num', color: 'y', value: 2 },
        { kind: 'num', color: 'y', value: 3 },
      ],
    })
    s.color = 'g'
    const [, g1] = s.hands.a
    const t = ok(play(s, 'a', s.hands.a[0]))
    // Xanh lá = chuyền phải (ngược chiều): a → c, c → b, b → a
    expect(t.dir).toBe(-1)
    expect(t.hands.c).toEqual([g1])
    expect(t.hands.a).toEqual(s.hands.b)
    expect(t.hands.b).toEqual(s.hands.c)
    expect(t.turn).toBe('c')
  })

  it('rút bài: rút được lá đánh được thì đánh hoặc bỏ lượt; không thì mất lượt', () => {
    const s = table({ a: [{ kind: 'num', color: 'g', value: 1 }], b: [{ kind: 'num', color: 'y', value: 1 }] })
    const lost = ok(draw(s, 'a'))
    expect(lost.turn).toBe('b')
    expect(lost.hands.a.length).toBe(2)
    s.deck = [...s.deck, find({ kind: 'num', color: 'r', value: 8 })]
    const got = ok(draw(s, 'a'))
    expect(got.turn).toBe('a')
    expect(got.drawn).toBe(s.deck[s.deck.length - 1])
    expect(playableCards(got, 'a')).toEqual([got.drawn])
    expect(ok(pass(got, 'a')).turn).toBe('b')
  })

  it('hết bài thì thắng', () => {
    const s = table({ a: [{ kind: 'num', color: 'r', value: 1 }], b: [{ kind: 'num', color: 'y', value: 1 }] })
    const t = ok(play(s, 'a', s.hands.a[0]))
    expect(t.winner).toBe('a')
    expect(t.turn).toBeNull()
  })
})

describe('Uno — hô UNO, bắt UNO, đập tay', () => {
  const two = () =>
    table({
      a: [
        { kind: 'num', color: 'r', value: 1 },
        { kind: 'num', color: 'r', value: 2 },
      ],
      b: [
        { kind: 'num', color: 'y', value: 1 },
        { kind: 'num', color: 'y', value: 2 },
        { kind: 'num', color: 'y', value: 3 },
      ],
    })

  it('còn 1 lá chưa hô → bị bắt rút 2; đã hô → người bắt hớ rút 2', () => {
    const t = ok(play(two(), 'a', two().hands.a[0]))
    expect(t.hands.a.length).toBe(1)
    const caught = ok(catchUno(t, 'b', 'a'))
    expect(caught.hands.a.length).toBe(3)
    expect(caught.event).toMatchObject({ kind: 'caught', who: 'a', by: 'b' })
    const said = ok(sayUno(t, 'a'))
    const wrong = ok(catchUno(said, 'b', 'a'))
    expect(wrong.hands.a.length).toBe(1)
    expect(wrong.hands.b.length).toBe(5)
    expect(wrong.event).toMatchObject({ kind: 'false-catch', by: 'b' })
  })

  it('hô UNO từ lúc còn 2 lá; rút thêm thì mất lời hô', () => {
    const s = ok(sayUno(two(), 'a'))
    expect(s.uno).toEqual(['a'])
    expect(typeof sayUno(s, 'b')).toBe('string')
    const t = ok(draw(s, 'a'))
    expect(t.uno).toEqual([])
  })

  it('đập tay: người chậm nhất rút 2; hết giờ thì ai chưa đập rút 2', () => {
    const s = table({
      a: [
        { kind: 'slap', color: 'r' },
        { kind: 'num', color: 'r', value: 1 },
      ],
      b: [{ kind: 'num', color: 'y', value: 1 }],
      c: [{ kind: 'num', color: 'y', value: 2 }],
    })
    let t = ok(play(s, 'a', s.hands.a[0]))
    expect(t.slap?.need).toEqual(['b', 'c'])
    expect(typeof slapDeck(t, 'a')).toBe('string')
    t = ok(slapDeck(t, 'c'))
    expect(t.slap).toBeUndefined()
    expect(t.hands.b.length).toBe(3)
    expect(t.event).toMatchObject({ kind: 'slap-lose', who: ['b'] })
    expect(t.slapDone).toEqual({ tapped: ['c'], late: ['b'] })
    const late = ok(slapTimeout(ok(play(s, 'a', s.hands.a[0])), 1))
    expect(late.hands.b.length).toBe(3)
    expect(late.hands.c.length).toBe(3)
  })

  it('hết giờ lượt: rút rồi bỏ lượt; đang bị cộng thì chịu phạt', () => {
    const s = table({ a: [{ kind: 'num', color: 'g', value: 1 }], b: [{ kind: 'num', color: 'y', value: 1 }] })
    const t = ok(autoMove(s, 'a'))
    expect(t.turn).toBe('b')
    expect(t.hands.a.length).toBe(2)
  })

  it('hết xấp rút thì xào lại xấp đã đánh (giữ lá trên cùng)', () => {
    const s = table({ a: [{ kind: 'num', color: 'g', value: 1 }], b: [{ kind: 'num', color: 'y', value: 1 }] })
    s.discard = [...s.deck.slice(0, 4), ...s.discard]
    s.deck = []
    const t = ok(draw(s, 'a'))
    expect(t.discard).toEqual([s.discard[s.discard.length - 1]])
    expect(t.deck.length).toBe(3)
    expect(t.hands.a.length).toBe(2)
  })
})
