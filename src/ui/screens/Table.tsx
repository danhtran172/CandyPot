import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GAME_ORDER, GAMES } from '../../core/games'
import { lotoPrice } from '../../core/games/loto'
import {
  blindsOf,
  pots as handPotsOf,
  raiseOptions,
  remaining,
  STREET_LABEL,
  STREETS,
  toCall,
  type PokerAction,
} from '../../core/games/pokerHand'
import { netOf } from '../../core/ledger'
import { movesNet, openRound, potOf } from '../../core/round'
import { scaledOptions } from '../../core/games/options'
import { suggestOptions, tienlenBets } from '../../core/suggest'
import { BET, DEALER, POT, type Game, type GameType, type ID, type Option, type Player, type Round } from '../../core/types'
import { actions } from '../../store'
import { pokerSettingsOf } from '../../store/appStore'
import { AmountSheet } from '../components/AmountSheet'
import { HistorySheet } from '../components/HistorySheet'
import { TienlenBetSheet } from '../components/TienlenBetSheet'
import { PriceSheet } from '../components/PriceSheet'
import { PlayerPicker } from '../components/PlayerPicker'
import { PokerRaiseSheet, PokerSettingsSheet } from '../components/PokerSheets'
import { Board, flyCandy, type Seat } from '../components/Board'
import { GameIcon } from '../components/GameIcon'
import { GamePicker } from '../components/GamePicker'
import { ask } from '../dialog'
import { Button, Card, TopBar } from '../components/kit'
import { useSession } from '../components/useSession'
import { playCount, playerMap, roundNumber } from '../format'
import { useMe } from '../me'
import { hostTasks, incomingAsks } from '../tasks'

