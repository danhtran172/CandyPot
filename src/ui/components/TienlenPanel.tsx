import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  beats,
  cardLabel,
  comboOf,
  COMBO_LABEL,
  isRed,
  placeOf,
  playableCards,
  suggestWith,
  type Card,
  type TienlenCards,
} from '../../core/games/tienlenPlay'
import type { ID, Player, Round } from '../../core/types'
import { TURN_MS, useTurnLeft } from '../turnClock'
import { Button } from './kit'

/** Một lá bài. */
export function PlayingCard({
  card,
  selected,
  onClick,
  small,
  dim,
  fan,
}: {
  card: Card
  selected?: boolean
  onClick?: () => void
  small?: boolean
  /** Lá không đi được nước này: mờ, không bấm được. */
  dim?: boolean
  /** Lá trên tay xòe quạt: to hơn; chạm / vuốt do quạt xử lý (nút chỉ còn nhận bàn phím). */
  fan?: boolean
}) {
  const label = cardLabel(card)
  const rank = label.slice(0, -1)
  const suit = label.slice(-1)
  return (
    <button
      type="button"
      // Quạt bài tự xử lý chạm bằng pointer; click từ bàn phím (detail = 0) vẫn chọn được
      onClick={fan ? (e) => e.detail === 0 && onClick?.() : onClick}
      disabled={!onClick || dim}
      aria-pressed={selected}
      aria-label={label}
      className={`num relative shrink-0 rounded-lg border-2 bg-cream font-bold leading-none shadow-md transition duration-150 ${
        small ? 'h-12 w-9' : fan ? 'h-[4.5rem] w-12' : 'h-[4.2rem] w-[2.65rem]'
      } ${isRed(card) ? 'text-berry' : 'text-night'} ${
        selected
          ? `${fan ? '' : '-translate-y-2.5'} border-lemon shadow-[0_0_0_2px_var(--color-lemon),0_8px_16px_rgb(0_0_0/0.4)]`
          : `border-white/70 ${fan ? 'shadow-[-2px_0_4px_rgb(0_0_0/0.25)]' : ''}`
      } ${dim ? (fan ? 'brightness-[0.55] saturate-50' : 'opacity-35 saturate-0') : onClick && !fan ? 'active:scale-95' : ''}`}
    >
      {/* Góc trên trái: hạng + chất nhỏ; giữa lá: chất to — giống các app đánh bài */}
      <span className={`absolute top-1 left-1 flex flex-col items-center ${small ? 'text-[11px]' : fan ? 'text-base' : 'text-sm'}`}>
        <span className="tracking-tighter">{rank}</span>
        <span className={small ? 'text-[10px]' : 'text-xs'}>{suit}</span>
      </span>
      <span className={`absolute right-1 bottom-0.5 ${small ? 'text-lg' : 'text-2xl'}`}>{suit}</span>
    </button>
  )
}

/**
 * Tiến lên bài trong app (thanh dưới đáy): bài trên tay người xem xòe hình quạt (chọn lá → Đánh / Bỏ lượt),
 * đồng hồ lượt, xếp hạng khi xong. Chỉ bàn nhiều người: mỗi máy chỉ thấy bài của mình.
 */
