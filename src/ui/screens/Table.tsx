import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GAME_ORDER, GAMES } from '../../core/games'
import { lotoMax, lotoPrice } from '../../core/games/loto'
import { seatedOf } from '../../core/games/tienlen'
import { xidachBetOptions } from '../../core/games/xidach'
import {
  blindsOf,
  contenders,
  pots as handPotsOf,
  raiseOptions,
  remaining,
  STREET_LABEL,
  STREETS,
  toCall,
  type PokerAction,
} from '../../core/games/pokerHand'
import { netOf } from '../../core/ledger'
import { contributions, movesNet, openRound, potOf } from '../../core/round'
import { suggestOptions } from '../../core/suggest'
import { BET, DEALER, POT, type Game, type GameType, type ID, type Option, type Player, type Round } from '../../core/types'
import { actions } from '../../store'
import { pokerSettingsOf } from '../../store/appStore'
import { AmountSheet } from '../components/AmountSheet'
import { HistorySheet } from '../components/HistorySheet'
import { TienlenBetSheet } from '../components/TienlenBetSheet'
import { PriceSheet } from '../components/PriceSheet'
import { LotoSettingsSheet, RulesSheet, XidachLimitsSheet } from '../components/RuleSheets'
import { PlayerPicker } from '../components/PlayerPicker'
import { PrevRoundIcon } from '../components/PrevRoundIcon'
import { GuideTour } from '../components/GuideTour'
import { PokerRaiseSheet, PokerSettingsSheet } from '../components/PokerSheets'
import { Board, flyCandy, type Seat } from '../components/Board'
import { GameIcon } from '../components/GameIcon'
import { GamePicker } from '../components/GamePicker'
import { GameName } from '../components/GameName'
import { ask } from '../dialog'
import { Button, Card, TopBar } from '../components/kit'
import { useSession } from '../components/useSession'
import { playCount, playerMap, roundNumber } from '../format'
import { guideSeen, guideSteps, markGuideSeen, type GuideRole } from '../guides'
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
  const [editLimits, setEditLimits] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [guidePick, setGuidePick] = useState(false)
  const [guide, setGuide] = useState<{ game: GameType; role: GuideRole } | null>(null)
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null)

  // ?g= (link cũ) → game đang chơi đã lưu → game mới nhất
  const game =
    session.games.find((g) => g.id === params.get('g')) ??
    session.games.find((g) => g.id === session.currentGameId) ??
    session.games[session.games.length - 1]
  const round = game ? openRound(session, game.id) : undefined
  // Link có ?g= (Lịch sử, Mở ván, demo…) → lưu thành game đang chơi để quay lại vẫn giữ
  const linked = params.get('g')
  useEffect(() => {
    if (linked && session.games.some((g) => g.id === linked)) actions().setCurrentGame(linked)
  }, [linked]) // eslint-disable-line react-hooks/exhaustive-deps
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
    actions().setCurrentGame(id)
    setParams({}, { replace: true })
  }

  /** Ván trước (đã chốt) — dùng để hiện lại cược/cái khi chưa mở ván mới. */
  const lastPlay = game && [...game.rounds].reverse().find((r) => r.kind === 'play' && r.status === 'closed')
  const dealerNow = round ? round.dealer : (lastPlay?.dealer ?? null)

  /**
   * Mở ván mới: có ván trước thì lấy lại y hệt cài đặt; chưa có thì vào màn Mở ván
   * (riêng Xì dách mở luôn — đặt cược bằng ô Bet, đổi cái bằng cách kéo 🎩).
   */
  const openNext = () => {
    if (!game) return false
    const errors = actions().quickOpen(game.id)
    if (errors.length) {
      flash(errors[0], true)
      return false
    }
    return true
  }

  const isLoto = game?.type === 'loto'
  const isFree = game?.type === 'free'

  /** Lô tô: người này còn mua được mấy tờ trong ván đang mở. */
  const lotoLeft = (id: ID) => {
    if (!game || !round) return game ? lotoMax(game) : 0
    const bought = round.moves.filter((m) => m.from === id && m.to === POT).reduce((sum, m) => sum + m.amount, 0)
    return lotoMax(game) - Math.floor(bought / lotoPrice(game))
  }
  const hostName = players[session.hostId ?? '']?.name ?? '?'

  /** Poker: tay bài đang chơi (luật đầy đủ). */
  const hand = round?.poker
  const handState = hand && round ? { hand, moves: round.moves } : undefined
  const handPots = handState ? handPotsOf(handState) : []
  const actor = hand?.toAct ?? null
  /** Tổng các pot chưa trao. */
  const restPot = hand ? handPots.reduce((sum, p, i) => sum + (hand.awarded.includes(i) ? 0 : p.amount), 0) : 0

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

  /** Showdown: host chọn người bài mạnh nhất (nhiều người = hòa) → app tự trao mọi pot họ được ăn. */
  const awardBest = (winners: ID[]) => {
    setPicker(null)
    if (!game || !round) return
    const before = round.moves.length
    const errors = actions().pokerAwardBest(game.id, winners)
    if (errors.length) return flash(errors[0], true)
    const after = openRound(actions().session!, game.id)
    const got: Record<ID, number> = {}
    for (const m of after?.moves.slice(before) ?? []) got[m.to] = (got[m.to] ?? 0) + m.amount
    const text = Object.entries(got)
      .map(([id, n]) => `${players[id]?.name} ăn ${n}`)
      .join(', ')
    if (after?.poker?.street === 'done') return flash(`${text} kẹo — bấm Tay mới.`)
    // Còn pot người thắng không được ăn (all-in thiếu) → hỏi tiếp người mạnh nhất trong số còn lại
    flash(`${text} kẹo. Còn pot phụ — chọn người mạnh nhất trong số còn lại.`)
    setPicker('award')
  }

  /** ⚙ góc bàn: host chỉnh luật của mode đang chơi. */
  const openSettings = () => {
    if (!game) return
    if (me !== session.hostId) return flash(`Chỉ host (${hostName}) mới chỉnh được.`, true)
    setShowRules(false)
    if (game.type === 'poker') setPokerSheet('settings')
    else if (game.type === 'tienlen') setEditBets(true)
    else if (game.type === 'loto') setEditPrice(true)
    else if (game.type === 'xidach') setEditLimits(true)
  }
  /** Mode có luật để xem / chỉnh (Tự do và mode "sắp có" thì không). */
  const withRules = !!game && game.type !== 'free' && !GAMES[game.type].soon

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
    if (isFree && (to === POT || from === POT)) {
      // Tự do: cược vào Pot (chưa có ván thì tự mở), kéo Pot để trao thưởng
      if (from === POT && (!round || potOf(round) === 0)) return flash('Pot đang trống — bấm 💰 Pot để cược trước.', true)
      if (from === POT && round?.phase === 'betting') return flash('Chưa chốt cược — bấm Chốt cược rồi mới trao pot.', true)
      if (to === POT && round?.phase === 'playing') return flash('Đã chốt cược — không cược thêm được nữa.', true)
      if (to === POT && !round && !openNext()) return
      return setPending({ from, to })
    }
    if (isLoto && (to === POT || from === POT)) {
      if (from === POT) return void awardPot(to)
      if (round?.phase === 'playing') return flash('Đã chốt — không mua thêm tờ được nữa.', true)
      if (round && lotoLeft(from) <= 0) return flash(`${players[from]?.name} đã mua đủ ${lotoMax(game)} tờ.`, true)
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
      // Tự do đã chốt cược: bấm Pot = chọn người thắng để trao
      if (isFree && round?.phase === 'playing') return setPicker('award')
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
      else {
        flyCandy(pending.from, pending.to, o.amount)
        // Tự do: trao hết pot thì ván tự xong
        const now = isFree && pending.from === POT ? openRound(actions().session!, game.id) : undefined
        if (now && potOf(now) === 0) {
          actions().closeRound(game.id)
          flash(`${players[pending.to]?.name} ăn ${o.amount} kẹo — xong ván, bấm 💰 Pot để cược ván mới.`)
        }
      }
    }
    setPending(null)
  }

  const asking = session.requests.filter((r) => r.to === me && r.gameId === game?.id)
  const myRoundMoves = round?.moves.filter((m) => m.from === me || m.to === me).length ?? 0




  /** Xì dách / Lô tô: khóa cược (mua tờ) để chơi và trả kẹo. */
  const lockBets = () => {
    if (!game) return
    if (isLoto && round && potOf(round) === 0) return flash('Chưa ai mua tờ — bấm 💰 Pot để mua.', true)
    if (isFree && round && potOf(round) === 0) return flash('Chưa ai cược — bấm 💰 Pot để cược.', true)
    const errors = actions().lockBets(game.id)
    if (errors.length) flash(errors[0], true)
    else
      flash(
        isLoto
          ? `Đã chốt — ${hostName} bấm 💰 Pot để trao cho người thắng.`
          : isFree
            ? 'Đã chốt cược — kéo 💰 Pot vào người thắng.'
            : 'Đã chốt cược — chia bài rồi bấm vào người để trả kẹo.',
      )
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

  /** Host quay lại ván vừa chốt để sửa: ván đang mở (nếu có) bị bỏ. */
  const backRound = async () => {
    if (!game || !lastPlay) return
    const n = roundNumber(game, lastPlay)
    const ok = await ask(`Quay lại ván ${n}?`, {
      icon: '⏮️',
      message: round
        ? `Ván ${roundNumber(game, round)} đang mở sẽ bị bỏ${round.moves.length ? ' cùng các lượt kéo kẹo trong đó' : ''}. Ván ${n} mở lại để sửa, xong thì chốt lại.`
        : `Ván ${n} mở lại để sửa, xong thì chốt lại.`,
      okLabel: 'Quay lại',
      danger: !!round?.moves.length,
    })
    if (!ok) return
    const errors = actions().backRound(game.id)
    if (errors.length) flash(errors[0], true)
    else flash(`Đã quay lại ván ${n}.`)
  }
  // Nút quay lại ván trước — chỉ host, nằm bên trái nút chính
  const backBtn =
    lastPlay && me === session.hostId ? (
      <Button
        aria-label="Quay lại ván trước"
        title="Quay lại ván trước"
        data-guide="back"
        className="grid shrink-0 place-items-center bg-night/90 px-2.5 py-1.5 text-cream"
        onClick={backRound}
      >
        <PrevRoundIcon />
      </Button>
    ) : null

  // Lần đầu làm host / lần đầu chơi một game trên máy này → tự mở hướng dẫn
  const role: GuideRole = me && me === session.hostId ? 'host' : 'player'
  useEffect(() => {
    if (!game || guide) return
    if (guideSeen(game.type, role)) return
    const t = window.setTimeout(() => setGuide({ game: game.type, role }), 400)
    return () => window.clearTimeout(t)
  }, [game?.type, role, guide]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeGuide = () => {
    if (guide) markGuideSeen(guide.game, guide.role)
    setGuide(null)
  }

  const roundDelta = round ? movesNet(round.moves) : {}
  // Người tạm nghỉ vẫn ngồi trên bàn (mờ + 💤); người đã xóa khỏi phòng thì không.
  // Tiến lên: chỉ người chơi ngồi quanh 4 cạnh bàn — ai không chơi thì cho nghỉ ở tab Người chơi
  const seated = game?.type === 'tienlen' ? (round ? round.participants : seatedOf(session)) : undefined
  const visible = session.players.filter(
    (p) => !p.removed && (seated ? seated.includes(p.id) : !round || round.participants.includes(p.id) || !p.active),
  )

  const seats: Seat[] = visible.map((p) => ({
    player: p,
    isMe: p.id === me,
    total: net[p.id],
    round: round ? (roundDelta[p.id] ?? 0) : undefined,
    badge: hand ? pokerBadge(p.id) : undefined,
    dealer: game?.type === 'xidach' && dealerNow === p.id,
    stake: hand
      ? hand.streetBets[p.id] || undefined
      : isFree
        ? round && (contributions(round)[p.id] ?? 0)
        : game?.type === 'xidach'
          ? (round ?? lastPlay)?.stakes[p.id]
          : undefined,
    stakeDim: !round || (isFree && !contributions(round)[p.id]),
    highlight: !!hand && hand.toAct === p.id,
    // Poker: nút hoàn tác thao tác cuối nằm cạnh avatar của mình
    action:
      hand && p.id === me ? (
        <button
          type="button"
          aria-label="Hoàn tác thao tác cuối"
          data-guide="undo"
          title="Hoàn tác thao tác cuối"
          disabled={!hand.undo.length}
          onClick={pokerUndo}
          className="grid size-9 place-items-center rounded-full border border-line bg-night/90 text-lg shadow-lg transition active:scale-90 disabled:opacity-35"
        >
          ↩
        </button>
      ) : undefined,
    dim: !!hand?.folded.includes(p.id),
  }))

  return (
    <main className="pb-28">
      <TopBar
        title={session.name}
        back="/"
        right={
          <>
            <Link to={`${base}/players`} data-guide="players" className="rounded-full bg-plum-2 px-3 py-1.5 text-sm font-semibold">
              👥 Người chơi
            </Link>
            <button
              type="button"
              aria-label="Hướng dẫn"
              onClick={() => (game ? setGuidePick(true) : flash('Chọn một game trước đã.', true))}
              className="grid size-8 place-items-center rounded-full bg-plum-2 text-sm font-bold text-lemon"
            >
              ?
            </button>
          </>
        }
      />

      <div data-guide="picker">
        <GamePicker value={game?.type} onPick={pickType} />
      </div>

      {!game ? (
        <Card className="mt-4 text-center">
          <p className="font-display text-xl font-bold">Chơi game gì trước?</p>
          <p className="mt-1 text-sm text-muted">Đổi game lúc nào cũng được — lời/lỗ của cả bàn vẫn cộng dồn.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {GAME_ORDER.map((t) => (
              <Button key={t} className="flex flex-col items-center gap-1 py-3 text-lg" onClick={() => pickType(t)}>
                <GameIcon type={t} className="size-8" />
                <GameName type={t} />
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
            ) : seated && seated.length > GAMES.tienlen.maxPlayers ? (
              <Link to={`${base}/players`} className="font-semibold text-berry">
                Quá {GAMES.tienlen.maxPlayers} người — cho người không chơi nghỉ 💤 ›
              </Link>
            ) : GAMES[game.type].soon ? (
              <span className="text-muted">Chưa có luật tính — bấm vào người để chuyển kẹo</span>
            ) : (
              <span className="text-muted">{playCount(game) ? `Đã chốt ${playCount(game)} ván` : 'Chưa có ván nào'}</span>
            )}
          </div>

          <Board
            seats={seats}
            pot={game.type === 'loto' || game.type === 'free' ? (round ? potOf(round) : 0) : round && game.type === 'poker' ? potOf(round) : undefined}
            potAfterCenter={game.type === 'loto'}
            betBox={game.type === 'xidach'}
            shape={game.type === 'tienlen' ? 'square' : 'oval'}
            betLocked={round?.phase === 'playing'}
            onBetHold={unlockBets}
            hat={round?.dealer ? players[round.dealer]?.name : undefined}
            center={
              <>
                {withRules && (
                  <button
                    type="button"
                    aria-label="Xem luật"
                    data-guide="rule"
                    onClick={() => setShowRules(true)}
                    className="font-display rounded-full border border-berry/60 bg-berry/20 px-3 py-0.5 text-sm font-bold text-berry transition active:scale-95"
                  >
                    Rule ?
                  </button>
                )}
                <TableCenter game={game} round={round} players={players} />
              </>
            }
            cornerTop={
              withRules ? (
                <button
                  type="button"
                  aria-label={`Cài đặt ${GAMES[game.type].label}`}
                  data-guide="settings"
                  onClick={openSettings}
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
                data-guide="log"
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
                <CornerLink to={`${base}/host`} guide="host" icon="🛎️" label="Host" count={hostTasks(session, me).length} />
                <CornerLink to={`${base}/requests`} guide="requests" icon="📨" label="Yêu cầu" count={incomingAsks(session, me).length} />
              </>
            }
            onTransfer={onTransfer}
            onTap={onTap}
          />





          <div data-guide="actions" className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-lg gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
            {GAMES[game.type].soon ? null : game.type === 'free' ? (
              round ? (
                <>
                  {round.phase === 'betting' ? (
                    <>
                      <Button variant="danger" className="bg-night/90 px-3 py-1.5 text-sm" onClick={cancelRound}>
                        Hủy ván
                      </Button>
                      {backBtn}
                      <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={lockBets}>
                        Chốt cược
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={unlockBets}>
                        Bỏ chốt
                      </Button>
                      {backBtn}
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-lemon/60 bg-night/90 px-3 py-2 text-center text-sm font-semibold text-lemon">
                        Kéo 💰 Pot vào người thắng
                      </div>
                    </>
                  )}
                </>
              ) : (
                backBtn
              )
            ) : game.type === 'poker' && (hand || !round) ? (
              !hand ? (
                <>
                  {backBtn}
                  <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                    Tay mới
                  </Button>
                </>
              ) : (
                <>
                  {hand.street === 'done' || hand.street === 'showdown' ? backBtn : null}
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
                      🏆 {hand.awarded.length ? `Còn ${restPot} kẹo — ai mạnh nhất tiếp?` : 'Ai bài mạnh nhất?'}
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
                  {backBtn}
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
                <>
                  {backBtn}
                  <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                    Ván mới
                  </Button>
                </>
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
                {backBtn}
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
                {backBtn}
                <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={closeRound}>
                  Chốt ván{game.type === 'poker' && potOf(round) > 0 ? ` (pot ${potOf(round)})` : ''}
                </Button>
              </>
            ) : (
              <>
                {backBtn}
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
        <LotoSettingsSheet
          game={game}
          onDone={(saved) => {
            setEditPrice(false)
            if (saved) flash('Đã lưu cài đặt Lô tô.')
          }}
        />
      )}

      {guidePick && game && (
        <PlayerPicker
          title={`❓ Hướng dẫn · ${GAMES[game.type].label}`}
          hint="Chọn phần muốn xem."
          players={[
            { id: 'player', name: 'Người chơi', emoji: '🎮', active: true },
            { id: 'host', name: 'Host', emoji: '🛎️', active: true },
          ]}
          onPick={(id) => {
            setGuidePick(false)
            setGuide({ game: game.type, role: id as GuideRole })
          }}
          onClose={() => setGuidePick(false)}
        />
      )}

      {guide && <GuideTour key={`${guide.game}:${guide.role}`} steps={guideSteps(guide.game, guide.role)} onClose={closeGuide} />}

      {showRules && game && (
        <RulesSheet game={game} isHost={me === session.hostId} onEdit={openSettings} onClose={() => setShowRules(false)} />
      )}

      {editLimits && game && (
        <XidachLimitsSheet
          game={game}
          onDone={(saved) => {
            setEditLimits(false)
            if (saved) flash('Đã lưu mức cược Xì dách.')
          }}
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

      {picker === 'award' && hand && handState && hand.street === 'showdown' && (
        <PlayerPicker
          title={hand.awarded.length ? '🏆 Trong những người còn lại, ai mạnh nhất?' : '🏆 Ai bài mạnh nhất?'}
          hint={`${hand.awarded.length ? `Còn ${restPot} kẹo. ` : ''}Bấm người thắng — app tự chia pot chính / pot phụ. Hòa thì bấm 🤝.`}
          players={session.players.filter((p) => contenders(handState).includes(p.id))}
          onPickMany={awardBest}
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
              ? [1, 2]
                  .filter((n) => n <= lotoLeft(pending.from))
                  .map((n) => ({ amount: n * lotoPrice(game), label: `${n} tờ` }))
              : pending.to === BET
                ? xidachBetOptions(game, round?.stakes[pending.from]).map((amount) => ({ amount, label: 'Cược' }))
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
function CornerLink({ to, guide, icon, label, count }: { to: string; guide: string; icon: string; label: string; count: number }) {
  return (
    <Link
      to={to}
      data-guide={guide}
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
}: {
  game: Game
  round?: Round
  players: Record<ID, Player>
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
  if (!round) {
    const soon = GAMES[game.type].soon
    return (
      <>
        <GameIcon type={game.type} className="size-9" />
        <span className="font-display text-lg leading-tight font-bold">
          <GameName type={game.type} />
        </span>
        <span className="text-xs text-muted">{soon ? 'Sắp có · bấm vào người để chuyển kẹo' : game.type === 'free' ? 'Bấm 💰 Pot để cược' : 'Chưa mở ván'}</span>
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

