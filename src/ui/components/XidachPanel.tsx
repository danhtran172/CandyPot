import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  DEALER_MIN,
  describe,
  MAX_CARDS,
  PLAYER_MIN,
  resultText,
  score,
  type XidachCards,
  type XidachResult,
} from '../../core/games/xidachPlay'
import type { ID, Player, Round } from '../../core/types'
import { TURN_MS, useTurnLeft } from '../turnClock'
import { CardBack } from './CardBack'
import { Button } from './kit'
import { PlayingCard } from './TienlenPanel'

/** Kéo quá bấy nhiêu px (về phía mình / đẩy lên) thì tính là rút / dằn. */
const PULL = 50

const TONE: Record<XidachResult['outcome'], string> = { win: 'text-mint', lose: 'text-berry', draw: 'text-sky' }

/**
 * Giữa bàn Xì dách: bộ bài úp. Tới lượt mình thì bộ bài sáng lên — kéo một lá về phía mình (xuống dưới) để rút.
 */
export function XidachCenter({
  cards,
  players,
  me,
  onDraw,
}: {
  cards: XidachCards
  players: Record<ID, Player>
  me: ID | null
  onDraw: () => void
}) {
  const name = (id: ID) => players[id]?.name ?? '?'
  const canDraw = !!me && cards.turn === me && (cards.hands[me]?.length ?? 0) < MAX_CARDS && cards.deck.length > 0
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const layers = Math.max(1, Math.ceil(cards.deck.length / 8))
  const status =
    cards.turn === null ? 'Xong ván' : cards.turn === cards.dealer ? `Lượt cái ${name(cards.dealer)}` : `Lượt ${name(cards.turn)} rút bài`
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="button"
        tabIndex={canDraw ? 0 : -1}
        aria-label={canDraw ? 'Bộ bài — kéo về phía bạn để rút một lá' : `Bộ bài · còn ${cards.deck.length} lá`}
        onKeyDown={(e) => canDraw && e.key === 'Enter' && onDraw()}
        className={`relative h-14 w-10 touch-none select-none ${canDraw ? 'cursor-grab' : ''}`}
        onPointerDown={(e) => {
          if (!canDraw) return
          e.stopPropagation()
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
          <CardBack key={i} className="absolute inset-0 size-full rounded-md" style={{ transform: `translate(${-i * 0.6}px, ${-i}px)` }} />
        ))}
        {/* Tới lượt: viền sáng nhấp nháy nhẹ quanh bộ bài */}
        {canDraw && !pull && (
          <span aria-hidden className="pointer-events-none absolute -inset-1 animate-pulse rounded-lg ring-2 ring-lemon" />
        )}
        {/* Lá đang kéo theo ngón tay */}
        {pull && (
          <CardBack
            className={`pointer-events-none absolute inset-0 z-10 size-full rounded-md shadow-xl transition-[filter] ${
              pull.y > PULL ? 'drop-shadow-[0_0_10px_rgb(255_210_63/0.9)]' : ''
            }`}
            style={{ transform: `translate(${pull.x}px, ${Math.max(-10, pull.y)}px) rotate(${pull.x / 12}deg) scale(1.08)` }}
          />
        )}
      </div>
      <span className="text-[11px] text-muted">
        {status} · còn {cards.deck.length} lá
      </span>
      {canDraw && <span className="text-[10px] font-semibold text-lemon">↓ Kéo bài về phía bạn để rút</span>}
    </div>
  )
}

/**
 * Thanh dưới đáy Xì dách bài trong app: bài trên tay mình (lật), điểm, hướng dẫn ngắn khi tới lượt.
 * Con: kéo lá ở giữa bàn về để rút, đẩy bài trên tay lên để dằn. Cái: chạm người chơi để xét, hoặc Xét tất.
 */