export function Table() {
  const session = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [pending, setPending] = useState<{ from: ID; to: ID; tapped?: boolean } | null>(null)
  const [picker, setPicker] = useState<'dealer' | 'award' | null>(null)
  const [pokerSheet, setPokerSheet] = useState<'raise' | 'allin' | 'settings' | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [editBets, setEditBets] = useState(false)
  const [editPrice, setEditPrice] = useState(false)
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

  /** Game đang dùng của mỗi loại (buổi cũ có thể có nhiều — lấy cái mới nhất). */
  const gameOf = (type: GameType) => [...session.games].reverse().find((g) => g.type === type)

  /** Chọn 1 trong 3 loại game: chưa có thì tạo. */
  const pickType = (type: GameType) => {
    const id = gameOf(type)?.id ?? actions().addGame(type)
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
    if (!hasPrev && game.type === 'tienlen') {
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

  const isLoto = game?.type === 'loto'
  const hostName = players[session.hostId ?? '']?.name ?? '?'

  /** Poker: tay bài đang chơi (luật đầy đủ). */
  const hand = round?.poker
  const handState = hand && round ? { hand, moves: round.moves } : undefined
  const handPots = handState ? handPotsOf(handState) : []
  const actor = hand?.toAct ?? null
  const nextPot = hand ? handPots.findIndex((_, i) => !hand.awarded.includes(i)) : -1

  /** Người đang tới lượt Bỏ bài / Xem / Theo / Tố / All-in; báo khi sang vòng mới. */
  const pokerDo = (action: PokerAction) => {
    if (!game || !actor || !hand) return
    const errors = actions().pokerAct(game.id, actor, action)
    if (errors.length) return flash(errors[0], true)
    const after = openRound(actions().session!, game.id)?.poker
    if (!after || after.street === hand.street) return
    if (after.street === 'done') {
      const won = openRound(actions().session!, game.id)?.moves.filter((m) => m.from === POT)
      flash(`${won?.map((m) => players[m.to]?.name).join(', ')} ăn pot! Bấm Tay mới để chơi tiếp.`)
    } else if (after.street === 'showdown') flash(`Showdown — ${hostName} trao pot cho người thắng.`)
    else flash(`Sang ${STREET_LABEL[after.street]}.`)
  }

  const pokerUndo = () => {
    if (!game) return
    const errors = actions().pokerUndo(game.id)
    if (errors.length) flash(errors[0], true)
  }

  /** Showdown: host trao pot kế tiếp cho một hoặc nhiều người (chia đều). */
  const awardNextPot = (winners: ID[]) => {
    setPicker(null)
    if (!game) return
    const errors = actions().pokerAward(game.id, nextPot, winners)
    if (errors.length) return flash(errors[0], true)
    const done = openRound(actions().session!, game.id)?.poker?.street === 'done'
    flash(`${winners.map((w) => players[w]?.name).join(', ')} ăn ${handPots[nextPot].amount} kẹo${done ? ' — bấm Tay mới.' : '.'}`)
  }

  const openPokerSettings = () => {
    if (me !== session.hostId) return flash(`Chỉ host (${hostName}) mới chỉnh cài đặt Poker.`, true)
    setPokerSheet('settings')
  }

  const pokerBadge = (id: ID): string | undefined => {
    if (!hand) return undefined
    const { sb, bb } = blindsOf(hand)
    const tags = [id === hand.button && 'D', id === sb && 'SB', id === bb && 'BB'].filter(Boolean) as string[]
    if (hand.folded.includes(id)) tags.push('Bỏ bài')
    else if (hand.allIn.includes(id)) tags.push('All-in')
    return tags.join(' · ') || undefined
  }

  /** Lô tô: host kéo Pot vào người thắng → xác nhận → trao cả pot và kết thúc ván. */
  const awardPot = async (to: ID) => {
    if (!game || !round) return flash('Chưa có ván nào.', true)
    if (me !== session.hostId) return flash(`Chỉ host (${hostName}) mới trao pot được.`, true)
    if (round.phase !== 'playing') return flash('Bấm Chốt trước rồi mới trao pot.', true)
    const pot = potOf(round)
    if (!pot) return flash('Pot đang trống.', true)
    const name = players[to]?.name
    const ok = await ask(`${name} thắng?`, {
      icon: '💰',
      message: `Trao cả pot ${pot} kẹo cho ${name} và kết thúc ván.`,
      okLabel: 'Trao pot',
    })
    if (!ok) return
    const errors = actions().addMove(game.id, POT, to, pot, 'Ăn pot')
    if (errors.length) return flash(errors[0], true)
    flyCandy(POT, to, pot)
    const closing = actions().closeRound(game.id)
    if (closing.length) flash(closing[0], true)
    else flash(`${name} ăn ${pot} kẹo! Bấm Ván mới để chơi tiếp.`)
  }

  const onTransfer = (from: ID, to: ID) => {
    if (!game) return
    if (hand && (to === POT || from === POT)) return flash('Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.', true)
    if (isLoto && (to === POT || from === POT)) {
      if (from === POT) return void awardPot(to)
      if (round?.phase === 'playing') return flash('Đã chốt — không mua thêm tờ được nữa.', true)
      if (!round && !openNext()) return
      return setPending({ from, to })
    }
    if (from === DEALER) {
      const errors = actions().setDealer(game.id, to)
      if (errors.length) flash(errors[0], true)
      else flash(`${players[to]?.name} làm nhà cái.`)
      return
    }
    if (to === BET) {
      if (from === POT || from === dealerNow) return flash('Nhà cái không đặt cược.', true)
      if (round?.phase === 'playing') return flash('Đã chốt cược — bấm Kết thúc để sang ván mới rồi cược lại.', true)
      if (!round && !openNext()) return
    } else if (round?.phase === 'betting') {
      return flash('Đang đặt cược — bấm Chốt cược rồi mới trả kẹo.', true)
    }
    setPending({ from, to })
  }

  /** Kéo hũ kẹo của người khác về chỗ mình = đòi kẹo (chờ người đó bấm OK). */
  const isRequest = (p: { from: ID; to: ID }) => p.to === me && p.from !== me && p.from !== POT

  /**
   * Bấm thay cho kéo — người làm luôn là mình: bấm người khác = đưa kẹo (đổi sang đòi được),
   * bấm mình = xem Trả/nhận, bấm Pot = bỏ kẹo / mua tờ / (host) trao pot, bấm Bet = đặt cược, bấm 🎩 = chọn cái.
   */
  const onTap = (id: ID) => {
    if (!game || !me) return
    if (id === me) return setShowLog(true)
    if (id === DEALER) return setPicker('dealer')
    if (id === POT) {
      if (hand) return flash('Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.', true)
      if (isLoto && round?.phase === 'playing') {
        if (me !== session.hostId) return flash(`Chờ ${hostName} trao pot cho người thắng.`, true)
        return setPicker('award')
      }
      if (game.type === 'poker' && !round) return flash('Chưa mở ván — bấm + Mở ván trước.', true)
    }
    onTransfer(me, id)
    // Đánh dấu mở từ thao tác bấm để popup có nút ⇄ Đưa/Đòi
    setPending((p) => (p && p.from === me && p.to === id ? { ...p, tapped: true } : p))
  }

  /** Chọn xong người trong popup (nhà cái / người thắng pot). */
  const onPicked = (id: ID) => {
    const kind = picker
    setPicker(null)
    if (kind === 'dealer') onTransfer(DEALER, id)
    else if (kind === 'award') {
      if (isLoto) void awardPot(id)
      else onTransfer(POT, id)
    }
  }

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
  const myRoundMoves = round?.moves.filter((m) => m.from === me || m.to === me).length ?? 0

  /** Tiến lên: host bấm ô Rule để đặt mức Nhất/Nhì. */
  const openBets = () => {
    if (me !== session.hostId) return flash(`Chỉ host (${players[session.hostId ?? '']?.name ?? '?'}) mới đổi Rule được.`, true)
    setEditBets(true)
  }

  /** Lô tô: host bấm ô Giá để đặt giá mỗi tờ. */
  const openPrice = () => {
    if (me !== session.hostId) return flash(`Chỉ host (${hostName}) mới đổi giá được.`, true)
    setEditPrice(true)
  }

  /** Xì dách / Lô tô: khóa cược (mua tờ) để chơi và trả kẹo. */
  const lockBets = () => {
    if (!game) return
    if (isLoto && round && potOf(round) === 0) return flash('Chưa ai mua tờ — bấm 💰 Pot để mua.', true)
    const errors = actions().lockBets(game.id)
    if (errors.length) flash(errors[0], true)
    else flash(isLoto ? `Đã chốt — ${hostName} bấm 💰 Pot để trao cho người thắng.` : 'Đã chốt cược — chia bài rồi bấm vào người để trả kẹo.')
  }

  /** Xì dách: host nhấn giữ ô Bet để bỏ chốt cược. */
  const unlockBets = async () => {
    if (!game) return
    if (me !== session.hostId) return flash('Chỉ host mới bỏ chốt được.', true)
    if (!(await ask('Bỏ chốt cược?', { icon: '🔓', message: 'Mọi người sẽ đặt cược lại.', okLabel: 'Bỏ chốt' }))) return
    const errors = actions().unlockBets(game.id)
    if (errors.length) flash(errors[0], true)
    else flash('Đã bỏ chốt — đặt cược lại nào.')
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
    else if (game.type === 'poker') {
      const next = openRound(actions().session!, game.id)?.poker
      flash(`Tay mới — nút D: ${players[next?.button ?? '']?.name}.`)
    } else flash('Đã kết thúc ván — ván mới, đặt cược nào!')
  }

  const closeRound = () => {
    if (!game) return
    const errors = actions().closeRound(game.id)
    if (errors.length) flash(errors[0], true)
    else flash('Đã chốt ván — lời/lỗ đã cập nhật.')
  }

  const cancelRound = async () => {
    if (!game || !round) return
    const ok = await ask('Hủy ván này?', {
      icon: '🗑️',
      message: 'Các lượt kéo kẹo trong ván sẽ bị bỏ, không tính gì.',
      okLabel: 'Hủy ván',
      danger: true,
    })
    if (ok) actions().deleteRound(game.id, round.id)
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
    badge: hand ? pokerBadge(p.id) : round?.dealer === p.id ? '🎩 Nhà cái' : undefined,
    stake: hand ? hand.streetBets[p.id] || undefined : game?.type === 'xidach' ? (round ?? lastPlay)?.stakes[p.id] : undefined,
    stakeDim: !round,
    highlight: !!hand && hand.toAct === p.id,
    dim: !!hand?.folded.includes(p.id),
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

      <GamePicker value={game?.type} onPick={pickType} />

      {!game ? (
        <Card className="mt-4 text-center">
          <p className="font-display text-xl font-bold">Chơi game gì trước?</p>
          <p className="mt-1 text-sm text-muted">Đổi game lúc nào cũng được — lời/lỗ của cả bàn vẫn cộng dồn.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {GAME_ORDER.map((t) => (
              <Button key={t} className="flex flex-col items-center gap-1 py-3 text-lg" onClick={() => pickType(t)}>
                <GameIcon type={t} className="size-8" />
                {GAMES[t].label}
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
                {round.poker ? 'Tay' : 'Ván'} {roundNumber(game, round)}{' '}
                {round.poker
                  ? `· ${STREET_LABEL[round.poker.street]}`
                  : game.type === 'loto'
                  ? round.phase === 'betting'
                    ? 'đang mua tờ'
                    : 'đã chốt — host trao pot'
                  : round.phase === 'betting'
                    ? 'đang đặt cược'
                    : round.phase === 'playing'
                      ? 'đã chốt cược'
                      : 'đang chơi'}
                {game.type === 'tienlen' && (
                  <span className="text-muted">
                    {' '}
                    · cược {round.bet}
                    {round.bet2 ? `/${round.bet2}` : ''}
                  </span>
                )}
              </span>
            ) : GAMES[game.type].soon ? (
              <span className="text-muted">Chưa có luật tính — bấm vào người để chuyển kẹo</span>
            ) : (
              <span className="text-muted">{playCount(game) ? `Đã chốt ${playCount(game)} ván` : 'Chưa có ván nào'}</span>
            )}
          </div>

          <Board
            seats={seats}
            pot={game.type === 'loto' ? (round ? potOf(round) : 0) : round && game.type === 'poker' ? potOf(round) : undefined}
            potAfterCenter={game.type === 'loto'}
            betBox={game.type === 'xidach'}
            shape={game.type === 'tienlen' ? 'square' : 'oval'}
            betLocked={round?.phase === 'playing'}
            onBetHold={unlockBets}
            hat={round?.dealer ? players[round.dealer]?.name : undefined}
            center={<TableCenter game={game} round={round} players={players} onEditBets={openBets} onEditPrice={openPrice} />}
            cornerTop={
              game.type === 'poker' ? (
                <button
                  type="button"
                  aria-label="Cài đặt Poker"
                  onClick={openPokerSettings}
                  className="grid size-9 place-items-center rounded-full border border-line/60 bg-night/70 text-lg"
                >
                  ⚙
                </button>
              ) : undefined
            }
            corner={
              <button
                type="button"
                onClick={() => setShowLog(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-line/60 bg-night/70 px-2.5 py-1.5 text-xs font-semibold"
              >
                📜 Trả/nhận
                {myRoundMoves + asking.length > 0 && (
                  <span className="num rounded-full bg-lemon px-1.5 text-[10px] leading-4 text-night">
                    {myRoundMoves + asking.length}
                  </span>
                )}
              </button>
            }
            cornerRight={
              <>
                <CornerLink to={`${base}/host`} icon="🛎️" label="Host" count={hostTasks(session, me).length} />
                <CornerLink to={`${base}/requests`} icon="📨" label="Yêu cầu" count={incomingAsks(session, me).length} />
              </>
            }
            onTransfer={onTransfer}
            onTap={onTap}
          />





          <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-lg gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
            {GAMES[game.type].soon ? null : game.type === 'poker' && (hand || !round) ? (
              !hand ? (
                <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                  Tay mới
                </Button>
              ) : (
                <>
                  <Button
                    aria-label="Hoàn tác thao tác cuối"
                    disabled={!hand.undo.length}
                    className="shrink-0 bg-night/90 px-2 py-1.5 text-sm"
                    onClick={pokerUndo}
                  >
                    ↩
                  </Button>
                  {hand.street === 'done' ? (
                    <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={nextRound}>
                      Tay mới
                    </Button>
                  ) : hand.street === 'showdown' ? (
                    <Button
                      variant="primary"
                      className="font-display flex-1 py-1.5 text-base"
                      onClick={() =>
                        me === session.hostId ? setPicker('award') : flash(`Chờ ${hostName} trao pot.`, true)
                      }
                    >
                      🏆 Trao {nextPot === 0 ? 'pot chính' : `pot phụ ${nextPot}`} ({handPots[nextPot]?.amount ?? 0})
                    </Button>
                  ) : actor && handState ? (
                    <>
                      <Button variant="danger" className="bg-night/90 px-2 py-1.5 text-sm whitespace-nowrap" onClick={() => pokerDo({ type: 'fold' })}>
                        Bỏ bài
                      </Button>
                      <Button
                        variant="primary"
                        className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm whitespace-nowrap"
                        onClick={() => pokerDo(toCall(hand, actor) ? { type: 'call' } : { type: 'check' })}
                      >
                        {toCall(hand, actor)
                          ? `Theo ${Math.min(toCall(hand, actor), remaining(handState, actor))}${toCall(hand, actor) >= remaining(handState, actor) ? ' (all-in)' : ''}`
                          : 'Xem bài'}
                      </Button>
                      <Button
                        className="bg-night/90 px-2 py-1.5 text-sm whitespace-nowrap"
                        disabled={!raiseOptions(handState, actor).length}
                        onClick={() => setPokerSheet('raise')}
                      >
                        Tố
                      </Button>
                      <Button
                        className="bg-night/90 px-2 py-1.5 text-sm whitespace-nowrap text-berry"
                        disabled={!remaining(handState, actor)}
                        onClick={() => setPokerSheet('allin')}
                      >
                        All-in
                      </Button>
                    </>
                  ) : null}
                </>
              )
            ) : game.type === 'loto' ? (
              round ? (
                <>
                  <Button variant="danger" className="bg-night/90 px-3 py-1.5 text-sm" onClick={cancelRound}>
                    Hủy ván
                  </Button>
                  {round.phase === 'betting' ? (
                    <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={lockBets}>
                      Chốt
                    </Button>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-lemon/60 bg-night/90 px-3 text-center text-sm font-semibold text-lemon">
                      {me === session.hostId ? 'Bấm 💰 Pot để trao cho người thắng' : `Chờ ${hostName} trao pot`}
                    </div>
                  )}
                </>
              ) : (
                <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                  Ván mới
                </Button>
              )
            ) : game.type === 'xidach' ? (
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
                {/* Một nút đổi theo bước: đang đặt cược → Chốt cược; đã chốt → Kết thúc (sang ván mới); chưa có ván → Ván mới */}
                <Button
                  variant="primary"
                  className="font-display flex-1 py-1.5 text-lg"
                  onClick={round?.phase === 'betting' ? lockBets : nextRound}
                >
                  {round?.phase === 'betting' ? 'Chốt cược' : round ? 'Kết thúc' : 'Ván mới'}
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

      {editPrice && game && (
        <PriceSheet
          title="Giá · Lô tô"
          hint="Giá mỗi tờ — mua N tờ thì bỏ N × giá kẹo vào Pot."
          unit="kẹo / tờ"
          initial={lotoPrice(game)}
          onSave={(v) => {
            const errors = actions().setLotoPrice(game.id, v)
            if (!errors.length) flash(`Giá mỗi tờ: ${v} kẹo.`)
            return errors
          }}
          onClose={() => setEditPrice(false)}
        />
      )}

      {editBets && game && (
        <TienlenBetSheet
          game={game}
          onDone={(saved) => {
            setEditBets(false)
            if (saved) flash('Đã đổi Rule.')
          }}
        />
      )}

      {pokerSheet === 'settings' && game && (
        <PokerSettingsSheet
          initial={pokerSettingsOf(game)}
          onSave={(sb, cap) => {
            const errors = actions().setPokerSettings(game.id, sb, cap)
            if (!errors.length) flash(`Small blind ${sb} · all-in ${cap} — áp dụng từ tay sau.`)
            return errors
          }}
          onClose={() => setPokerSheet(null)}
        />
      )}

      {pokerSheet === 'raise' && handState && actor && (
        <PokerRaiseSheet
          player={players[actor]}
          options={raiseOptions(handState, actor)}
          streetBet={handState.hand.streetBets[actor] ?? 0}
          min={handState.hand.currentBet + handState.hand.minRaise}
          max={(handState.hand.streetBets[actor] ?? 0) + remaining(handState, actor)}
          onPick={(to) => {
            setPokerSheet(null)
            pokerDo({ type: 'raise', to })
          }}
          onClose={() => setPokerSheet(null)}
        />
      )}

      {pokerSheet === 'allin' && handState && actor && (
        <PriceSheet
          title={`${players[actor]?.name} all-in`}
          hint={`Mặc định bỏ nốt ${remaining(handState, actor)} kẹo (mức all-in ${handState.hand.cap}). Không đủ thì sửa số nhỏ hơn.`}
          unit="kẹo"
          initial={remaining(handState, actor)}
          onSave={(v) => {
            if (v > remaining(handState, actor)) return [`Tối đa ${remaining(handState, actor)} kẹo.`]
            pokerDo({ type: 'allin', amount: v })
            return []
          }}
          onClose={() => setPokerSheet(null)}
        />
      )}

      {picker === 'award' && hand && handPots[nextPot] && (
        <PlayerPicker
          title={`🏆 Ai ăn ${nextPot === 0 ? 'pot chính' : `pot phụ ${nextPot}`} (${handPots[nextPot].amount} kẹo)?`}
          hint="Chọn một người, hoặc nhiều người để chia đều."
          players={session.players.filter((p) => handPots[nextPot].eligible.includes(p.id))}
          onPickMany={awardNextPot}
          onClose={() => setPicker(null)}
        />
      )}

      {picker && game && !(picker === 'award' && hand) && (
        <PlayerPicker
          title={picker === 'dealer' ? '🎩 Ai làm nhà cái?' : '🏆 Ai thắng?'}
          hint={
            picker === 'dealer'
              ? 'Chỉ đổi được khi chưa chốt cược.'
              : `Trao pot ${round ? potOf(round) : 0} kẹo${isLoto ? ' và kết thúc ván' : ''}.`
          }
          players={session.players.filter((p) => (round ? round.participants.includes(p.id) : p.active))}
          current={picker === 'dealer' ? dealerNow : null}
          onPick={onPicked}
          onClose={() => setPicker(null)}
        />
      )}

      {showLog && game && <HistorySheet session={session} game={game} me={me} onClose={() => setShowLog(false)} />}

      {pending && game && (
        <AmountSheet
          from={players[pending.from]}
          to={players[pending.to]}
          options={
            isLoto && pending.to === POT
              ? [1, 2].map((n) => ({ amount: n * lotoPrice(game), label: `${n} tờ` }))
              : pending.to === BET
                ? scaledOptions(round?.stakes[pending.from] ?? round?.bet ?? 1)
                : suggestOptions({ game, round: round ?? null, from: pending.from, to: pending.to })
          }
          mode={isLoto && pending.to === POT ? 'buy' : pending.to === BET ? 'bet' : isRequest(pending) ? 'request' : 'pay'}
          unit={isLoto && pending.to === POT ? { name: 'tờ', price: lotoPrice(game) } : undefined}
          onPick={pick}
          onSwap={
            pending.tapped && pending.from !== POT && pending.to !== POT && pending.to !== BET
              ? () => setPending({ from: pending.to, to: pending.from, tapped: true })
              : undefined
          }
          extra={
            game.type === 'poker' && pending.to === POT && round && potOf(round) > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setPending(null)
                  setPicker('award')
                }}
                className="mt-2 w-full rounded-2xl border border-dashed border-lemon/60 py-2 text-sm font-semibold text-lemon"
              >
                🏆 Trao pot {potOf(round)} kẹo cho người thắng…
              </button>
            ) : undefined
          }
          onClose={() => setPending(null)}
        />
      )}
    </main>
  )
}

/** Nút nhỏ ở góc bàn (Host / Yêu cầu) với số việc đang chờ mình. */
function CornerLink({ to, icon, label, count }: { to: string; icon: string; label: string; count: number }) {
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-1 rounded-2xl border bg-night/70 px-2.5 py-1.5 text-xs font-semibold ${
        count ? 'border-berry/70' : 'border-line/60'
      }`}
    >
      <span aria-hidden>{icon}</span>
      {label}
      {count > 0 && (
        <span className="num absolute -top-2 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-berry px-1 text-[10px] font-bold text-night">
          {count}
        </span>
      )}
    </Link>
  )
}

/** Giữa bàn: thông tin riêng của từng game. */
function TableCenter({
  game,
  round,
  players,
  onEditBets,
  onEditPrice,
}: {
  game: Game
  round?: Round
  players: Record<ID, Player>
  onEditBets: () => void
  onEditPrice: () => void
}) {
  if (round?.poker) {
    const h = round.poker
    const state = { hand: h, moves: round.moves }
    const list = handPotsOf(state)
    const need = h.toAct ? toCall(h, h.toAct) : 0
    return (
      <>
        <div className="flex flex-wrap justify-center gap-0.5 text-[10px] font-semibold">
          {STREETS.map((st) => (
            <span
              key={st}
              className={st === h.street ? 'rounded-full bg-lemon px-1.5 text-night' : 'px-0.5 text-muted'}
            >
              {STREET_LABEL[st]}
            </span>
          ))}
        </div>
        {h.toAct ? (
          <>
            <span className="text-xs">
              Lượt <b className="text-sky">{players[h.toAct]?.name}</b>
              {need > 0 ? ` · theo ${need}` : ''}
            </span>
            <span className="text-[11px] text-muted">
              Cược vòng: {h.currentBet} · all-in {h.cap}
            </span>
          </>
        ) : h.street === 'done' ? (
          <span className="text-xs text-mint">Xong tay — bấm Tay mới</span>
        ) : (
          <ul className="space-y-0.5 text-[11px]">
            {list.map((p, i) => (
              <li key={i} className={h.awarded.includes(i) ? 'text-muted line-through' : ''}>
                <b>{i === 0 ? 'Pot chính' : `Pot phụ ${i}`} {p.amount}</b> · {p.eligible.map((id) => players[id]?.name).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }
  if (game.type === 'loto') {
    const price = lotoPrice(game)
    return (
      <>
        <span className="text-xs text-muted">{round ? `Ván ${roundNumber(game, round)}` : 'Chưa mở ván'}</span>
        <button
          type="button"
          onClick={onEditPrice}
          aria-label={`Giá: ${price} kẹo mỗi tờ — host bấm để đổi`}
          className="flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-sky/70 bg-night/50 py-1 pr-3 pl-2.5 transition active:scale-95"
        >
          <span className="font-display text-sm font-bold text-sky">Giá</span>
          <span className="candy num text-sm">{price}</span>
          <span className="text-xs text-muted">/ tờ</span>
        </button>
      </>
    )
  }
  if (game.type === 'tienlen') {
    const { bet, bet2 } = round ?? tienlenBets(game)
    return (
      <>
        <span className="text-xs text-muted">{round ? `Ván ${roundNumber(game, round)}` : 'Chưa mở ván'}</span>
        <button
          type="button"
          onClick={onEditBets}
          aria-label={`Rule: Nhất ${bet}${bet2 ? `, Nhì ${bet2}` : ''} — host bấm để đổi`}
          className="flex max-w-full flex-col items-center rounded-3xl border-2 border-dashed border-sky/70 bg-night/50 px-3 py-1.5 transition active:scale-95"
        >
          <span className="font-display text-2xl leading-none font-bold text-sky">Rule</span>
          <span className="mt-1.5 flex gap-2">
            <span className="flex flex-col items-center">
              <span className="candy num text-lg">{bet}</span>
              <span className="text-[11px] text-muted">Nhất</span>
            </span>
            {bet2 !== undefined && (
              <span className="flex flex-col items-center">
                <span className="candy num text-lg">{bet2}</span>
                <span className="text-[11px] text-muted">Nhì</span>
              </span>
            )}
          </span>
          <span className="mt-1 text-[10px] text-muted">host bấm để đổi</span>
        </button>
      </>
    )
  }
  if (!round) {
    const soon = GAMES[game.type].soon
    return (
      <>
        <GameIcon type={game.type} className="size-9" />
        <span className="font-display text-lg leading-tight font-bold">{GAMES[game.type].label}</span>
        <span className="text-xs text-muted">{soon ? 'Sắp có · bấm vào người để chuyển kẹo' : 'Chưa mở ván'}</span>
      </>
    )
  }
  if (game.type === 'xidach') {
    return (
      <>
        <span className="text-xs text-muted">Ván {roundNumber(game, round)} · bấm 🎩 để đổi cái</span>
      </>
    )
  }
  return <span className="text-xs text-muted">Ván {roundNumber(game, round)}</span>
}

