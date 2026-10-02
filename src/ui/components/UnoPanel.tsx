import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  BASE_COUNT,
  cardName,
  COLOR_NAME,
  isWild,
  playableCards,
  sortHand,
  topCard,
  UNO_CARDS,
  UNO_COLORS,
  type Card,
  type UnoColor,
  type UnoKind,
  type UnoState,
} from '../../core/games/unoPlay'
import type { ID, Player } from '../../core/types'
import { TURN_MS, useTurnLeft } from '../turnClock'
import { CardBack } from './CardBack'
import { Button } from './kit'

/** Màu lá Uno. */
export const UNO_HEX: Record<UnoColor, string> = { r: '#e53935', y: '#f9c623', g: '#3aa655', b: '#1e7fd8' }

/** Kéo bộ bài về phía mình quá bấy nhiêu px thì tính là rút. */
const PULL = 50

/** Ký hiệu giữa lá. */
function symbolOf(c: Card): string {
  const d = UNO_CARDS[c]
  switch (d.kind) {
    case 'num':
      return String(d.value)
    case 'seven':
      return '7'
    case 'skip':
      return '⊘'
    case 'reverse':
      return '⇄'
    case 'draw2':
      return '+2'
    case 'wild4':
      return '+4'
    case 'wild':
      return ''
    case 'tornado':
      return '🌪️'
    case 'discard':
      return '🗑️'
    case 'shield':
      return '🛡️'
    case 'up':
      return 'UP'
    case 'slap':
      return '✋'
  }
}

/** Chức năng từng loại lá — hiện trên đầu khung bài khi lá vừa được đánh, và trong bảng Rule. */
export const UNO_HELP: Record<UnoKind, string> = {
  num: 'Đánh lá cùng màu hoặc cùng số.',
  skip: 'Cấm: người kế mất lượt.',
  reverse: 'Đổi chiều: đổi chiều chơi (2 người thì như Cấm). Đang bị cộng bài thì Đổi chiều cùng màu phản lá cộng về người vừa đánh.',
  draw2: '+2: người kế rút 2 — hoặc nối +2 / +4, phản bằng Đổi chiều cùng màu, đẩy đi bằng Khiên.',
  wild: 'Đổi màu: người đánh chọn màu tiếp theo.',
  wild4: '+4: chọn màu, người kế rút 4 — hoặc nối +4, nối +2 đúng màu vừa chọn, Đổi chiều đúng màu, Khiên.',
  tornado: 'Lốc xoáy: người kế rút liên tục tới khi ra lá cùng màu Lốc xoáy, mất lượt. Chỉ Khiên đỡ được.',
  discard: 'Bỏ màu: bỏ luôn mọi lá cùng màu trên tay (lá bỏ theo không có tác dụng).',
  seven: '7 Đổi bài: cả bàn chuyền nguyên bài sang người bên cạnh theo chiều mũi tên trên lá, rồi chơi tiếp theo chiều đó.',
  shield: 'Khiên: lá đổi màu. Đang bị phạt (cộng bài, Lốc xoáy, Leo số) thì đẩy nguyên đòn sang người kế.',
  up: 'Leo số: chọn màu; lần lượt mỗi người đánh một lá số bằng hoặc lớn hơn lá trước (màu nào cũng được). Ai không đánh được rút số lá bằng số lớn nhất.',
  slap: 'Đập tay: mọi người (trừ người đánh) chạm thật nhanh vào bộ bài giữa bàn — ai chậm nhất rút 2.',
}

/** Chức năng lá, tên lá (phần trước dấu ":") in đậm. */
function HelpText({ kind }: { kind: UnoKind }) {
  const text = UNO_HELP[kind]
  const at = text.indexOf(': ')
  if (at < 0) return <>{text}</>
  return (
    <>
      <b className="text-cream">{text.slice(0, at)}</b>
      {text.slice(at)}
    </>
  )
}