export function XidachPanel({
  round,
  cards,
  players,
  me,
  isHost,
  dealing,
  turnKey,
  onStand,
  onCheckAll,
  onNext,
  menu,
  hidden,
}: {
  round: Round
  cards: XidachCards
  players: Record<ID, Player>
  me: ID | null
  isHost: boolean
  dealing?: boolean
  turnKey?: string | null
  onStand: () => void
  onCheckAll: () => void
  onNext: () => void
  menu: ReactNode
  /** Giấu bài (nút con mắt): bài úp lưng, không hiện điểm — vẫn đẩy lên để dằn / xét được. */
  hidden?: boolean
}) {
  const name = (id: ID) => players[id]?.name ?? '?'
  const inGame = !!me && (cards.order.includes(me) || cards.dealer === me)
  const isDealer = me === cards.dealer
  const hand = me && inGame ? (cards.hands[me] ?? []) : []
  const myTurn = !!me && cards.turn === me
  const done = cards.turn === null
  const result = me ? cards.settled[me] : undefined
  const sc = hand.length ? score(hand) : null
  const min = isDealer ? DEALER_MIN : PLAYER_MIN
  const short = sc?.kind === 'points' && sc.points < min
  const left = useTurnLeft(myTurn ? (turnKey ?? null) : null)
  const secs = left === null ? null : Math.max(0, Math.ceil(left / 1000))
  const urgent = secs !== null && secs <= 5
  const stake = me ? round.stakes[me] : undefined

  // Đẩy bài trên tay lên để dằn (cái: xét tất)
  const [push, setPush] = useState(0)
  const [pushing, setPushing] = useState(false)
  const from = useRef<number | null>(null)

  // Vừa được cái xét → báo kết quả một lúc
  const [flashResult, setFlashResult] = useState(false)
  const seen = useRef(!!result)
  useEffect(() => {
    if (result && !seen.current) {
      seen.current = true
      setFlashResult(true)
      navigator.vibrate?.(80)
      const t = window.setTimeout(() => setFlashResult(false), 4000)
      return () => window.clearTimeout(t)
    }
  }, [result])

  const status = done
    ? isDealer
      ? 'Đã xét xong cả bàn'
      : result
        ? null
        : 'Xong ván'
    : myTurn
      ? isDealer
        ? short
          ? `Lượt cái — chưa đủ ${DEALER_MIN}: rút thêm (Xét tất lúc này là chịu non)`
          : 'Lượt cái — chạm vào người chơi để xét, hoặc Xét tất'
        : short
          ? `Lượt bạn — chưa đủ ${PLAYER_MIN}, dằn bây giờ là non`
          : 'Lượt bạn — rút thêm hoặc đẩy bài lên để dằn'
      : !inGame
        ? `Bạn không chơi ván này · lượt ${cards.turn ? name(cards.turn) : ''}`
        : result
          ? null
          : cards.turn === cards.dealer
            ? `Chờ cái ${name(cards.dealer)} xét…`
            : cards.stood.includes(me!)
              ? `Đã dằn · chờ ${name(cards.turn!)}…`
              : `Chờ ${name(cards.turn!)}…`

  if (dealing) {
    return (
      <section className="mb-2 flex items-center gap-2 rounded-3xl border border-line/60 bg-night/90 px-3 py-3 backdrop-blur">
        <p className="flex-1 text-center text-sm font-semibold text-lemon">Đang chia bài…</p>
        {menu}
      </section>
    )
  }

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-1.5 pb-2 backdrop-blur">
      {result && (
        <div
          role="status"
          className={`mb-1 rounded-2xl border px-3 py-1.5 text-center text-sm font-bold ${flashResult ? 'pop' : ''} ${
            result.outcome === 'win'
              ? 'border-mint/60 bg-mint/15'
              : result.outcome === 'lose'
                ? 'border-berry/60 bg-berry/15'
                : 'border-sky/60 bg-sky/15'
          }`}
        >
          <span className={TONE[result.outcome]}>Cái xét: {resultText(result)}</span>
          {result.outcome !== 'draw' && stake ? (
            <span className={`num ml-1 ${TONE[result.outcome]}`}>
              ({result.outcome === 'win' ? '+' : '−'}
              {stake * result.mult} kẹo)
            </span>
          ) : null}
        </div>
      )}
      {status && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <p className={`text-center ${myTurn ? 'font-semibold text-lemon' : 'text-muted'}`}>{status}</p>
          {secs !== null && (
            <span
              className={`num shrink-0 rounded-full px-2 py-0.5 font-bold ${urgent ? 'animate-pulse bg-berry/20 text-berry' : 'bg-plum-2 text-cream'}`}
            >
              {secs}s
            </span>
          )}
        </div>
      )}
      {left !== null && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-plum-2">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-berry' : 'bg-lemon'}`}
            style={{ width: `${Math.max(0, Math.min(100, (left / TURN_MS) * 100))}%` }}
          />
        </div>
      )}
      {hand.length > 0 && (
        <div className="mt-1.5 flex items-center justify-center gap-3">
          <div
            aria-label={myTurn ? (isDealer ? 'Bài của bạn — đẩy lên để xét tất' : 'Bài của bạn — đẩy lên để dằn') : 'Bài của bạn'}
            className={`flex touch-none py-1 select-none ${myTurn ? 'cursor-grab' : ''}`}
            style={{ transform: `translateY(${push}px)`, transition: pushing ? 'none' : 'transform 0.2s ease-out' }}
            onPointerDown={(e) => {
              if (!myTurn) return
              e.currentTarget.setPointerCapture(e.pointerId)
              from.current = e.clientY
              setPushing(true)
            }}
            onPointerMove={(e) => {
              if (from.current === null) return
              setPush(Math.max(-80, Math.min(0, e.clientY - from.current)))
            }}
            onPointerUp={(e) => {
              const y0 = from.current
              from.current = null
              setPushing(false)
              setPush(0)
              if (y0 !== null && y0 - e.clientY > PULL) (isDealer ? onCheckAll : onStand)()
            }}
            onPointerCancel={() => {
              from.current = null
              setPushing(false)
              setPush(0)
            }}
          >
            {hand.map((c, i) => (
              <span key={c} className={`pop ${i ? '-ml-4' : ''}`} style={{ rotate: `${(i - (hand.length - 1) / 2) * 4}deg` }}>
                {hidden ? <CardBack className="block h-[4.5rem] w-12 rounded-lg shadow-md" /> : <PlayingCard card={c} fan />}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-center">
            {hidden ? (
              <>
                <span className="font-display text-2xl leading-none font-extrabold text-muted">?</span>
                <span className="text-[10px] text-muted">đang giấu</span>
              </>
            ) : (
              <>
                <span
                  className={`font-display text-2xl leading-none font-extrabold ${sc?.kind === 'quac' || short ? 'text-berry' : 'text-lemon'}`}
                >
                  {sc && (sc.kind === 'points' ? sc.points : describe(hand, isDealer))}
                </span>
                <span className="text-[10px] text-muted">
                  {sc?.kind === 'points' ? (short ? 'non' : 'điểm') : `${sc?.points ?? ''} điểm`}
                </span>
              </>
            )}
            {myTurn && push < -PULL / 2 && (
              <span className="mt-0.5 text-[10px] font-bold text-lemon">{isDealer ? 'Thả để xét tất' : 'Thả để dằn'}</span>
            )}
          </div>
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        {menu}
        {myTurn && !isDealer && (
          <p className="flex-1 text-center text-[11px] text-muted">↓ Kéo bài giữa bàn để rút · ↑ Đẩy bài lên để dằn</p>
        )}
        {myTurn && isDealer && (
          <>
            <p className="flex-1 text-center text-[11px] text-muted">Chạm người chơi để xét lẻ</p>
            <Button variant="primary" className="font-display px-4 text-lg" onClick={onCheckAll}>
              Xét tất
            </Button>
          </>
        )}
        {!myTurn && !done && <span className="flex-1" />}
        {done &&
          (isHost ? (
            <Button variant="primary" className="font-display flex-1 text-lg" onClick={onNext}>
              Ván mới
            </Button>
          ) : (
            <p className="flex-1 text-center text-xs text-muted">Kẹo đã tự trả theo kết quả · chờ host chia ván mới</p>
          ))}
      </div>
    </section>
  )
}
