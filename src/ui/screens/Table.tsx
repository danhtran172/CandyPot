import { Children, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CARD_GAMES, GAME_ORDER, GAMES } from '../../core/games'
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
import { contributions, movesNet, openRound, potOf } from '../../core/round'
import { suggestOptions } from '../../core/suggest'
import { BET, BUY, DEALER, POT, type Game, type GameType, type ID, type Option, type Player, type Round } from '../../core/types'
import { actions } from '../../store'
import { pokerSettingsOf } from '../../store/appStore'
import { AmountSheet } from '../components/AmountSheet'
import { MeSheet } from '../components/MeSheet'
import { HistorySheet } from '../components/HistorySheet'
import { TienlenBetSheet } from '../components/TienlenBetSheet'
import { PriceSheet } from '../components/PriceSheet'
import { LotoSettingsSheet, RulesSheet, XidachLimitsSheet } from '../components/RuleSheets'
import { PlayerPicker } from '../components/PlayerPicker'
import { TienlenPanel, TienlenTableCards } from '../components/TienlenPanel'
import { ShuffleOverlay } from '../components/ShuffleOverlay'
import { introMs, reducedMotion, shuffleKindOf } from '../shuffle'
import { HOST_GRACE_MS, TURN_MS, turnStart } from '../turnClock'
import { placeOf, type TienlenCards } from '../../core/games/tienlenPlay'
import { PrevRoundIcon } from '../components/PrevRoundIcon'
import { GuideTour } from '../components/GuideTour'
import { PokerRaiseSheet, PokerSettingsSheet } from '../components/PokerSheets'
import { Board, flyCandy, type Seat } from '../components/Board'
import { GameIcon } from '../components/GameIcon'
import { GamePicker } from '../components/GamePicker'
import { GameName } from '../components/GameName'
import { ask } from '../dialog'
import { Button, Card, PotChip, TopBar } from '../components/kit'
import potIcon from '../../assets/pot.webp'
import { useSession } from '../components/useSession'
import { useCandyPops } from '../components/useCandyPops'
import { playCount, playerMap, roundNumber } from '../format'
import { guideSteps, markStepsSeen, onScreen, unseenSteps, type GuideRole, type GuideStep } from '../guides'
import { canHostOf, useMe } from '../me'
import { confirmTakeHost, useHostAway, useOnlineIds } from '../presence'
import { lockWarnings } from '../../core/lockCheck'
import { ticketColors } from '../ticketColors'
import { answeredAsks, hostTasks, incomingAsks } from '../tasks'