/** Một lá Uno: nền màu, hình bầu dục trắng xéo ở giữa, ký hiệu ở giữa và góc. Lá đen có bầu dục 4 màu. */
export function UnoCard({
  card,
  size = 'hand',
  selected,
  dim,
  glow,
  onClick,
}: {
  card: Card
  size?: 'hand' | 'top' | 'mini'
  selected?: boolean
  dim?: boolean
  /** Đánh được: viền sáng. */
  glow?: boolean
  onClick?: () => void
}) {
  const d = UNO_CARDS[card]
  const bg = d.color ? UNO_HEX[d.color] : '#1b1b1f'
  const sym = symbolOf(card)
  const box = size === 'top' ? 'h-[4.6rem] w-[3.1rem] rounded-lg' : size === 'mini' ? 'h-9 w-6 rounded-[5px]' : 'h-[4.5rem] w-12 rounded-lg'
  const big = size === 'mini' ? 'text-[11px]' : sym.length > 1 && !/\p{Extended_Pictographic}/u.test(sym) ? 'text-lg' : 'text-2xl'
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      {...(onClick && { type: 'button' as const, onClick })}
      aria-label={cardName(card)}
      title={cardName(card)}
      className={`num relative block shrink-0 overflow-hidden border-2 font-extrabold shadow-md transition duration-150 select-none ${box} ${
        selected
          ? '-translate-y-3 border-lemon shadow-[0_0_0_2px_var(--color-lemon),0_10px_18px_rgb(0_0_0/0.45)]'
          : glow
            ? '-translate-y-1 border-white'
            : 'border-white/90'
      } ${dim ? 'brightness-[0.5] saturate-50' : ''}`}
      style={{ background: bg }}
    >
      {/* Bầu dục giữa lá */}
      <span
        aria-hidden
        className="absolute inset-x-[12%] inset-y-[16%] -rotate-[25deg] rounded-[50%]"
        style={
          d.color
            ? { background: '#fff' }
            : { background: `conic-gradient(${UNO_HEX.r} 0 25%, ${UNO_HEX.y} 0 50%, ${UNO_HEX.g} 0 75%, ${UNO_HEX.b} 0)` }
        }
      />
      <span
        aria-hidden
        className={`absolute inset-0 grid place-items-center leading-none ${big}`}
        style={{ color: d.color ? bg : '#fff', textShadow: d.color ? '0 1px 0 rgb(0 0 0 / 0.15)' : '0 1px 2px rgb(0 0 0 / 0.8)' }}
      >
        {sym}
      </span>
      {size !== 'mini' && (
        <>
          <span aria-hidden className="absolute top-0.5 left-1 text-[10px] leading-none text-white drop-shadow">
            {d.kind === 'num' || d.kind === 'seven' ? sym : d.kind === 'draw2' || d.kind === 'wild4' ? sym : d.kind === 'up' ? 'UP' : ''}
          </span>
          {/* 7 Đổi bài: mũi tên chiều chuyền bài */}
          {d.kind === 'seven' && (
            <span aria-hidden className="absolute right-0.5 bottom-0 text-sm leading-none text-white drop-shadow">
              {d.dir === 1 ? '↻' : '↺'}
            </span>
          )}
        </>
      )}
    </Tag>
  )
}

/**
 * Giữa bàn Uno: bộ bài úp (kéo về phía mình để rút — như Xì dách; lá Đập tay thì chạm vào để đập), lá trên cùng,
 * màu đang theo, chiều chơi, và avatar những người đã đập tay ngay cạnh bộ bài.
 */
