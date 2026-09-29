import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GAME_ICONS, GAME_ORDER, GAMES } from '../../core/games'
import { netOf } from '../../core/ledger'
import { movesNet, openRound, potOf } from '../../core/round'
import { suggestOptions } from '../../core/suggest'
import type { GameType, ID, Option } from '../../core/types'
import { actions } from '../../store'
import { AmountSheet } from '../components/AmountSheet'
import { Board, flyCandy, type Seat } from '../components/Board'
import { Button, Card, Chip, TopBar, Who } from '../components/kit'
import { useSession } from '../components/useSession'
import { playCount, playerMap, roundNumber } from '../format'

export function Table() {
  const session = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [pending, setPending] = useState<{ from: ID; to: ID } | null>(null)
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null)

  const game = session.games.find((g) => g.id === params.get('g')) ?? session.games[session.games.length - 1]
  const round = game ? openRound(session, game.id) : undefined
  const players = playerMap(session)
  const net = netOf(session)
  const base = `/s/${session.id}`

  const flash = (text: string, bad = false) => {
    setToast({ text, bad })
    setTimeout(() => setToast(null), 2500)
  }

  const addGame = (type: GameType) => {
    const id = actions().addGame(type)
    setParams({ g: id }, { replace: true })
  }

  const onTransfer = useCallback((from: ID, to: ID) => setPending({ from, to }), [])

  const pick = (o: Option) => {
    if (!game || !pending) return
    const errors = actions().addMove(game.id, pending.from, pending.to, o.amount, round ? o.label : 'Chuyển tay')
    if (errors.length) flash(errors[0], true)
    else flyCandy(pending.from, pending.to, o.amount)
    setPending(null)
  }

  const closeRound = () => {
    if (!game) return
    const errors = actions().closeRound(game.id)
    if (errors.length) flash(errors[0], true)
    else flash('Đã chốt ván — lời/lỗ đã cập nhật.')
  }

  const cancelRound = () => {
    if (!game || !round) return
    if (confirm('Hủy ván này? Các lượt kéo kẹo trong ván sẽ bị bỏ, không tính gì.')) actions().deleteRound(game.id, round.id)
  }

  const roundDelta = round ? movesNet(round.moves) : {}
  const visible = round
    ? session.players.filter((p) => round.participants.includes(p.id))
    : session.players.filter((p) => p.active)

  const seats: Seat[] = visible.map((p) => ({
    player: p,
    total: net[p.id],
    round: round ? (roundDelta[p.id] ?? 0) : undefined,
    badge:
      round?.dealer === p.id
        ? '🎩 Nhà cái'
        : game?.type === 'xidach' && round?.stakes[p.id] !== undefined
          ? `cược ${round.stakes[p.id]}`
          : undefined,
  }))

  return (
    <main className="pb-28">
      <TopBar
        title={session.name}
        back="/"
        right={
          <Link to={`${base}/players`} className="rounded-full bg-plum-2 px-3 py-1.5 text-sm font-semibold">
            👥 Người chơi
          </Link>
        }
      />

      <div className="flex items-center gap-2">
        <nav aria-label="Game" className="no-scrollbar -ml-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pl-4">
          {session.games.map((g) => (
            <Chip key={g.id} active={g.id === game?.id} onClick={() => setParams({ g: g.id }, { replace: true })}>
              {GAME_ICONS[g.type]} {g.name}
              {openRound(session, g.id) && <span className="ml-1 inline-block size-2 rounded-full bg-mint" />}
            </Chip>
          ))}
        </nav>
        {session.games.length > 0 && (
          <details className="relative shrink-0">
            <summary className="cursor-pointer list-none rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-muted">
              + Game
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 space-y-1 rounded-2xl border border-line bg-plum-2 p-2 shadow-xl">
              {GAME_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-plum"
                  onClick={(e) => {
                    ;(e.currentTarget.closest('details') as HTMLDetailsElement).open = false
                    addGame(t)
                  }}
                >
                  {GAME_ICONS[t]} {GAMES[t].label}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {!game ? (
        <Card className="mt-4 text-center">
          <p className="font-display text-xl font-bold">Chơi game gì trước?</p>
          <p className="mt-1 text-sm text-muted">Một buổi có thể chơi nhiều game, thêm game khác lúc nào cũng được.</p>
          <div className="mt-4 grid gap-2">
            {GAME_ORDER.map((t) => (
              <Button key={t} className="py-3 text-lg" onClick={() => addGame(t)}>
                {GAME_ICONS[t]} {GAMES[t].label}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <div className="mt-2 mb-2 flex items-center justify-between gap-2 text-sm">
            {round ? (
              <span className="font-semibold">
                <span className="mr-1.5 inline-block size-2 rounded-full bg-mint align-middle" />
                Ván {roundNumber(game, round)} đang chơi
                {game.type === 'tienlen' && <span className="text-muted"> · cược {round.bet}</span>}
              </span>
            ) : (
              <span className="text-muted">{playCount(game) ? `Đã chốt ${playCount(game)} ván` : 'Chưa có ván nào'}</span>
            )}
            <Link to={`${base}/g/${game.id}/settings`} className="font-semibold text-muted">
              ⚙ Luật
            </Link>
          </div>

          <Board seats={seats} pot={round && game.type === 'poker' ? potOf(round) : undefined} onTransfer={onTransfer} />

          <p className="mt-2 text-center text-xs text-muted">
            {round
              ? 'Kéo túi kẹo của người trả thả vào người nhận — hoặc bấm người trả rồi bấm người nhận.'
              : 'Chưa mở ván: kéo kẹo giữa hai người sẽ được ghi là chuyển tay.'}
          </p>

          {round && game.type === 'xidach' && (
            <Card className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as const).map((m) => (
                  <Button key={`eat${m}`} className="text-sm" onClick={() => actions().dealerAll(game.id, 'eat', m)}>
                    Cái ăn cả bàn ×{m}
                  </Button>
                ))}
                {([1, 2] as const).map((m) => (
                  <Button key={`pay${m}`} className="text-sm" onClick={() => actions().dealerAll(game.id, 'pay', m)}>
                    Cái đền cả bàn ×{m}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {round && round.moves.length > 0 && (
            <Card className="mt-3 p-3">
              <h2 className="font-display mb-1 px-1 font-bold">Ván này</h2>
              <ul>
                {[...round.moves].reverse().map((m) => (
                  <li key={m.id} className="flex items-center gap-2 border-b border-line/40 px-1 py-1.5 text-sm last:border-0">
                    <Who player={players[m.from]} className="min-w-0 font-semibold" />
                    <span className="text-muted">→</span>
                    <Who player={players[m.to]} className="min-w-0 font-semibold" />
                    <span className="candy num ml-auto text-sm">{m.amount}</span>
                    <button
                      type="button"
                      aria-label="Hoàn tác lượt này"
                      className="px-1.5 text-muted hover:text-berry"
                      onClick={() => actions().removeMove(game.id, round.id, m.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-lg gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
            {round ? (
              <>
                <Button variant="danger" className="bg-night/90" onClick={cancelRound}>
                  Hủy ván
                </Button>
                <Button variant="primary" className="font-display flex-1 py-3.5 text-xl" onClick={closeRound}>
                  Chốt ván{game.type === 'poker' && potOf(round) > 0 ? ` (pot ${potOf(round)})` : ''}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                className="font-display flex-1 py-3.5 text-xl"
                onClick={() => navigate(`${base}/g/${game.id}/open`)}
              >
                + Mở ván
              </Button>
            )}
          </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          className={`pop fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-xl ${
            toast.bad ? 'bg-berry text-night' : 'bg-mint text-night'
          }`}
        >
          {toast.text}
        </div>
      )}

      {pending && game && (
        <AmountSheet
          from={players[pending.from]}
          to={players[pending.to]}
          options={suggestOptions({
            game,
            round: round ?? null,
            from: pending.from,
            to: pending.to,
          })}
          onPick={pick}
          onClose={() => setPending(null)}
        />
      )}
    </main>
  )
}
