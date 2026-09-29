import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GAME_ICONS, GAME_ORDER, GAMES } from '../../core/games'
import { netOf } from '../../core/ledger'
import { movesNet, openRound, potOf } from '../../core/round'
import { scaledOptions } from '../../core/games/options'
import { suggestOptions } from '../../core/suggest'
import { BET, DEALER, POT, type Game, type GameType, type ID, type Option, type Round } from '../../core/types'
import { actions } from '../../store'
import { AmountSheet } from '../components/AmountSheet'
import { Board, flyCandy, type Seat } from '../components/Board'
import { Button, Card, Chip, TopBar, Who } from '../components/kit'
import { useSession } from '../components/useSession'
import { playCount, playerMap, roundNumber } from '../format'
import { useMe } from '../me'

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
  const [me] = useMe(session)
  const base = `/s/${session.id}`

  const flash = (text: string, bad = false) => {
    setToast({ text, bad })
    setTimeout(() => setToast(null), 2500)
  }

  const addGame = (type: GameType) => {
    const id = actions().addGame(type)
    setParams({ g: id }, { replace: true })
  }

  /** Ván trước (đã chốt) — dùng để hiện lại cược/cái khi chưa mở ván mới. */
  const lastPlay = game && [...game.rounds].reverse().find((r) => r.kind === 'play' && r.status === 'closed')
  const dealerNow = round ? round.dealer : (lastPlay?.dealer ?? null)
  const hasPrev = !!game?.rounds.some((r) => r.kind === 'play')

  /**
   * Mở ván mới: có ván trước thì lấy lại y hệt cài đặt; chưa có thì vào màn Mở ván
   * (riêng Xì dách mở luôn — đặt cược bằng ô Bet, đổi cái bằng cách kéo 🎩).
   */
  const openNext = () => {
    if (!game) return false
    if (!hasPrev && game.type !== 'xidach') {
      navigate(`${base}/g/${game.id}/open`)
      return false
    }
    const errors = actions().quickOpen(game.id)
    if (errors.length) {
      flash(errors[0], true)
      return false
    }
    return true
  }

  const onTransfer = (from: ID, to: ID) => {
    if (!game) return
    if (from === DEALER) {
      const errors = actions().setDealer(game.id, to)
      if (errors.length) flash(errors[0], true)
      else flash(`${players[to]?.name} làm nhà cái.`)
      return
    }
    if (to === BET) {
      if (from === POT || from === dealerNow) return flash('Nhà cái không đặt cược.', true)
      if (round?.phase === 'playing') return flash('Đã chốt cược — bấm Ván mới để cược lại.', true)
      if (!round && !openNext()) return
    } else if (round?.phase === 'betting') {
      return flash('Đang đặt cược — bấm Chốt cược rồi mới trả kẹo.', true)
    }
    setPending({ from, to })
  }

  /** Kéo hũ kẹo của người khác về chỗ mình = đòi kẹo (chờ người đó bấm OK). */
  const isRequest = (p: { from: ID; to: ID }) => p.to === me && p.from !== me && p.from !== POT

  const pick = (o: Option) => {
    if (!game || !pending) return
    if (pending.to === BET) {
      const errors = actions().setStake(game.id, pending.from, o.amount)
      if (errors.length) flash(errors[0], true)
      else flyCandy(pending.from, BET, o.amount)
    } else if (isRequest(pending)) {
      const errors = actions().requestCandy(game.id, pending.from, pending.to, o.amount)
      if (errors.length) flash(errors[0], true)
      else flash(`Đã đòi ${players[pending.from]?.name} ${o.amount} kẹo — chờ xác nhận.`)
    } else {
      const errors = actions().addMove(game.id, pending.from, pending.to, o.amount, round ? o.label : 'Chuyển tay')
      if (errors.length) flash(errors[0], true)
      else flyCandy(pending.from, pending.to, o.amount)
    }
    setPending(null)
  }

  const asking = session.requests.filter((r) => r.to === me && r.gameId === game?.id)

  /** Xì dách: khóa cược để chia bài và trả kẹo. */
  const lockBets = () => {
    if (!game) return
    const errors = actions().lockBets(game.id)
    if (errors.length) flash(errors[0], true)
    else flash('Đã chốt cược — chia bài rồi kéo để trả kẹo.')
  }

  /** Xì dách: tính ván này vào lời/lỗ và mở ngay ván sau với cược cũ. */
  const nextRound = () => {
    if (!game) return
    if (!round) {
      openNext()
      return
    }
    const errors = actions().nextRound(game.id)
    if (errors.length) flash(errors[0], true)
    else flash('Ván mới — đặt cược nào!')
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
    isMe: p.id === me,
    total: net[p.id],
    round: round ? (roundDelta[p.id] ?? 0) : undefined,
    badge: round?.dealer === p.id ? '🎩 Nhà cái' : undefined,
    stake: game?.type === 'xidach' ? (round ?? lastPlay)?.stakes[p.id] : undefined,
    stakeDim: !round,
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
                Ván {roundNumber(game, round)}{' '}
                {round.phase === 'betting' ? 'đang đặt cược' : round.phase === 'playing' ? 'đã chốt cược' : 'đang chơi'}
                {game.type === 'tienlen' && (
                  <span className="text-muted">
                    {' '}
                    · cược {round.bet}
                    {round.bet2 ? `/${round.bet2}` : ''}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted">{playCount(game) ? `Đã chốt ${playCount(game)} ván` : 'Chưa có ván nào'}</span>
            )}
            <Link to={`${base}/g/${game.id}/settings`} className="font-semibold text-muted">
              ⚙ Game
            </Link>
          </div>

          <Board
            seats={seats}
            pot={round && game.type === 'poker' ? potOf(round) : undefined}
            betBox={
              game.type === 'xidach' ? Object.values((round ?? lastPlay)?.stakes ?? {}).reduce((a, b) => a + b, 0) : undefined
            }
            betLocked={round?.phase === 'playing'}
            hat={round?.dealer ? players[round.dealer]?.name : undefined}
            center={<TableCenter game={game} round={round} />}
            onTransfer={onTransfer}
          />



          {asking.length > 0 && (
            <Card className="mt-3 p-3">
              <h2 className="font-display mb-1 px-1 font-bold">Đang đòi · chờ xác nhận</h2>
              <ul>
                {asking.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 border-b border-line/40 px-1 py-1.5 text-sm last:border-0">
                    <Who player={players[r.from]} className="min-w-0 font-semibold" />
                    <span className="text-muted">→ bạn</span>
                    <span className="candy num ml-auto text-sm">{r.amount}</span>
                    <button
                      type="button"
                      aria-label="Hủy lời đòi"
                      className="px-1.5 text-muted hover:text-berry"
                      onClick={() => actions().cancelRequest(r.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
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
            {game.type === 'xidach' ? (
              <>
                {!round && (
                  <Button
                    aria-label="Tùy chỉnh ván mới"
                    className="bg-night/90 px-3 py-1.5 text-sm"
                    onClick={() => navigate(`${base}/g/${game.id}/open`)}
                  >
                    ⚙
                  </Button>
                )}
                {/* Một nút đổi theo bước: đang đặt cược → Chốt cược; đã chốt → Ván mới */}
                <Button
                  variant="primary"
                  className="font-display flex-1 py-1.5 text-lg"
                  onClick={round?.phase === 'betting' ? lockBets : nextRound}
                >
                  {round?.phase === 'betting' ? 'Chốt cược' : 'Ván mới'}
                </Button>
              </>
            ) : round ? (
              <>
                <Button variant="danger" className="bg-night/90 px-3 py-1.5 text-sm" onClick={cancelRound}>
                  Hủy ván
                </Button>
                <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={closeRound}>
                  Chốt ván{game.type === 'poker' && potOf(round) > 0 ? ` (pot ${potOf(round)})` : ''}
                </Button>
              </>
            ) : (
              <>
                {hasPrev && (
                  <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => navigate(`${base}/g/${game.id}/open`)}>
                    ⚙ Tùy chỉnh
                  </Button>
                )}
                <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                  + Mở ván
                </Button>
              </>
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
          options={
            pending.to === BET
              ? scaledOptions(round?.stakes[pending.from] ?? round?.bet ?? 1)
              : suggestOptions({ game, round: round ?? null, from: pending.from, to: pending.to })
          }
          mode={pending.to === BET ? 'bet' : isRequest(pending) ? 'request' : 'pay'}
          onPick={pick}
          onClose={() => setPending(null)}
        />
      )}
    </main>
  )
}

/** Giữa bàn: thông tin riêng của từng game. */
function TableCenter({ game, round }: { game: Game; round?: Round }) {
  if (!round) {
    return (
      <>
        <span aria-hidden className="text-3xl">
          {GAME_ICONS[game.type]}
        </span>
        <span className="font-display text-lg leading-tight font-bold">{game.name}</span>
        <span className="text-xs text-muted">Chưa mở ván</span>
      </>
    )
  }
  if (game.type === 'tienlen') {
    return (
      <>
        <span className="text-xs text-muted">Ván {roundNumber(game, round)}</span>
        {round.bet2 ? (
          <div className="flex gap-3">
            <span className="flex flex-col items-center">
              <span className="candy num text-xl">{round.bet}</span>
              <span className="text-[11px] text-muted">Nhất</span>
            </span>
            <span className="flex flex-col items-center">
              <span className="candy num text-xl">{round.bet2}</span>
              <span className="text-[11px] text-muted">Nhì</span>
            </span>
          </div>
        ) : (
          <span className="candy num text-2xl">{round.bet}</span>
        )}
      </>
    )
  }
  if (game.type === 'xidach') {
    return (
      <>
        <span className="text-xs text-muted">Ván {roundNumber(game, round)} · kéo 🎩 để đổi cái</span>
      </>
    )
  }
  return <span className="text-xs text-muted">Ván {roundNumber(game, round)}</span>
}