export function UnoCenter({
  state,
  players,
  me,
  onDraw,
  onSlap,
}: {
  state: UnoState
  players: Record<ID, Player>
  me: ID | null
  onDraw: () => void
  onSlap: () => void
}) {
  const name = (id: ID) => players[id]?.name ?? '?'
  const done = state.turn === null
  const canDraw = !!me && state.turn === me
  const sl = state.slap
  /** Avatar cạnh bộ bài: đang đập thì những người đã đập; vừa xong thì cả người chậm (rút 2). */
  const slapShow = sl ? { tapped: sl.tapped, late: [] as ID[] } : state.slapDone
  const canSlap = !!me && !!sl && sl.need.includes(me) && !sl.tapped.includes(me)
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const layers = Math.max(1, Math.min(5, Math.ceil(state.deck.length / 12)))
  const top = topCard(state)
  const a = state.attack
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        {/* Bộ bài úp */}
        <div className="relative">
          <div
            role="button"
            data-guide="uno-deck"
            tabIndex={canDraw || canSlap ? 0 : -1}
            aria-label={
              canSlap ? 'Bộ bài — chạm để đập tay' : canDraw ? 'Bộ bài — kéo về phía bạn để rút' : `Bộ bài · còn ${state.deck.length} lá`
            }
            onKeyDown={(e) => e.key === 'Enter' && (canSlap ? onSlap() : canDraw && onDraw())}
            className={`relative h-14 w-10 touch-none select-none ${canDraw ? 'cursor-grab' : canSlap ? 'cursor-pointer' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              // Đập tay: chạm là tính ngay (càng nhanh càng tốt)
              if (canSlap) return onSlap()
              if (!canDraw) return
              e.currentTarget.setPointerCapture(e.pointerId)
              start.current = { x: e.clientX, y: e.clientY }
              setPull({ x: 0, y: 0 })
            }}
            onPointerMove={(e) => {
              if (!start.current) return
              setPull({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
            }}
            onPointerUp={(e) => {
              const s0 = start.current
              start.current = null
              setPull(null)
              if (s0 && e.clientY - s0.y > PULL) onDraw()
            }}
            onPointerCancel={() => {
              start.current = null
              setPull(null)
            }}
          >
            {Array.from({ length: layers }, (_, i) => (
              <CardBack
                key={i}
                className="absolute inset-0 size-full rounded-md"
                style={{ transform: `translate(${-i * 0.6}px, ${-i}px)` }}
              />
            ))}
            {canSlap ? (
              <span aria-hidden className="pointer-events-none absolute -inset-2 animate-pulse rounded-xl ring-4 ring-berry" />
            ) : (
              canDraw &&
              !pull && <span aria-hidden className="pointer-events-none absolute -inset-1 animate-pulse rounded-lg ring-2 ring-lemon" />
            )}
            {canSlap && (
              <span className="font-display pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce text-sm font-extrabold whitespace-nowrap text-berry">
                ĐẬP! ✋
              </span>
            )}
            {pull && (
              <CardBack
                className={`pointer-events-none absolute inset-0 z-10 size-full rounded-md shadow-xl ${pull.y > PULL ? 'drop-shadow-[0_0_10px_rgb(255_210_63/0.9)]' : ''}`}
                style={{ transform: `translate(${pull.x}px, ${Math.max(-10, pull.y)}px) rotate(${pull.x / 12}deg) scale(1.08)` }}
              />
            )}
          </div>
          {/* Ai đã đập tay: avatar xếp ngay cạnh bộ bài */}
          {slapShow && slapShow.tapped.length + slapShow.late.length > 0 && (
            <span className="absolute top-1/2 right-[calc(100%+4px)] flex -translate-y-1/2 flex-col items-end gap-0.5">
              {slapShow.tapped.map((id, i) => (
                <span
                  key={id}
                  title={`${name(id)} đập thứ ${i + 1}`}
                  className="pop flex items-center gap-0.5 rounded-full border border-lemon bg-plum py-px pr-1 pl-px text-[10px] font-bold whitespace-nowrap text-lemon"
                >
                  <span className="text-sm leading-none">{players[id]?.emoji ?? '?'}</span>✋
                </span>
              ))}
              {slapShow.late.map((id) => (
                <span
                  key={id}
                  title={`${name(id)} chậm — rút 2`}
                  className="pop flex items-center gap-0.5 rounded-full border border-berry bg-berry/25 py-px pr-1 pl-px text-[10px] font-bold whitespace-nowrap text-berry"
                >
                  <span className="text-sm leading-none">{players[id]?.emoji ?? '?'}</span>+2
                </span>
              ))}
            </span>
          )}
        </div>
        {/* Lá trên cùng, viền theo màu đang phải theo */}
        <span
          className="relative rounded-xl p-1"
          style={{ boxShadow: `0 0 0 3px ${UNO_HEX[state.color]}, 0 0 18px ${UNO_HEX[state.color]}` }}
        >
          <UnoCard key={top} card={top} size="top" />
          {/* Chiều chơi */}
          <span
            aria-label={state.dir === 1 ? 'Chiều kim đồng hồ' : 'Ngược chiều kim đồng hồ'}
            className="absolute -top-2.5 -right-3.5 grid size-6 place-items-center rounded-full bg-night/90 text-base leading-none font-bold text-lemon"
          >
            {state.dir === 1 ? '↻' : '↺'}
          </span>
        </span>
      </div>
      <span className="text-[11px] whitespace-nowrap">
        {done ? (
          <b className="text-lemon">🏆 {state.winner ? name(state.winner) : '?'} thắng!</b>
        ) : (
          <>
            <span className="font-semibold" style={{ color: UNO_HEX[state.color] }}>
              ● {COLOR_NAME[state.color]}
            </span>
            <span className="text-muted"> · lượt {name(state.turn!)}</span>
          </>
        )}
      </span>
      {a && !done && (
        <span className="rounded-full bg-berry/25 px-2 text-[11px] font-bold whitespace-nowrap text-berry">
          {a.kind === 'draw' ? `+${a.n} đang chờ` : a.kind === 'tornado' ? `🌪️ Lốc xoáy ${COLOR_NAME[a.color]}` : `⬆ Leo số ≥ ${a.top}`}
        </span>
      )}
      {canDraw && !a && state.drawn === undefined && (
        <span className="text-[10px] font-semibold text-lemon">↓ Kéo bộ bài về phía bạn để rút</span>
      )}
    </div>
  )
}

/** Dòng hướng dẫn trên đầu khung bài: đòn mình đang phải đỡ, lượt đập tay, hay chức năng lá đặc biệt vừa đánh. */
function helpLine(s: UnoState, me: ID | null, name: (id: ID) => string): { tone: 'warn' | 'info'; card?: Card; text: ReactNode } | null {
  const a = s.attack
  if (s.turn === null) return null
  if (a && s.turn === me) {
    if (a.kind === 'draw')
      return {
        tone: 'warn',
        card: topCard(s),
        text: (
          <>
            Bạn bị cộng <b>{a.n} lá</b>: nối +2 / +4, phản bằng Đổi chiều {COLOR_NAME[s.color]}, đẩy đi bằng Khiên — hoặc kéo bộ bài để rút{' '}
            {a.n}.
          </>
        ),
      }
    if (a.kind === 'tornado')
      return {
        tone: 'warn',
        card: topCard(s),
        text: (
          <>
            Lốc xoáy {COLOR_NAME[a.color]}: đỡ bằng Khiên — hoặc kéo bộ bài, rút tới khi ra lá {COLOR_NAME[a.color]}.
          </>
        ),
      }
    return {
      tone: 'warn',
      card: topCard(s),
      text: (
        <>
          Leo số: đánh lá số từ <b>{a.top}</b> trở lên (màu nào cũng được) hoặc Khiên — không thì rút {Math.max(1, a.top)} lá.
        </>
      ),
    }
  }
  if (s.slap && me && s.slap.need.includes(me) && !s.slap.tapped.includes(me))
    return { tone: 'warn', card: topCard(s), text: <>✋ Đập tay! Chạm bộ bài giữa bàn ngay — ai chậm nhất rút 2.</> }
  const last = s.last
  if (last && UNO_CARDS[last.card].kind !== 'num')
    return {
      tone: 'info',
      card: last.card,
      text: (
        <>
          {last.by === me ? 'Bạn' : name(last.by)} đánh{last.extra?.length ? ` (bỏ theo ${last.extra.length} lá)` : ''} —{' '}
          <HelpText kind={UNO_CARDS[last.card].kind} />
        </>
      ),
    }
  return null
}

/**
 * Khung bài Uno dưới đáy: hướng dẫn lá đặc biệt / đòn đang đỡ, đồng hồ lượt, bài trên tay (lá đánh được sáng lên —
 * chạm chọn, chạm lần nữa hoặc bấm Đánh), nút UNO!, Bỏ lượt (vừa rút), Ván mới (host, khi xong).
 */
export function UnoPanel({
  state,
  players,
  me,
  isHost,
  dealing,
  turnKey,
  onPlay,
  onPass,
  onSay,
  onNext,
  menu,
}: {
  state: UnoState
  players: Record<ID, Player>
  me: ID | null
  isHost: boolean
  dealing?: boolean
  turnKey?: string | null
  onPlay: (card: Card, color?: UnoColor) => boolean
  onPass: () => void
  onSay: () => void
  onNext: () => void
  menu: ReactNode
}) {
  const name = (id: ID) => players[id]?.name ?? '?'
  const inGame = !!me && state.order.includes(me)
  const hand = me && inGame ? sortHand(state.hands[me] ?? []) : []
  const myTurn = !!me && state.turn === me
  const done = state.turn === null
  const playable = me ? playableCards(state, me) : []
  const [sel, setSel] = useState<Card | null>(null)
  const [picking, setPicking] = useState<Card | null>(null)
  const picked = sel !== null && playable.includes(sel) ? sel : null
  const said = !!me && state.uno.includes(me)
  const canSay = inGame && !done && hand.length <= 2 && !said
  const left = useTurnLeft(myTurn ? (turnKey ?? null) : null)
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

  const play = (c: Card) => {
    if (isWild(c)) return setPicking(c)
    if (onPlay(c)) setSel(null)
  }
  const tap = (c: Card) => {
    if (!playable.includes(c)) return
    if (picked === c) play(c)
    else setSel(c)
  }
  const help = helpLine(state, me, name)

  if (dealing)
    return (
      <section className="mb-2 flex items-center gap-2 rounded-3xl border border-line/60 bg-night/90 px-3 py-3 backdrop-blur">
        <p className="flex-1 text-center text-sm font-semibold text-lemon">Đang chia bài…</p>
        {menu}
      </section>
    )

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-1.5 pb-2 backdrop-blur">
      {help && (
        <div
          key={`${state.step}:${state.slap?.id ?? ''}`}
          role="status"
          className={`pop mb-1.5 flex items-center gap-2 rounded-2xl border px-2 py-1 text-[11px] leading-snug ${
            help.tone === 'warn' ? 'border-berry/60 bg-berry/15' : 'border-sky/50 bg-sky/10'
          }`}
        >
          {help.card !== undefined && <UnoCard card={help.card} size="mini" />}
          <p className="min-w-0 flex-1">{help.text}</p>
        </div>
      )}
      {done ? (
        <div className="flex items-center gap-2">
          {menu}
          <p className="font-display flex-1 text-center text-lg font-extrabold text-lemon">
            🏆 {state.winner === me ? 'Bạn thắng!' : `${state.winner ? name(state.winner) : '?'} thắng!`}
          </p>
          {isHost ? (
            <Button variant="primary" className="font-display px-4 text-lg" onClick={onNext}>
              Ván mới
            </Button>
          ) : (
            <span className="text-xs text-muted">Chờ host chia ván mới</span>
          )}
        </div>
      ) : !inGame ? (
        <div className="flex items-center gap-2">
          {menu}
          <p className="flex-1 text-center text-xs text-muted">Bạn không chơi ván này · lượt {name(state.turn!)}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 text-xs">
            <p className={`truncate text-center ${myTurn ? 'font-semibold text-lemon' : 'text-muted'}`}>
              {myTurn
                ? state.drawn !== undefined
                  ? 'Vừa rút được lá đánh được — đánh luôn hoặc Bỏ lượt'
                  : state.attack
                    ? 'Lượt bạn — đỡ hoặc kéo bộ bài để chịu phạt'
                    : playable.length
                      ? 'Lượt bạn — chạm lá sáng để chọn, chạm lần nữa để đánh'
                      : 'Lượt bạn — không có lá đánh được, kéo bộ bài để rút'
                : `Chờ ${name(state.turn!)}… · bạn còn ${hand.length} lá`}
            </p>
            {secs !== null && (
              <span
                className={`num shrink-0 rounded-full px-2 py-0.5 font-bold ${urgent ? 'animate-pulse bg-berry/20 text-berry' : 'bg-plum-2 text-cream'}`}
              >
                {secs}s
              </span>
            )}
          </div>
          {left !== null && (
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-plum-2">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-berry' : 'bg-lemon'}`}
                style={{ width: `${Math.max(0, Math.min(100, (left / TURN_MS) * 100))}%` }}
              />
            </div>
          )}
          {/* Bài trên tay: xếp theo màu, chồng lên nhau, nhiều thì vuốt ngang */}
          <div className="-mx-1 mt-1 overflow-x-auto overflow-y-visible px-1 pt-3.5 pb-1 [scrollbar-width:none]">
            <div className="mx-auto flex w-max items-end">
              {hand.map((c, i) => (
                <span key={c} className={`pop ${i ? '-ml-4' : ''}`}>
                  <UnoCard
                    card={c}
                    selected={picked === c}
                    glow={myTurn && playable.includes(c)}
                    dim={myTurn && !playable.includes(c)}
                    onClick={() => tap(c)}
                  />
                </span>
              ))}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {menu}
            <button
              type="button"
              data-guide="uno-call"
              onClick={onSay}
              disabled={!canSay}
              aria-label="Hô UNO"
              className={`font-display shrink-0 rounded-2xl border-2 px-3 py-1.5 text-base leading-none font-extrabold italic transition active:scale-95 ${
                said
                  ? 'border-mint/60 bg-mint/15 text-mint'
                  : canSay
                    ? 'animate-pulse border-berry bg-berry text-white shadow-[0_0_14px_rgb(255_92_122/0.6)]'
                    : 'border-line/60 bg-night/40 text-muted opacity-60'
              }`}
            >
              {said ? '✓ UNO' : 'UNO!'}
            </button>
            <span className="flex-1" />
            {myTurn && state.drawn !== undefined && (
              <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={onPass}>
                Bỏ lượt
              </Button>
            )}
            {picked !== null && (
              <Button variant="primary" className="font-display px-5 py-1.5 text-lg" onClick={() => play(picked)}>
                Đánh
              </Button>
            )}
          </div>
        </>
      )}
      {picking !== null && (
        <ColorPicker
          card={picking}
          onPick={(color) => {
            const c = picking
            setPicking(null)
            if (onPlay(c, color)) setSel(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </section>
  )
}

/** Đánh lá đen: chọn màu tiếp theo. */
function ColorPicker({ card, onPick, onClose }: { card: Card; onPick: (c: UnoColor) => void; onClose: () => void }) {
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Chọn màu" className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75" onClick={onClose} />
      <div className="pop relative w-full max-w-xs rounded-3xl border-2 border-lemon bg-plum-2 p-4 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-3">
          <UnoCard card={card} size="top" />
          <h2 className="font-display text-xl font-bold">Chọn màu</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {UNO_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              className="font-display rounded-2xl border-2 border-white/80 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-95"
              style={{ background: UNO_HEX[c], textShadow: '0 1px 2px rgb(0 0 0 / 0.5)' }}
            >
              {COLOR_NAME[c]}
            </button>
          ))}
        </div>
        <Button className="mt-3 w-full" onClick={onClose}>
          Thôi
        </Button>
      </div>
    </div>,
    document.body,
  )
}