export function Table() {
  const session = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  /** Popup chọn số kẹo đang mở: ai → ai; `edit` = Lô tô chưa chốt, người đã mua chỉnh lại số tờ. */
  const [pending, setPending] = useState<{ from: ID; to: ID; tapped?: boolean; edit?: boolean } | null>(null)
  const [picker, setPicker] = useState<'dealer' | 'award' | null>(null)
  const [pokerSheet, setPokerSheet] = useState<'raise' | 'allin' | 'settings' | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [showMe, setShowMe] = useState(false)
  const [editBets, setEditBets] = useState(false)
  const [editPrice, setEditPrice] = useState(false)
  const [editLimits, setEditLimits] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [guidePick, setGuidePick] = useState(false)
  /** Đang đánh bài trong app: popup đổi game (thay ô chọn game đã ẩn). */
  const [gameMenu, setGameMenu] = useState(false)
  const [guide, setGuide] = useState<GuideStep[] | null>(null)
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
  const [me] = useMe(session)
  const onlineIds = useOnlineIds()
  /** Điều khiển ván (mở / chốt / hủy / đổi game…): bàn một máy thì máy này; bàn nhiều người thì chỉ host. */
  const canHost = canHostOf(session, me)
  /** Bàn một máy: host ghi hộ cả bàn (kéo thay mọi người) — không có đòi kẹo. */
  const solo = session.mode !== 'multi'
  const base = `/s/${session.id}`

  const flash = (text: string, bad = false) => {
    setToast({ text, bad })
    setTimeout(() => setToast(null), 2500)
  }

  /** Game đang dùng của mỗi loại (buổi cũ có thể có nhiều — lấy cái mới nhất). */
  const gameOf = (type: GameType) => [...session.games].reverse().find((g) => g.type === type)

  /** Chọn 1 trong 3 loại game: chưa có thì tạo. */
  const pickType = (type: GameType) => {
    // Bàn nhiều người: đổi game là việc của host (đổi cho cả bàn)
    if (!canHost) return flash(`Chỉ host (${players[session.hostId ?? '']?.name ?? 'host'}) mới đổi game được.`, true)
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

  /** Chơi bằng bài trong app (chỉ bàn nhiều người): gom các nút phụ vào nút ⋯. */
  const cardApp = !solo && game?.cardMode === 'app' && CARD_GAMES.includes(game.type)
  /** Đang đánh bài trong app: app tự tính kẹo — dưới đáy chỉ còn bài trên tay và một nút ⋯ cho các chức năng còn cần. */
  const cardPlay = cardApp && !!round?.tienlen
  const isLoto = game?.type === 'loto'
  const isFree = game?.type === 'free'

  /** Lô tô: số tờ người này đã mua trong ván đang mở. */
  const lotoBought = (id: ID, r = round) => {
    if (!game || !r) return 0
    const paid = r.moves.filter((m) => m.from === id && m.to === POT).reduce((sum, m) => sum + m.amount, 0)
    return Math.floor(paid / lotoPrice(game))
  }
  /** Lô tô: người này còn mua được mấy tờ trong ván đang mở. */
  const lotoLeft = (id: ID) => (game ? lotoMax(game) - lotoBought(id) : 0)
  const colors = isLoto ? ticketColors(session) : {}
  const hostName = players[session.hostId ?? '']?.name ?? '?'
  const hostAway = useHostAway(session, me)

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
    if (!solo && actor !== me) return flash(`Lượt ${players[actor]?.name} — họ tự bấm trên máy của họ.`, true)
    const errors = actions().pokerAct(game.id, actor, action)
    if (errors.length) return flash(errors[0], true)
    const after = openRound(actions().session!, game.id)?.poker
    if (!after || after.street === hand.street) return
    // Xong tay (mọi người bỏ bài) → pot tự trao; cả bàn đã có thông báo "🏆 … ăn pot" (PotAwardNotice)
    if (after.street === 'done') return
    if (after.street === 'showdown') flash(`Showdown — ${hostName} trao pot cho người thắng.`)
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
    const errors = actions().pokerAwardBest(game.id, winners)
    if (errors.length) return flash(errors[0], true)
    // Ai ăn bao nhiêu: cả bàn đã có thông báo "🏆 … ăn pot" (PotAwardNotice) — không báo trùng ở đây
    const after = openRound(actions().session!, game.id)
    if (after?.poker?.street === 'done') return
    // Còn pot người thắng không được ăn (all-in thiếu) → hỏi tiếp người mạnh nhất trong số còn lại
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
      icon: <img src={potIcon} alt="" draggable={false} className="mx-auto size-12" />,
      message: (
        <>
          Trao cả <PotChip /> {pot} kẹo cho <b className="text-cream">{name}</b> và kết thúc ván.
        </>
      ),
      okLabel: 'Trao pot',
    })
    if (!ok) return
    const errors = actions().addMove(game.id, POT, to, pot, 'Ăn pot')
    if (errors.length) return flash(errors[0], true)
    flyCandy(POT, to, pot)
    // Báo "🏆 … ăn pot" do PotAwardNotice lo (cả bàn) — ở đây chỉ báo lỗi nếu có
    const closing = actions().closeRound(game.id)
    if (closing.length) flash(closing[0], true)
  }

  const onTransfer = (from: ID, target: ID) => {
    if (!game) return
    // Lô tô: chỉ thả vào ô Mua mới mua tờ (kẹo vào Pot); thả thẳng vào Pot thì không
    if (isLoto && target === POT && from !== POT)
      return flash(round?.phase === 'playing' ? 'Đã chốt — không mua thêm tờ được nữa.' : 'Kéo vào ô Mua để mua tờ.', true)
    const to = target === BUY ? POT : target
    // Người vào bàn giữa ván: chưa tính ván này
    const waiter = [from, to].find((id) => waitingIds.has(id))
    if (waiter) return flash(`${waiter === me ? 'Bạn' : players[waiter]?.name} đang chờ — vào bàn từ ván sau.`, true)
    // Bàn nhiều người: ai (kể cả host) cũng chỉ trả / cược / mua bằng kẹo của mình hoặc đòi về mình —
    // không làm thay người khác. Host chỉ thêm quyền trao pot và đổi nhà cái.
    if (!solo && from !== me && !(to === me && from !== POT && from !== DEALER)) {
      if (from === POT) {
        if (!canHost) return flash(`Chờ ${hostName} trao pot.`, true)
      } else if (from === DEALER) {
        if (!canHost) return flash(`Chỉ host (${hostName}) mới đổi nhà cái.`, true)
      } else
        return flash(
          `${players[from]?.name ?? 'Người đó'} tự ${to === POT || to === BET || target === BUY ? (isLoto ? 'mua' : 'cược') : 'trả'} trên máy của họ — mỗi người chỉ dùng kẹo của mình.`,
          true,
        )
    }
    if (hand && (to === POT || from === POT)) return flash('Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.', true)
    if (isFree && (to === POT || from === POT)) {
      // Tự do: cược vào Pot (chưa có ván thì tự mở), kéo Pot để trao thưởng
      if (from === POT && (!round || potOf(round) === 0)) return flash('Pot đang trống — bấm Pot để cược trước.', true)
      if (from === POT && round?.phase === 'betting') return flash('Chưa chốt cược — bấm Chốt cược rồi mới trao pot.', true)
      if (to === POT && round?.phase === 'playing') return flash('Đã chốt cược — không cược thêm được nữa.', true)
      if (to === POT && !round && !openNext()) return
      return setPending({ from, to })
    }
    if (isLoto && (to === POT || from === POT)) {
      if (from === POT) return void awardPot(to)
      if (round?.phase === 'playing') return flash('Đã chốt — không mua thêm tờ được nữa.', true)
      if (!round && !openNext()) return
      // Đã mua rồi (kể cả tự mua lại theo ván trước lúc mở ván), chưa chốt → kéo lại vào ô Mua để chỉnh số tờ
      const now = round ?? openRound(actions().session!, game.id)
      if (lotoBought(from, now) > 0) return setPending({ from, to, edit: true })
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

  /** Bàn nhiều người: kéo hũ kẹo của người khác về chỗ mình = đòi kẹo (chờ người đó bấm OK). Bàn một máy thì ghi luôn. */
  const isRequest = (p: { from: ID; to: ID }) => !solo && p.to === me && p.from !== me && p.from !== POT

  /**
   * Bấm thay cho kéo — người làm luôn là mình: bấm người khác = đưa kẹo (đổi sang đòi được),
   * bấm mình = xem Trả/nhận, bấm Pot = bỏ kẹo / mua tờ / (host) trao pot, bấm Bet = đặt cược, bấm 🎩 = chọn cái.
   */
  /** 💤 Mình tạm nghỉ / chơi lại (bấm avatar của chính mình trên bàn). */
  const setResting = (resting: boolean) => {
    if (!me) return
    actions().updatePlayer(me, { active: !resting })
    flash(resting ? 'Bạn tạm nghỉ 💤 — không vào ván mới.' : 'Bạn chơi lại rồi!')
  }

  const onTap = (id: ID) => {
    if (!game || !me) return
    // Bấm avatar của mình → 💤 tạm nghỉ / chơi lại + lời/lỗ của mình từng ván (Trả/nhận ở nút riêng)
    if (id === me) return setShowMe(true)
    if (id === DEALER) return canHost ? setPicker('dealer') : flash(`Chỉ host (${hostName}) mới đổi nhà cái.`, true)
    if (id === POT) {
      if (hand) return flash('Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.', true)
      // Tự do đã chốt cược: bấm Pot = chọn người thắng để trao
      if (isFree && round?.phase === 'playing') return canHost ? setPicker('award') : flash(`Chờ ${hostName} trao pot.`, true)
      if (isLoto && round?.phase === 'playing') {
        if (me !== session.hostId) return flash(`Chờ ${hostName} trao pot cho người thắng.`, true)
        return setPicker('award')
      }
      if (isLoto) return flash('Bấm ô Mua để mua tờ.', true)
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
    if (pending.edit) {
      const count = Math.round(o.amount / lotoPrice(game))
      const before = lotoBought(pending.from)
      const errors = actions().setLotoTickets(game.id, pending.from, count)
      if (errors.length) flash(errors[0], true)
      else if (count !== before)
        flash(count ? `${players[pending.from]?.name} mua ${count} tờ (trước là ${before}).` : `${players[pending.from]?.name} bỏ mua.`)
    } else if (pending.to === BET) {
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
        // (thông báo "🏆 … ăn pot" do PotAwardNotice lo cho cả bàn)
        if (now && potOf(now) === 0) actions().closeRound(game.id)
      }
    }
    setPending(null)
  }

  const asking = session.requests.filter((r) => r.to === me && r.gameId === game?.id && !r.status)
  const asksCount = incomingAsks(session, me).length + answeredAsks(session, me).length
  const myRoundMoves = round?.moves.filter((m) => m.from === me || m.to === me).length ?? 0




  /** Xì dách / Lô tô: khóa cược (mua tờ) để chơi và trả kẹo. */
  const lockBets = async () => {
    if (!game) return
    if (isLoto && round && potOf(round) === 0) return flash('Chưa ai mua tờ — bấm Pot để mua.', true)
    if (isFree && round && potOf(round) === 0) return flash('Chưa ai cược — bấm Pot để cược.', true)
    // Không chặn, chỉ nhắc: người đang chơi chưa bet / mua, người đang nghỉ mà đã bet / mua
    if (round) {
      const { missing, resting } = lockWarnings(session, game, round)
      if (missing.length || resting.length) {
        const verb = isLoto ? 'mua tờ' : game.type === 'xidach' ? 'bet' : 'cược'
        const names = (ids: ID[]) => ids.map((id) => players[id]?.name).join(', ')
        const ok = await ask(`Chốt luôn?`, {
          icon: '⚠️',
          message: (
            <>
              {missing.length > 0 && (
                <span className="block">
                  Đang chơi mà chưa {verb}: <b className="text-cream">{names(missing)}</b>
                </span>
              )}
              {resting.length > 0 && (
                <span className="block">
                  Đang nghỉ 💤 mà đã {verb}: <b className="text-cream">{names(resting)}</b>
                </span>
              )}
            </>
          ),
          okLabel: 'Vẫn chốt',
          cancelLabel: 'Để kiểm tra',
        })
        if (!ok) return
      }
    }
    const errors = actions().lockBets(game.id)
    if (errors.length) flash(errors[0], true)
    else
      flash(
        isLoto
          ? `Đã chốt — ${hostName} bấm Pot để trao cho người thắng.`
          : isFree
            ? 'Đã chốt cược — kéo Pot vào người thắng.'
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

  /**
   * Kết thúc ván mà chưa ai trả ai (lời/lỗ ván này đều bằng 0) → hỏi lại, không chặn.
   * Poker bỏ qua (blind luôn có lượt kẹo). Trả về true = cứ kết thúc.
   */
  const confirmEmptyRound = async () => {
    if (!round || round.poker) return true
    if (Object.values(movesNet(round.moves)).some((v) => v !== 0)) return true
    return ask('Chưa ai trả ai?', {
      icon: '⚠️',
      message: 'Ván này chưa có lượt trả kẹo nào — kết thúc thì ván được lưu với lời/lỗ bằng 0. Muốn bỏ ván thì bấm Hủy ván.',
      okLabel: 'Vẫn kết thúc',
      cancelLabel: 'Để kiểm tra',
    })
  }

  /** Xì dách: tính ván này vào lời/lỗ và mở ngay ván sau với cược cũ. */
  const nextRound = async () => {
    if (!game) return
    if (!round) {
      openNext()
      return
    }
    if (!(await confirmEmptyRound())) return
    const errors = actions().nextRound(game.id)
    if (errors.length) flash(errors[0], true)
    else if (game.type === 'poker') {
      const next = openRound(actions().session!, game.id)?.poker
      flash(`Tay mới — nút D: ${players[next?.button ?? '']?.name}.`)
    } else flash('Đã kết thúc ván — ván mới, đặt cược nào!')
  }

  const closeRound = async () => {
    if (!game) return
    if (!(await confirmEmptyRound())) return
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
  const menuCount = myRoundMoves + asking.length + hostTasks(session, me).length + asksCount
  // Nút quay lại ván trước — chỉ host, nằm bên trái nút chính
  const backBtn =
    lastPlay && me === session.hostId ? (
      <Button
        aria-label="Quay lại ván trước"
        title="Quay lại ván trước"
        data-guide="back"
        className="flex shrink-0 items-center bg-night/90 px-2.5 py-1.5 text-cream"
        onClick={backRound}
      >
        <PrevRoundIcon />
        {cardApp && <span className="ml-1.5 text-sm">Ván trước</span>}
      </Button>
    ) : null

  // Lần đầu gặp một tính năng (trên máy này) → tự hướng dẫn đúng những bước chưa xem bao giờ, đang có trên màn hình
  const role: GuideRole = me && me === session.hostId ? 'host' : 'player'
  // Đang mở popup → chưa hướng dẫn (đóng popup xong mới hiện, không đè lên)
  const busy = !!(gameMenu || pending || picker || pokerSheet || showLog || showMe || editBets || editPrice || editLimits || showRules || guidePick)
  useEffect(() => {
    if (!game || guide || !me || busy) return // chưa chọn bạn là ai (vừa join) → chưa hướng dẫn
    const t = window.setTimeout(() => {
      // Popup khác (hộp xác nhận…) → để lúc khác
      if (document.querySelector('[role=dialog], [role=alertdialog]')) return
      const fresh = unseenSteps(guideSteps(game.type, role, solo)).filter(onScreen)
      if (fresh.length) setGuide(fresh)
    }, 600)
    return () => window.clearTimeout(t)
  }, [game?.type, role, guide, me, round?.id, round?.phase, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeGuide = (shown: GuideStep[]) => {
    markStepsSeen(shown)
    setGuide(null)
  }

  const roundDelta = round ? movesNet(round.moves) : {}
  const pops = useCandyPops(session)
  // Ván bài trong app vừa chia (mới mở vài giây) → hiệu ứng xào bài một lần cho ván đó
  const [shuffledId, setShuffledId] = useState<ID | null>(null)
  /** Đang chia: bao nhiêu lá đã đáp xuống chỗ ngồi (xấp lưng bài tăng dần). */
  const [dealt, setDealt] = useState<{ id: ID; n: number } | null>(null)
  // Ván đã có sẵn lúc mở màn này (vd tải lại trang giữa ván) thì không xào lại
  const [mountRoundId] = useState(() => round?.id)
  const fresh =
    !!round?.tienlen && !round.tienlen.finished.length && !round.tienlen.table && round.id !== mountRoundId && !reducedMotion()
  const shuffling = fresh && round && shuffledId !== round.id ? round.id : null
  useEffect(() => {
    if (!shuffling) return
    const t = window.setTimeout(() => setShuffledId(shuffling), introMs(shuffleKindOf(shuffling), round?.tienlen?.order.length ?? 4))
    return () => window.clearTimeout(t)
  }, [shuffling]) // eslint-disable-line react-hooks/exhaustive-deps
  // Người tạm nghỉ vẫn ngồi trên bàn (mờ + 💤); người đã xóa khỏi phòng thì không.
  // Tiến lên: chỉ người chơi ngồi quanh 4 cạnh bàn — ai không chơi thì cho nghỉ ở tab Người chơi
  const seated = game?.type === 'tienlen' ? (round ? round.participants : seatedOf(session)) : undefined
  // Vào bàn lúc ván đang chơi → vẫn ngồi trên bàn nhưng "chờ ván sau" (không tính ván này, ván sau tự vào)
  const visible = session.players.filter((p) => !p.removed && (seated ? seated.includes(p.id) : true))
  const waitingIds = new Set(
    round && !seated ? visible.filter((p) => p.active && !round.participants.includes(p.id)).map((p) => p.id) : [],
  )

  const tlCards = round?.tienlen
  // Đồng hồ lượt (bài trong app): hết giờ thì máy của người tới lượt tự bỏ lượt / đánh lá nhỏ nhất;
  // máy đó mất mạng thì host làm thay sau thêm một chút. Chưa tính giờ lúc đang xào / chia bài.
  const turnKey = cardPlay && round && tlCards?.turn && !shuffling ? `${round.id}:${tlCards.step ?? 0}` : null
  useEffect(() => {
    if (!turnKey || !game || !tlCards?.turn) return
    const turn = tlCards.turn
    const step = tlCards.step ?? 0
    const mine = turn === me
    if (!mine && !canHost) return
    const wait = turnStart(turnKey) + TURN_MS + (mine ? 0 : HOST_GRACE_MS) - Date.now()
    const t = window.setTimeout(() => actions().tienlenTimeout(game.id, turn, step), Math.max(0, wait))
    return () => window.clearTimeout(t)
  }, [turnKey, me, canHost]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Số lá hiện ở chỗ ngồi: đang chia thì theo số lá đã đáp xuống (chia đều theo vòng), xong thì số lá thật. */
  const seatCards = (c: TienlenCards, id: ID) => {
    const real = c.hands[id]?.length
    if (!shuffling || real === undefined) return real
    const n = dealt?.id === shuffling ? dealt.n : 0
    const seat = c.order.indexOf(id)
    const got = Math.floor((n - seat + c.order.length - 1) / c.order.length)
    return got > 0 ? Math.min(real, got) : undefined
  }
  const seats: Seat[] = visible.map((p) => ({
    player: p,
    isMe: p.id === me,
    online: onlineIds.has(p.id),
    round: round && !waitingIds.has(p.id) ? (roundDelta[p.id] ?? 0) : undefined,
    waiting: waitingIds.has(p.id),
    pop: pops[p.id],
    badge: hand ? pokerBadge(p.id) : tlCards ? tienlenBadge(tlCards, p.id) : undefined,
    dealer: game?.type === 'xidach' && dealerNow === p.id,
    stake: hand
      ? hand.streetBets[p.id] || undefined
      : isFree
        ? round && (contributions(round)[p.id] ?? 0)
        : game?.type === 'xidach'
          ? (round ?? lastPlay)?.stakes[p.id]
          : undefined,
    stakeDim: !round || (isFree && !contributions(round)[p.id]),
    cards: tlCards && !tlCards.finished.includes(p.id) ? seatCards(tlCards, p.id) : undefined,
    tickets: isLoto && lotoBought(p.id) > 0 ? { count: lotoBought(p.id), color: colors[p.id] } : undefined,
    highlight: (!!hand && hand.toAct === p.id) || (!!tlCards && tlCards.turn === p.id),
    turnClock: turnKey && tlCards?.turn === p.id ? turnKey : undefined,
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
    <main className={round?.tienlen ? 'pb-80' : 'pb-40'}>
      <TopBar
        title={session.name}
        back="/"
        right={
          // Đang đánh bài trong app: các nút này nằm trong popup ⋯
          cardPlay ? undefined : (
          <>
            <Link to={`${base}/players`} data-guide="players" className="rounded-full bg-plum-2 px-3 py-1.5 text-sm font-semibold">
              👥 Người chơi
            </Link>
            <button
              type="button"
              aria-label="Hướng dẫn"
              onClick={() =>
                !game
                  ? flash('Chọn một game trước đã.', true)
                  : solo
                    ? setGuide(guideSteps(game.type, 'host', true))
                    : setGuidePick(true)
              }
              className="grid size-8 place-items-center rounded-full bg-plum-2 text-sm font-bold text-lemon"
            >
              ?
            </button>
          </>
          )
        }
      />

      <div data-guide="picker" className={cardPlay ? 'hidden' : ''}>
        <GamePicker value={game?.type} onPick={pickType} locked={!canHost} />
      </div>

      {!game ? (
        <Card className="mt-4 text-center">
          <p className="font-display text-xl font-bold">{canHost ? 'Chơi game gì trước?' : `Chờ ${hostName} chọn game…`}</p>
          <p className="mt-1 text-sm text-muted">
            {canHost ? 'Đổi game lúc nào cũng được — lời/lỗ của cả bàn vẫn cộng dồn.' : 'Host chọn xong là bàn hiện ra ở đây.'}
          </p>
          <div className={`mt-4 grid grid-cols-2 gap-2 ${canHost ? '' : 'hidden'}`}>
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
          <div className={`mt-2 mb-2 flex items-center justify-between gap-2 text-sm ${cardPlay ? 'hidden' : ''}`}>
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
            title={
              <>
                <GameIcon type={game.type} className="size-7" />
                {GAMES[game.type].label}
              </>
            }
            betBox={game.type === 'xidach'}
            buyBox={isLoto && round?.phase !== 'playing' ? { price: lotoPrice(game) } : undefined}
            // Lô tô lúc mua tờ: Pot còn 55% cỡ thường (ô Mua là chính), chốt rồi Pot về cỡ thường để trao
            potScale={isLoto && round?.phase !== 'playing' ? 0.55 : undefined}
            shape={game.type === 'tienlen' ? 'square' : 'oval'}
            betLocked={round?.phase === 'playing'}
            onBetHold={unlockBets}
            hat={round?.dealer ? players[round.dealer]?.name : undefined}
            hatLocked={!canHost}
            center={<TableCenter game={game} round={round} players={players} />}
            cornerTop={
              // Góc trên phải: Rule ? (ai cũng xem) bên trái ⚙ cài đặt (chỉ host)
              !cardPlay && withRules && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Xem luật"
                    data-guide="rule"
                    onClick={() => setShowRules(true)}
                    className="font-display rounded-full border border-berry/60 bg-berry/20 px-3 py-1 text-sm font-bold text-berry transition active:scale-95"
                  >
                    Rule ?
                  </button>
                  {canHost && (
                    <button
                      type="button"
                      aria-label={`Cài đặt ${GAMES[game.type].label}`}
                      data-guide="settings"
                      onClick={openSettings}
                      className="grid size-9 place-items-center rounded-full border border-line/60 bg-night/70 text-lg"
                    >
                      ⚙
                    </button>
                  )}
                </div>
              )
            }
            onTransfer={onTransfer}
            onTap={onTap}
          />


          {/* Cố định dưới cùng: hàng nút góc (Trả/nhận · Host · Yêu cầu) ngay trên thanh nút chính — không cuộn theo trang */}
          <div className="pointer-events-none fixed inset-x-0 bottom-16 z-10 mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
            {!cardPlay && (
            <div className="mb-2 flex items-end justify-between">
              <button
                type="button"
                onClick={() => setShowLog(true)}
                data-guide="log"
                className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-line/60 bg-night/70 px-2.5 py-1.5 text-xs font-semibold"
              >
                📜 Trả/nhận
                {myRoundMoves + asking.length > 0 && (
                  <span className="num rounded-full bg-lemon px-1.5 text-[10px] leading-4 text-night">{myRoundMoves + asking.length}</span>
                )}
              </button>
              {/* Bàn một máy: không ai xin hoàn tác / đòi kẹo qua máy khác */}
              {!solo && (
                <div className="pointer-events-auto flex gap-1.5">
                  <CornerLink to={`${base}/host`} guide="host" icon="🛎️" label="Host" count={hostTasks(session, me).length} />
                  <CornerLink
                    to={`${base}/requests`}
                    guide="requests"
                    icon="📨"
                    label="Yêu cầu"
                    count={incomingAsks(session, me).length + answeredAsks(session, me).length}
                  />
                </div>
              )}
            </div>
            )}
            {cardPlay && round?.tienlen && (
              <div className="pointer-events-auto">
                <TienlenPanel
                  round={round}
                  cards={round.tienlen}
                  players={players}
                  me={me ?? null}
                  isHost={canHost}
                  onPlay={(id, cards) => {
                    const errors = actions().tienlenPlay(game.id, id, cards)
                    if (errors.length) flash(errors[0], true)
                    return !errors.length
                  }}
                  onPass={(id) => {
                    const errors = actions().tienlenPass(game.id, id)
                    if (errors.length) flash(errors[0], true)
                  }}
                  dealing={!!shuffling}
                  turnKey={turnKey}
                  onNext={nextRound}
                  menu={
                    <More on count={menuCount}>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => setShowLog(true)}>
                        📜 Trả/nhận{myRoundMoves + asking.length ? ` (${myRoundMoves + asking.length})` : ''}
                      </Button>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => navigate(`${base}/host`)}>
                        🛎️ Host{hostTasks(session, me).length ? ` (${hostTasks(session, me).length})` : ''}
                      </Button>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => navigate(`${base}/requests`)}>
                        📨 Yêu cầu{asksCount ? ` (${asksCount})` : ''}
                      </Button>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => setShowRules(true)}>
                        📖 Luật & mode bài
                      </Button>
                      {canHost && (
                        <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => setGameMenu(true)}>
                          🎮 Đổi game
                        </Button>
                      )}
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => navigate(`${base}/players`)}>
                        👥 Người chơi
                      </Button>
                      <Button className="bg-night/90 px-3 py-1.5 text-sm" onClick={() => setGuidePick(true)}>
                        ❓ Hướng dẫn
                      </Button>
                      {/* Ai cũng thấy Hủy ván; không phải host thì bấm vào được nhắc nhờ host (host offline thì mời nhận làm host) */}
                      <Button
                        variant="danger"
                        className={`bg-night/90 px-3 py-1.5 text-sm ${canHost ? '' : 'opacity-60'}`}
                        onClick={() =>
                          canHost
                            ? cancelRound()
                            : hostAway && me
                              ? confirmTakeHost(session, me)
                              : flash(`Chỉ host (${hostName}) mới hủy được ván — nhờ ${hostName} hủy giúp.`, true)
                        }
                      >
                        Hủy ván
                      </Button>
                      {backBtn}
                    </More>
                  }
                />
              </div>
            )}
            {!cardPlay && (
            <div data-guide="actions" className="pointer-events-auto flex gap-2">
              {GAMES[game.type].soon ? null : !canHost && !(hand && actor === me && hand.street !== 'showdown' && hand.street !== 'done') ? (
                // Bàn nhiều người, không phải host: mở / chốt ván do host; mình chỉ trả / đòi / cược (và Poker khi tới lượt)
                <div className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-night/90 px-3 py-2 text-center text-sm text-muted">
                  {hostAway && me ? (
                    <>
                      ⚪ <b className="text-cream">{hostName}</b> offline
                      <button
                        type="button"
                        onClick={() => confirmTakeHost(session, me)}
                        className="ml-2 rounded-full border border-mint bg-mint/20 px-3 py-1 text-sm font-bold text-mint active:scale-95"
                      >
                        🛎️ Làm host
                      </button>
                    </>
                  ) : (
                    <>
                      🛎️ <b className="text-cream">{hostName}</b> điều khiển ván
                      {hand && actor && hand.street !== 'done' ? ` · lượt ${players[actor]?.name}` : ''}
                    </>
                  )}
                </div>
              ) : game.type === 'free' ? (
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
                          Kéo <PotChip className="mx-1" /> vào người thắng
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
                    ) : actor && handState && !solo && actor !== me ? (
                      // Bàn nhiều người: người tới lượt tự bấm trên máy họ — host không cược thay
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line bg-night/90 px-3 py-2 text-center text-sm text-muted">
                        ⏳ Lượt <b className="mx-1 text-cream">{players[actor]?.name}</b>
                      </div>
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
                        {me === session.hostId ? (
                          <>
                            Bấm <PotChip className="mx-1" /> để trao cho người thắng
                          </>
                        ) : (
                          `Chờ ${hostName} trao pot`
                        )}
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
                  <More on={cardApp}>
                    <Button variant="danger" className="bg-night/90 px-3 py-1.5 text-sm" onClick={cancelRound}>
                      Hủy ván
                    </Button>
                    {backBtn}
                  </More>
                  <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={closeRound}>
                    Chốt ván{game.type === 'poker' && potOf(round) > 0 ? ` (pot ${potOf(round)})` : ''}
                  </Button>
                </>
              ) : (
                <>
                  <More on={cardApp}>{backBtn}</More>
                  <Button variant="primary" className="font-display flex-1 py-1.5 text-lg" onClick={openNext}>
                    + Mở ván
                  </Button>
                </>
              )}
            </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          className={`pop fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-xl ${
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
            setGuide(guideSteps(game.type, id as GuideRole))
          }}
          onClose={() => setGuidePick(false)}
        />
      )}

      {shuffling && round?.tienlen && (
        <ShuffleOverlay kind={shuffleKindOf(shuffling)} order={round.tienlen.order} onDealt={(n) => setDealt({ id: shuffling, n })} />
      )}

      {gameMenu && (
        <div role="dialog" aria-modal="true" aria-label="Đổi game" className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={() => setGameMenu(false)} />
          <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">
            <h2 className="font-display text-center text-xl font-bold">🎮 Đổi game</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {GAME_ORDER.map((t) => (
                <Button
                  key={t}
                  className={`flex flex-col items-center gap-1 py-3 ${game?.type === t ? 'ring-2 ring-lemon' : ''}`}
                  onClick={() => {
                    setGameMenu(false)
                    pickType(t)
                  }}
                >
                  <GameIcon type={t} className="size-8" />
                  <GameName type={t} />
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {guide && <GuideTour key={guide.map((s) => s.id).join()} steps={guide} onClose={closeGuide} />}

      {showRules && game && (
        <RulesSheet game={game} isHost={me === session.hostId} online={!solo} onEdit={openSettings} onClose={() => setShowRules(false)} />
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
          online={!solo}
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

      {showMe && me && (
        <MeSheet
          session={session}
          me={me}
          onRest={(resting) => {
            setShowMe(false)
            setResting(resting)
          }}
          onClose={() => setShowMe(false)}
        />
      )}

      {pending && game && (
        <AmountSheet
          from={players[pending.from]}
          to={players[pending.to]}
          me={me}
          options={
            pending.edit
              ? lotoEditOptions(lotoBought(pending.from), lotoMax(game)).map((n) => ({ amount: n * lotoPrice(game), label: `${n} tờ` }))
              : isLoto && pending.to === POT
              ? [1, 2]
                  .filter((n) => n <= lotoLeft(pending.from))
                  .map((n) => ({ amount: n * lotoPrice(game), label: `${n} tờ` }))
              : pending.to === BET
                ? xidachBetOptions(game, round?.stakes[pending.from]).map((amount) => ({ amount, label: 'Cược' }))
                : suggestOptions({ game, round: round ?? null, from: pending.from, to: pending.to })
          }
          mode={isLoto && pending.to === POT ? 'buy' : pending.to === BET ? 'bet' : isRequest(pending) ? 'request' : 'pay'}
          unit={isLoto && pending.to === POT ? { name: 'tờ', price: lotoPrice(game) } : undefined}
          current={pending.edit ? lotoBought(pending.from) : undefined}
          onPick={pick}
          onSwap={
            pending.tapped && pending.from !== POT && pending.to !== POT && pending.to !== BET
              ? () => setPending({ from: pending.to, to: pending.from, tapped: true })
              : undefined
          }
          swapLabel={solo ? `${players[pending.to]?.name} trả ${players[pending.from]?.name} thay vì ngược lại` : undefined}
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
        {/* Tên + icon chế độ đã in trên mặt bàn */}
        <span className="text-xs text-muted">{soon ? 'Sắp có · bấm vào người để chuyển kẹo' : game.type === 'free' ? 'Bấm Pot để cược' : 'Chưa mở ván'}</span>
      </>
    )
  }
  if (round.tienlen) return <TienlenTableCards cards={round.tienlen} players={players} />
  if (game.type === 'xidach') {
    return (
      <>
        <span className="text-xs text-muted">Ván {roundNumber(game, round)} · bấm 🎩 để đổi cái</span>
      </>
    )
  }
  return <span className="text-xs text-muted">Ván {roundNumber(game, round)}</span>
}

/**
 * Lô tô, chỉnh lại số tờ: đầu tiên là mức nên chọn — mua thêm 1 tờ (đã đủ tối đa thì bớt 1), rồi các mức còn lại
 * tăng dần, "0 = bỏ mua" cuối cùng.
 */
function lotoEditOptions(current: number, max: number): number[] {
  const best = current < max ? current + 1 : Math.max(0, current - 1)
  const rest = Array.from({ length: max }, (_, i) => i + 1).filter((n) => n !== best)
  return [...new Set([best, ...rest, 0])]
}

/** Tiến lên bài trong app: hạng khi đã về; bỏ lượt thì ghi rõ (số lá còn lại hiện bằng xấp lưng bài). */
function tienlenBadge(cards: TienlenCards, id: ID): string | undefined {
  const place = placeOf(cards, id)
  if (place) return place
  return cards.passed.includes(id) ? 'Bỏ lượt' : undefined
}

/** Chơi bài trong app (`on`): gom các nút phụ (Hủy ván, Ván trước…) vào một nút ⋯, bấm thì hiện ra. Không thì để nguyên. */
function More({
  on,
  count = 0,
  children,
}: {
  on: boolean
  count?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!on) return <>{children}</>
  const items = Children.toArray(children).filter(Boolean)
  if (!items.length) return null
  return (
    <div className="relative shrink-0">
      {open &&
        createPortal(
        <>
          <button type="button" aria-label="Đóng" className="fixed inset-0 z-40 cursor-default bg-night/50" onClick={() => setOpen(false)} />
          <div
            className="pop fixed inset-x-4 bottom-44 z-50 mx-auto grid max-w-sm grid-cols-2 gap-1.5 rounded-2xl border border-line/60 bg-plum-2 p-2 shadow-2xl [&>*]:w-full [&>*]:whitespace-nowrap"
            // Đóng sau khi nút bên trong chạy xong (đóng ở pha capture thì nút bị gỡ trước khi kịp chạy)
            onClick={() => setOpen(false)}
          >
            {items}
          </div>
        </>,
          document.body,
        )}
      <Button
        aria-label="Chức năng khác"
        aria-expanded={open}
        className={`relative h-full bg-night/90 px-3 py-1.5 text-lg leading-none ${open ? 'ring-2 ring-lemon' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
        {count > 0 && (
          <span className="num absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-berry px-1 text-[10px] font-bold text-night">
            {count}
          </span>
        )}
      </Button>
    </div>
  )
}
