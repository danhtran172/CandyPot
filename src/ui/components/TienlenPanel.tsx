import { useState, type ReactNode } from 'react'
import { cardLabel, comboOf, COMBO_LABEL, isRed, placeOf, playableCards, type Card, type TienlenCards } from '../../core/games/tienlenPlay'
import type { ID, Player, Round } from '../../core/types'
import { Button } from './kit'

/** Một lá bài. */
export function PlayingCard({
  card,
  selected,
  onClick,
  small,
  dim,
}: {
  card: Card
  selected?: boolean
  onClick?: () => void
  small?: boolean
  /** Lá không đi được nước này: mờ, không bấm được. */
  dim?: boolean
}) {
  const label = cardLabel(card)
  const rank = label.slice(0, -1)
  const suit = label.slice(-1)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick || dim}
      aria-pressed={selected}
      aria-label={label}
      className={`num relative shrink-0 rounded-lg border-2 bg-cream font-bold leading-none shadow-md transition duration-150 ${
        small ? 'h-12 w-9' : 'h-[4.2rem] w-[2.65rem]'
      } ${isRed(card) ? 'text-berry' : 'text-night'} ${
        selected ? '-translate-y-2.5 border-lemon shadow-[0_0_0_2px_var(--color-lemon),0_8px_16px_rgb(0_0_0/0.4)]' : 'border-white/70'
      } ${dim ? 'opacity-35 saturate-0' : onClick ? 'active:scale-95' : ''}`}
    >
      {/* Góc trên trái: hạng + chất nhỏ; giữa lá: chất to — giống các app đánh bài */}
      <span className={`absolute top-1 left-1 flex flex-col items-center ${small ? 'text-[11px]' : 'text-sm'}`}>
        <span className="tracking-tighter">{rank}</span>
        <span className={small ? 'text-[10px]' : 'text-xs'}>{suit}</span>
      </span>
      <span className={`absolute right-1 bottom-0.5 ${small ? 'text-lg' : 'text-2xl'}`}>{suit}</span>
    </button>
  )
}

/**
 * Tiến lên bài trong app (thanh dưới đáy): bài trên tay người xem (chọn lá → Đánh / Bỏ lượt), xếp hạng khi xong.
 * Chỉ bàn nhiều người: mỗi máy chỉ thấy bài của mình.
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
  /** Host: chốt ván (kẹo đã tự tính) và chia ván mới. */
  onNext: () => void
  /** Nút ⋯ mở popup các chức năng còn lại. */
  menu: ReactNode
}) {
  const viewer = me && cards.order.includes(me) ? me : null
  // Lá đang chọn — sang lượt khác thì tự bỏ chọn
  const [sel, setSel] = useState<{ turn: ID | null; cards: Card[] }>({ turn: null, cards: [] })
  const picked = sel.turn === cards.turn ? sel.cards : []
  const setPicked = (fn: (p: Card[]) => Card[]) =>
    setSel((prev) => ({ turn: cards.turn, cards: fn(prev.turn === cards.turn ? prev.cards : []) }))
  const name = (id: ID) => players[id]?.name ?? '?'
  const done = cards.turn === null
  const paid = round.moves.some((m) => m.label.startsWith('Bài:'))
  const hand = viewer ? (cards.hands[viewer] ?? []) : []
  const myTurn = !!viewer && cards.turn === viewer
  const combo = comboOf(picked)
  // Tới lượt: làm mờ các lá không nằm trong bộ nào chặn được bàn
  const playable = myTurn ? playableCards(hand, cards.table?.cards ?? null, cards.mustOpen) : null

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
          <p className="flex-1 text-center text-xs text-muted">Bạn không chơi ván này · lượt {name(cards.turn!)}</p>
          {menu}
        </div>
      ) : (
        <>
          <p className="text-center text-xs text-muted">
            {myTurn ? (
              <b className="text-lemon">Lượt bạn{playable && !playable.size ? ' — không chặn được, Bỏ lượt' : ''}</b>
            ) : cards.finished.includes(viewer) ? (
              `Bạn đã về ${placeOf(cards, viewer)} 🎉`
            ) : (
              `Chờ ${name(cards.turn!)}…`
            )}
            {combo ? ` · ${COMBO_LABEL[combo.type]}` : picked.length ? ' · chưa thành bộ' : ''}
          </p>
          {/* Không đè lá: nhiều hơn 7 lá thì xếp 2 hàng (hàng trên nhiều hơn), lá nào cũng thấy trọn */}
          <div className="mt-1 flex flex-col items-center gap-1.5 pt-3">
            {handRows(hand).map((row, i) => (
              <div key={i} className="flex justify-center gap-1">
                {row.map((c) => (
                  <PlayingCard
                    key={c}
                    card={c}
                    selected={picked.includes(c)}
                    dim={!!playable && !playable.has(c)}
                    onClick={() => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                  />
                ))}
              </div>
            ))}
          </div>
          {!myTurn && <div className="mt-2 flex justify-end">{menu}</div>}
          {myTurn && (
            <div className="mt-2 flex gap-2">
              {menu}
              <Button className="px-3 whitespace-nowrap" disabled={!cards.table} onClick={() => onPass(viewer)}>
                Bỏ lượt
              </Button>
              <Button className="px-3 whitespace-nowrap" disabled={!picked.length} onClick={() => setPicked(() => [])}>
                Bỏ chọn
              </Button>
              <Button
                variant="primary"
                className="font-display flex-1 text-lg"
                disabled={!combo}
                onClick={() => {
                  if (onPlay(viewer, picked)) setPicked(() => [])
                }}
              >
                Đánh
              </Button>
            </div>
          )}
        </>
      )}
    </section>
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

/** Chia bài trên tay thành hàng vừa màn hình điện thoại: tối đa 7 lá một hàng. */
function handRows(hand: Card[]): Card[][] {
  if (hand.length <= 7) return [hand]
  const top = Math.ceil(hand.length / 2)
  return [hand.slice(0, top), hand.slice(top)]
}