export function TienlenPanel({
  round,
  cards,
  players,
  me,
  isHost,
  onPlay,
  onPass,
  dealing,
  turnKey,
  onNext,
  menu,
}: {
  round: Round
  cards: TienlenCards
  players: Record<ID, Player>
  me: ID | null
  isHost: boolean
  onPlay: (id: ID, cards: Card[]) => boolean
  onPass: (id: ID) => void
  /** Đang xào / chia bài: chưa hiện bài trên tay. */
  dealing?: boolean
  /** Mã lượt đang tính giờ (null = không tính). */
  turnKey?: string | null
  /** Host: chốt ván (kẹo đã tự tính) và chia ván mới. */
  onNext: () => void
  /** Nút ⋯ mở popup các chức năng còn lại. */
  menu: ReactNode
}) {
  const viewer = me && cards.order.includes(me) ? me : null
  // Lá đang chọn (chọn sẵn được cả lúc chưa tới lượt); lá đã đánh đi thì tự rơi khỏi danh sách
  const [sel, setSel] = useState<Card[]>([])
  const name = (id: ID) => players[id]?.name ?? '?'
  const done = cards.turn === null
  const paid = round.moves.some((m) => m.label.startsWith('Bài:'))
  const hand = viewer ? (cards.hands[viewer] ?? []) : []
  const picked = sel.filter((c) => hand.includes(c))
  const myTurn = !!viewer && cards.turn === viewer
  const combo = comboOf(picked)
  const table = cards.table?.cards ?? null
  // Tới lượt: làm mờ các lá không nằm trong bộ nào chặn được bàn
  const playable = myTurn ? playableCards(hand, table, cards.mustOpen) : null
  const left = useTurnLeft(turnKey ?? null)
  const secs = left === null ? null : Math.max(0, Math.ceil(left / 1000))
  const urgent = secs !== null && secs <= 5

  // Sắp hết giờ lượt mình → rung nhẹ một lần
  const buzzed = useRef<string | null>(null)
  useEffect(() => {
    if (myTurn && urgent && turnKey && buzzed.current !== turnKey) {
      buzzed.current = turnKey
      navigator.vibrate?.(120)
    }
  }, [myTurn, urgent, turnKey])

  const play = () => {
    if (viewer && combo && onPlay(viewer, picked)) setSel([])
  }
  const beatsTable = (cs: Card[]) => {
    const prev = table && comboOf(table)
    const next = comboOf(cs)
    return !!prev && !!next && beats(prev, next)
  }
  /**
   * Chạm một lá: đang phải chặn mà chưa chọn gì (hoặc đang chọn sẵn một bộ chặn được) → tự chọn bộ nhỏ nhất
   * có lá đó chặn được bàn; còn lại bật / tắt riêng lá đó.
   */
  const tap = (c: Card) => {
    if (picked.includes(c)) return setSel(picked.filter((x) => x !== c))
    if (table && (!picked.length || beatsTable(picked))) {
      const s = suggestWith(hand, table, c, cards.mustOpen)
      if (s) return setSel(s)
    }
    setSel([...picked, c])
  }

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-1 pb-2 backdrop-blur">
      {done ? (
        <div className="mt-1 flex gap-2">
          {isHost ? (
            <Button variant="primary" className="font-display flex-1 text-lg" onClick={onNext}>
              Ván mới
            </Button>
          ) : (
            <p className="flex flex-1 items-center justify-center text-center text-xs text-muted">
              {paid ? 'Đã tự trả kẹo theo hạng · ' : ''}Chờ host chia ván mới
            </p>
          )}
          {menu}
        </div>
      ) : dealing ? (
        <p className="py-6 text-center text-sm font-semibold text-lemon">Đang chia bài…</p>
      ) : !viewer ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-center text-xs text-muted">
            Bạn không chơi ván này · lượt {name(cards.turn!)}
            {secs !== null && ` · ${secs}s`}
          </p>
          {menu}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <p className="truncate">
              {myTurn ? (
                <b className="text-lemon">Lượt bạn{playable && !playable.size ? ' — không chặn được, Bỏ lượt' : ''}</b>
              ) : cards.finished.includes(viewer) ? (
                `Bạn đã về ${placeOf(cards, viewer)} 🎉`
              ) : (
                `Chờ ${name(cards.turn!)}…`
              )}
              {combo ? ` · ${COMBO_LABEL[combo.type]}` : picked.length ? ' · chưa thành bộ' : ''}
            </p>
            {secs !== null && (
              <span
                aria-label={`Còn ${secs} giây`}
                className={`num shrink-0 rounded-full px-2 py-0.5 font-bold ${urgent ? 'animate-pulse bg-berry/20 text-berry' : 'bg-plum-2 text-cream'}`}
              >
                {secs}s
              </span>
            )}
          </div>
          {/* Thanh thời gian của lượt hiện tại */}
          {left !== null && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-plum-2">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-berry' : myTurn ? 'bg-lemon' : 'bg-mint'}`}
                style={{ width: `${Math.max(0, Math.min(100, (left / TURN_MS) * 100))}%` }}
              />
            </div>
          )}
          <FanHand
            hand={hand}
            picked={picked}
            dim={(c) => !!playable && !playable.has(c)}
            onTap={tap}
            onDrag={(c, on) => setSel((prev) => (on ? (prev.includes(c) ? prev : [...prev, c]) : prev.filter((x) => x !== c)))}
            onSwipeUp={myTurn && combo ? play : undefined}
          />
          {!myTurn && (
            <div className="mt-1 flex items-center gap-2">
              <p className="flex-1 text-[11px] text-muted">
                {picked.length ? 'Đã chọn sẵn — tới lượt là đánh được' : 'Chạm hoặc vuốt ngang để chọn bài'}
              </p>
              {picked.length > 0 && (
                <Button className="px-3 py-1.5 text-sm whitespace-nowrap" onClick={() => setSel([])}>
                  Bỏ chọn
                </Button>
              )}
              {menu}
            </div>
          )}
          {myTurn && (
            <div className="mt-1 flex gap-2">
              {menu}
              <Button className="px-3 whitespace-nowrap" disabled={!cards.table} onClick={() => onPass(viewer)}>
                Bỏ lượt
              </Button>
              <Button className="px-3 whitespace-nowrap" disabled={!picked.length} onClick={() => setSel([])}>
                Bỏ chọn
              </Button>
              <Button variant="primary" className="font-display flex-1 text-lg" disabled={!combo} onClick={play}>
                Đánh
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** Kích thước lá trên tay (px) — khớp h-[4.5rem] w-12. */
const CARD_W = 48
const CARD_H = 72
/** Tâm xoay của quạt nằm cách đỉnh lá bấy nhiêu lần chiều cao lá — càng xa cung càng thoải. */
const PIVOT = 7
/** Lá đang chọn nhô lên theo hướng của lá (px). */
const LIFT = 16

/**
 * Bài trên tay xòe hình quạt (lá đè nhau, vẫn thấy góc hạng + chất của từng lá), lá chọn nhô lên.
 * Chạm: chọn / bỏ chọn (có gợi ý bộ chặn). Vuốt ngang qua các lá: chọn (hoặc bỏ chọn) liền cả dãy.
 * Vuốt lên từ một lá đang chọn: đánh luôn.
 */
function FanHand({
  hand,
  picked,
  dim,
  onTap,
  onDrag,
  onSwipeUp,
}: {
  hand: Card[]
  picked: Card[]
  dim: (c: Card) => boolean
  onTap: (c: Card) => void
  onDrag: (c: Card, on: boolean) => void
  onSwipeUp?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const drag = useRef<{ x: number; y: number; start: Card; on: boolean; seen: Set<Card>; moved: boolean; wasPicked: boolean } | null>(null)

  const n = hand.length
  const radius = CARD_H * PIVOT
  // Khoảng cách giữa hai lá: vừa khung, không quá thưa
  const gap = n > 1 ? Math.min(CARD_W * 0.66, (width - CARD_W - 8) / (n - 1)) : 0
  const step = (gap / radius) * (180 / Math.PI)
  const mid = (n - 1) / 2
  const sag = radius * (1 - Math.cos(((mid * step) / 180) * Math.PI))

  /** Lá trên cùng dưới ngón tay (bỏ qua lá mờ). */
  const cardAt = (x: number, y: number): Card | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-card]')
    if (!el || !box.current?.contains(el)) return null
    const c = Number(el.dataset.card)
    return dim(c) ? null : c
  }
  /** Đang vuốt lên (dọc nhiều hơn ngang). */
  const upward = (d: { x: number; y: number }, x: number, y: number) => d.y - y > Math.abs(x - d.x)

  return (
    <div
      ref={box}
      className="relative mt-1 w-full touch-none select-none"
      style={{ height: CARD_H + LIFT + sag + 4 }}
      onPointerDown={(e) => {
        const c = cardAt(e.clientX, e.clientY)
        if (c === null) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const wasPicked = picked.includes(c)
        drag.current = { x: e.clientX, y: e.clientY, start: c, on: !wasPicked, seen: new Set([c]), moved: false, wasPicked }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (!d.moved) {
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return
          d.moved = true
          // Vuốt lên từ lá đang chọn = đánh, không đổi lựa chọn
          if (d.wasPicked && upward(d, e.clientX, e.clientY)) return
          onDrag(d.start, d.on)
        }
        if (d.wasPicked && d.seen.size === 1 && upward(d, e.clientX, e.clientY)) return
        const c = cardAt(e.clientX, e.clientY)
        if (c === null || d.seen.has(c)) return
        d.seen.add(c)
        onDrag(c, d.on)
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d) return
        if (!d.moved) return onTap(d.start)
        if (d.wasPicked && d.seen.size === 1 && d.y - e.clientY > 40 && upward(d, e.clientX, e.clientY)) onSwipeUp?.()
      }}
      onPointerCancel={() => (drag.current = null)}
    >
      {hand.map((c, i) => {
        const on = picked.includes(c)
        return (
          <div
            key={c}
            data-card={c}
            className="absolute top-0 left-1/2 transition-transform duration-150 ease-out"
            style={{
              marginLeft: -CARD_W / 2,
              marginTop: LIFT,
              transformOrigin: `50% ${radius}px`,
              transform: `rotate(${(i - mid) * step}deg) translateY(${on ? -LIFT : 0}px)`,
              zIndex: i,
            }}
          >
            <PlayingCard card={c} selected={on} dim={dim(c)} fan onClick={() => onTap(c)} />
          </div>
        )
      })}
    </div>
  )
}

/** Giữa bàn: bộ đang trên bàn / vòng mới / xếp hạng khi xong. */
export function TienlenTableCards({ cards, players }: { cards: TienlenCards; players: Record<ID, Player> }) {
  const name = (id: ID) => players[id]?.name ?? '?'
  const done = cards.turn === null
  return (
    <div className="flex max-w-full flex-col items-center gap-1">
      {/* Bộ trên bàn */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        {done ? (
          <ol className="flex flex-col items-center gap-1 text-xs">
            {cards.finished.map((id) => (
              <li key={id} className="rounded-full bg-plum-2 px-2.5 py-1 font-semibold">
                {placeOf(cards, id)} · {name(id)}
              </li>
            ))}
          </ol>
        ) : cards.table ? (
          <>
            <span className="w-full text-center text-xs text-muted">
              {name(cards.table.by)} · {COMBO_LABEL[comboOf(cards.table.cards)!.type]}
            </span>
            {cards.table.cards.map((c) => (
              <PlayingCard key={c} card={c} small />
            ))}
          </>
        ) : (
          <span className="text-xs text-muted">Vòng mới — {name(cards.turn!)} đánh gì cũng được{cards.mustOpen ? ' (phải có 3♠)' : ''}</span>
        )}
      </div>
    </div>
  )
}