/** Bảng chức năng các lá (trong popup Rule ?). */
export function UnoRules({ expansion }: { expansion: boolean }) {
  // Một lá mẫu cho mỗi loại (lá đỏ nếu có màu)
  const sample = (kind: UnoKind) => {
    const i = UNO_CARDS.findIndex((d) => d.kind === kind && (d.color === 'r' || d.color === null || kind === 'seven'))
    return i
  }
  const base: UnoKind[] = ['skip', 'reverse', 'draw2', 'wild', 'wild4']
  const ext: UnoKind[] = ['tornado', 'discard', 'seven', 'shield', 'up', 'slap']
  const row = (k: UnoKind) => (
    <li key={k} className="flex items-start gap-2 rounded-2xl bg-night/40 px-2 py-1.5">
      <UnoCard card={sample(k)} size="mini" />
      <span className="min-w-0 flex-1 text-[11px] leading-snug">
        <HelpText kind={k} />
      </span>
    </li>
  )
  return (
    <div className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto pr-1 text-left">
      <p className="text-xs text-muted">
        Mỗi người 7 lá; đánh lá cùng màu / cùng số / cùng ký hiệu, lá đen lúc nào cũng được. Không đánh thì kéo bộ bài để rút 1 lá. Còn 1 lá
        phải hô <b className="text-berry">UNO!</b> — bị bắt thì rút 2, bắt hớ thì người bắt rút 2. Hết bài trước là thắng.
      </p>
      <ul className="space-y-1.5">{base.map(row)}</ul>
      <p className="pt-1 text-xs font-bold text-sky">
        Bộ mở rộng (Uno Storm + Đập tay){expansion ? '' : ' — đang tắt'} · {UNO_CARDS.length - BASE_COUNT} lá
      </p>
      <ul className={`space-y-1.5 ${expansion ? '' : 'opacity-50'}`}>{ext.map(row)}</ul>
    </div>
  )
}
