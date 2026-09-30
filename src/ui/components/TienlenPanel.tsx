import { useState } from 'react'
import { cardLabel, comboOf, COMBO_LABEL, isRed, placeOf, type Card, type TienlenCards } from '../../core/games/tienlenPlay'
import type { ID, Player, Round } from '../../core/types'
import { Button } from './kit'

/** Một lá bài. */
export function PlayingCard({ card, selected, onClick, small }: { card: Card; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const label = cardLabel(card)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`num flex shrink-0 flex-col items-start rounded-lg border bg-cream font-bold leading-none shadow transition ${
        small ? 'h-11 w-8 px-1 py-1 text-xs' : 'h-16 w-11 px-1.5 py-1.5 text-sm'
      } ${isRed(card) ? 'text-berry' : 'text-night'} ${selected ? '-translate-y-3 border-lemon ring-2 ring-lemon' : 'border-night/20'}`}
    >
      <span>{label.slice(0, -1)}</span>
      <span className={small ? 'text-sm' : 'text-lg'}>{label.slice(-1)}</span>
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
  onPayout,
}: {
  round: Round
  cards: TienlenCards
  players: Record<ID, Player>
  me: ID | null
  isHost: boolean
  onPlay: (id: ID, cards: Card[]) => boolean
  onPass: (id: ID) => void
  onPayout: () => void
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

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-1 pb-2 backdrop-blur">
      {done ? (
        isHost && !paid ? (
          <Button variant="primary" className="mt-1 w-full" onClick={onPayout}>
            💰 Trả kẹo theo hạng
          </Button>
        ) : (
          <p className="text-center text-xs text-muted">{paid ? 'Đã trả kẹo theo hạng — host bấm Chốt ván.' : 'Chờ host trả kẹo theo hạng.'}</p>
        )
      ) : !viewer ? (
        <p className="text-center text-xs text-muted">Bạn không chơi ván này · lượt {name(cards.turn!)}</p>
      ) : (
        <>
          <p className="text-center text-xs text-muted">
            {myTurn ? (
              <b className="text-lemon">Lượt bạn</b>
            ) : cards.finished.includes(viewer) ? (
              `Bạn đã về ${placeOf(cards, viewer)} 🎉`
            ) : (
              `Chờ ${name(cards.turn!)}…`
            )}
            {combo ? ` · ${COMBO_LABEL[combo.type]}` : picked.length ? ' · chưa thành bộ' : ''}
          </p>
          <div className="mt-1 flex justify-center pt-3">
            <div className="flex -space-x-5">
              {hand.map((c) => (
                <PlayingCard
                  key={c}
                  card={c}
                  selected={picked.includes(c)}
                  onClick={() => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                />
              ))}
            </div>
          </div>
          {myTurn && (
            <div className="mt-2 flex gap-2">
              <Button className="px-3" disabled={!cards.table} onClick={() => onPass(viewer)}>
                Bỏ lượt
              </Button>
              <Button className="px-3" disabled={!picked.length} onClick={() => setPicked(() => [])}>
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
