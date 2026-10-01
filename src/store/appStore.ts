import { createStore } from 'zustand/vanilla'
import { GAMES } from '../core/games'
import { lotoMax, lotoPrice } from '../core/games/loto'
import { seatedOf } from '../core/games/tienlen'
import { xidachLimits } from '../core/games/xidach'
import { act, ALL_IN_MULTIPLIER, award, awardBest, DEFAULT_SB, nextButton, startHand, undoLast, type PokerAction } from '../core/games/pokerHand'
import { assertZeroSum, netOf } from '../core/ledger'
import { closeTransfers, contributions, normalizeSession, potOf } from '../core/round'
import { hostVoteTally, hostVotesNeeded } from '../core/hostVote'
import { tienlenBets } from '../core/suggest'
import { autoXidach, check as checkXidach, checkAll as checkAllXidach, dealXidach, draw as drawXidach, newPayouts as xidachPayouts, stand as standXidach, type XidachCards } from '../core/games/xidachPlay'
import { callNumber as callLoto, claim as claimLoto, emptyLoto, pickSheets, remaining as lotoRemaining, type LotoState } from '../core/games/lotoPlay'
import { pairsFor, sheetSet } from '../core/games/lotoSheets'
import { autoMove as autoTienlen, deal, pass as passTienlen, payouts as tienlenPayouts, play as playTienlen, shuffled } from '../core/games/tienlenPlay'
import { MAX_PLAYERS, POT, type Game, type GameType, type ID, type Player, type Round, type Session, type Tag } from '../core/types'
import type { SessionRepo } from '../storage/SessionRepo'
import type { RoomBackend } from '../sync/RoomBackend'

export const EMOJIS = ['🐱', '🐶', '🐸', '🐼', '🦊', '🐯', '🐵', '🐰', '🐨', '🐷', '🐮', '🐙', '🦄', '🐔', '🐧', '🐢']

/** Ghi lại / phát lại id đã sinh: chạy lại một thay đổi trên bản của phòng phải ra đúng các id như trên máy mình. */
let recordIds: ID[] | null = null
let replayIds: ID[] | null = null

export function newId(): ID {
  if (replayIds?.length) return replayIds.shift()!
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  recordIds?.push(id)
  return id
}

export interface OpenDraft {
  participants: ID[]
  /** Mức cược chung (Tiến lên: cược Nhất) hoặc cược mặc định. */
  bet: number
  /** Tiến lên: cược Nhì. */
  bet2?: number
  /** Cược riêng: con Xì dách, kẹo bỏ vào pot lúc mở ván Poker. */
  stakes: Record<ID, number>
  dealer: ID | null
}

/** Cài đặt mở ván mặc định: lấy lại người chơi, nhà cái và mức cược của ván trước. */
export function defaultDraft(session: Session, game: Game): OpenDraft {
  const mod = GAMES[game.type]
  const prev = [...game.rounds].reverse().find((r) => r.kind === 'play')
  const active = session.players.filter((p) => p.active).map((p) => p.id)
  // Người chơi ván trước (bỏ người đang nghỉ) + người mới vào bàn / vừa chơi lại (đang "chờ ván sau")
  const fromPrev = prev?.participants.filter((id) => active.includes(id))
  const joined = fromPrev ? [...fromPrev, ...active.filter((id) => !fromPrev.includes(id))] : active
  const participants = game.type === 'tienlen' ? seatedOf(session) : joined.slice(0, mod.maxPlayers)
  const tl = game.type === 'tienlen' ? tienlenBets(game) : undefined
  const price = game.type === 'loto' ? lotoPrice(game) : undefined
  const bet = price || tl?.bet || prev?.bet || { common: 4, dealer: 5, pot: 1 }[mod.stakeMode]
  const bet2 = tl?.bet2 || prev?.bet2 || Math.max(1, Math.round(bet / 2))
  const dealer = prev?.dealer && participants.includes(prev.dealer) ? prev.dealer : (participants[0] ?? null)
  // Poker / Tự do: không bỏ kẹo vào pot lúc mở ván (blind tự tính / cược bằng tay)
  const limits = game.type === 'xidach' ? xidachLimits(game) : undefined
  const clamp = (v: number) => (limits ? Math.min(limits.max, Math.max(limits.min, v)) : v)
  // Lô tô: tự mua lại số tờ của ván trước (theo giá hiện tại, tối đa lotoMax) — chưa chốt thì ai cũng kéo lại để chỉnh
  const lotoStakes = () => {
    if (!prev || !price) return {}
    const paid = contributions(prev)
    return Object.fromEntries(
      participants
        .map((id) => [id, Math.min(lotoMax(game), Math.floor((paid[id] ?? 0) / (prev.bet || price))) * price] as const)
        .filter(([, v]) => v > 0),
    )
  }
  const stakes =
    game.type === 'loto'
      ? lotoStakes()
      : game.type === 'poker' || game.type === 'free'
        ? {}
        : Object.fromEntries(active.map((id) => [id, clamp(prev?.stakes[id] ?? bet)]))
  return { participants, bet, bet2, stakes, dealer }
}

export interface AppState {
  session: Session | null
  error: string | null
  /** Kết nối tới phòng (bàn nhiều người): null = chưa biết. */
  online: boolean | null
  /** Tạm ngắt kết nối vì app ẩn / lâu không dùng (chạm để nối lại). */
  paused: boolean
  /** Host vừa hoàn tác lượt trao pot của ván đã xong → popup chọn lại người nhận (chỉ trên máy này). */
  reaward: { gameId: ID; roundId: ID; moveId: ID } | null
  /** Trao lại lượt pot đang chờ (`reaward`) cho người khác; undefined = giữ nguyên, đóng popup. */
  reassignAward(to: ID | undefined): string[]
  /** Bàn nhiều người: những người đang có máy mở bàn (chấm xanh). */
  present: ID[]
  /** Máy này đang mở bàn với vai `playerId` (undefined = chưa chọn / rời bàn). */
  markPresent(playerId: ID | undefined): void
  /** Nơi đặt phòng: qua mạng (firebase) hay giả lập trên máy (local); không có = chỉ một máy. */
  roomKind: RoomBackend['kind'] | null
  /** Join bàn bằng mã 5 số: tải bàn từ phòng về máy này. Trả về id bàn, hoặc lỗi. */
  joinRoom(code: string): Promise<{ id?: ID; error?: string }>
  /** Tạo bàn: solo = một máy host ghi hết; multi = có mã 5 số để người khác join (giai đoạn 2). */
  createSession(name: string, players: { name: string; emoji: string }[], mode?: 'solo' | 'multi'): ID
  openSession(id: ID): boolean
  closeSession(): void
  deleteSession(id: ID): void

  addPlayer(name: string, emoji: string): void
  updatePlayer(id: ID, patch: Partial<Pick<Player, 'name' | 'emoji' | 'active'>>): void
  /** Chưa chơi: xóa hẳn. Đã chơi: ẩn khỏi phòng (lời/lỗ giữ nguyên). */
  removePlayer(id: ID): string[]

  addGame(type: GameType): ID
  /** Chọn game đang chơi trên bàn. */
  setCurrentGame(gameId: ID): void
  renameGame(gameId: ID, name: string): void
  removeGame(gameId: ID): void

  /** Mở ván mới. Trả về danh sách lỗi; rỗng = đã mở. */
  openRound(gameId: ID, draft: OpenDraft): string[]
  /** Mở ván ngay với cài đặt của ván trước (người chơi, nhà cái, mức cược). */
  quickOpen(gameId: ID): string[]
  /** Xì dách: đổi nhà cái của ván đang mở (chỉ khi đang đặt cược). */
  setDealer(gameId: ID, playerId: ID): string[]
  /** Xì dách: chốt cược để chia bài và trả kẹo. */
  lockBets(gameId: ID): string[]
  /** Poker: người đang tới lượt Bỏ bài / Xem / Theo / Tố / All-in. */
  pokerAct(gameId: ID, playerId: ID, action: PokerAction): string[]
  /** Poker (showdown): trao pot thứ `index` cho người thắng (nhiều người thì chia đều). */
  pokerAward(gameId: ID, index: number, winners: ID[]): string[]
  /** Poker (showdown): chọn người bài mạnh nhất (nhiều người = hòa) → tự trao mọi pot họ được ăn. */
  pokerAwardBest(gameId: ID, winners: ID[]): string[]
  /** Poker: hoàn tác thao tác cuối trong tay bài. */
  pokerUndo(gameId: ID): string[]
  /** Poker: small blind và mức all-in (áp dụng từ tay sau). */
  setPokerSettings(gameId: ID, sb: number, cap: number): string[]
  /** Lô tô: host đặt giá mỗi tờ (ván đang mở chưa ai mua + mặc định cho ván sau). */
  setLotoPrice(gameId: ID, price: number): string[]
  /** Tiến lên: host đặt mức cược Nhất/Nhì (ván đang mở + mặc định cho ván sau). */
  setTienlenBets(gameId: ID, bet: number, bet2: number, pigs?: { red?: number; black?: number }): string[]
  /** Lô tô (chưa chốt): đặt lại số tờ một người mua trong ván đang mở (0 = bỏ mua). */
  setLotoTickets(gameId: ID, playerId: ID, count: number): string[]
  /** Lô tô: giá mỗi tờ + số tờ tối đa mỗi người một ván. */
  setLotoSettings(gameId: ID, price: number, max: number): string[]
  /** Lô tô (giấy trong app): máy tự gọi số hay người gọi lắc thủ công. */
  setLotoAuto(gameId: ID, auto: boolean): string[]
  /** Lô tô (giấy trong app): cách gọi số — túi / máy gọi / gọi ở ngoài. */
  setLotoCalling(gameId: ID, mode: 'bag' | 'auto' | 'outside'): string[]
  /** Lô tô (giấy trong app, chưa chốt): chọn tờ trong bộ giấy — tự tính kẹo theo số tờ. */
  lotoPickSheets(gameId: ID, playerId: ID, sheets: number[]): string[]
  /** Lô tô (giấy trong app): đổi người gọi số. */
  lotoSetCaller(gameId: ID, playerId: ID): string[]
  /** Lô tô (giấy trong app): người gọi lắc túi ra một số. */
  lotoCall(gameId: ID, by: ID): string[]
  /** Lô tô (giấy trong app): kinh — đúng thì trao cả pot. */
  lotoClaim(gameId: ID, playerId: ID, sheet: number, row: number): string[]
  /** Xì dách: mức cược tối thiểu / tối đa. */
  setXidachLimits(gameId: ID, min: number, max: number): string[]
  /** Đánh bài thật ngoài đời / dùng bài trong app (áp dụng từ ván sau; ván chưa chia thì chia luôn). */
  setCardMode(gameId: ID, mode: 'real' | 'app'): string[]
  /** Tiến lên (bài trong app): đánh bộ bài / bỏ lượt / trả kẹo theo hạng. */
  tienlenPlay(gameId: ID, playerId: ID, cards: number[]): string[]
  tienlenPass(gameId: ID, playerId: ID): string[]
  /** Hết giờ lượt `step` của người này: tự bỏ lượt / đánh lá nhỏ nhất. Lượt đã qua (máy khác đi rồi) thì thôi. */
  tienlenTimeout(gameId: ID, playerId: ID, step: number): string[]
  tienlenPayout(gameId: ID): string[]
  /** Xì dách (bài trong app): rút một lá / dằn (cái dằn = xét tất). */
  xidachDraw(gameId: ID, playerId: ID): string[]
  xidachStand(gameId: ID, playerId: ID): string[]
  /** Cái xét một con / xét tất — lật bài, tự trả kẹo theo kết quả. */
  xidachCheck(gameId: ID, by: ID, target: ID): string[]
  xidachCheckAll(gameId: ID, by: ID): string[]
  /** Hết giờ lượt `step`: con tự dằn, cái tự xét tất. Lượt đã qua thì thôi. */
  xidachTimeout(gameId: ID, playerId: ID, step: number): string[]
  /** Xì dách: host bỏ chốt để cho đặt cược lại (chỉ khi chưa có lượt trả kẹo). */
  unlockBets(gameId: ID): string[]
  /** Chốt ván hiện tại rồi mở ngay ván sau với cài đặt cũ. */
  nextRound(gameId: ID): string[]
  /** Kéo kẹo. Có ván đang mở thì ghi vào ván, không thì ghi thành chuyển tay. */
  addMove(gameId: ID, from: ID, to: ID, amount: number, label: string): string[]
  removeMove(gameId: ID, roundId: ID, moveId: ID): void
  /** Đòi kẹo: `to` đòi `from` trả `amount`, chờ `from` xác nhận. */
  requestCandy(gameId: ID, from: ID, to: ID, amount: number): string[]
  /** Người bị đòi trả lời: OK thì chuyển kẹo; từ chối thì lời đòi vẫn còn (bị từ chối) để người đòi nhờ host. */
  answerRequest(requestId: ID, accept: boolean): string[]
  /** Lời đòi bị từ chối → nhờ host giải quyết. */
  escalateRequest(requestId: ID): string[]
  /** Host duyệt lời đòi được nhờ: OK thì chuyển kẹo luôn; không thì đánh dấu host từ chối. */
  judgeRequest(requestId: ID, accept: boolean): string[]
  /** Người bị đòi đổi ý: trả luôn lời đòi mình đã từ chối (kể cả đang nhờ host / host đã từ chối). */
  payDeclined(requestId: ID): string[]
  cancelRequest(requestId: ID): void
  /** Nhắc lại một yêu cầu còn chờ (lời đòi kẹo hoặc xin hoàn tác) — thông báo bật lại bên kia. */
  pingRequest(requestId: ID): string[]
  setHost(playerId: ID): void
  /** Người chơi bầu host mới (bấm lại để rút phiếu). Đủ phiếu thì người đó thành host. */
  voteHost(voter: ID, candidate: ID): { errors: string[]; elected: boolean }
  /** Host cũ (`from`) offline → `playerId` nhận làm host. Chỉ đổi khi host vẫn là `from` (ai bấm trước được). */
  takeHost(playerId: ID, from: ID | null): void
  /** Bỏ một lượt kéo (ván đang mở hoặc đã kết thúc — tính lại lời/lỗ). Chỉ host gọi trực tiếp. */
  undoMove(gameId: ID, roundId: ID, moveId: ID): string[]
  /** Người chơi xin hoàn tác một lượt — chờ host xác nhận. */
  requestUndo(gameId: ID, roundId: ID, moveId: ID, by: ID): string[]
  answerUndo(undoId: ID, accept: boolean): string[]
  /** Xì dách: người con đặt cược (ghi đè mức cược của ván đang mở). */
  setStake(gameId: ID, playerId: ID, amount: number): string[]
  closeRound(gameId: ID): string[]
  reopenRound(gameId: ID, roundId: ID): string[]
  /** Host quay lại ván trước: bỏ ván đang mở (nếu có) rồi mở lại ván vừa chốt gần nhất. */
  backRound(gameId: ID): string[]
  deleteRound(gameId: ID, roundId: ID): void

}

export function isPlayerUsed(session: Session, playerId: ID): boolean {
  return session.games.some((g) => g.rounds.some((r) => r.participants.includes(playerId)))
}

function validateOpen(game: Game, d: OpenDraft): string[] {
  const mod = GAMES[game.type]
  if (mod.soon) return [`${mod.label} chưa có luật tính — tạm thời chỉ kéo kẹo chuyển tay.`]
  const errors: string[] = []
  const n = d.participants.length
  if (game.type === 'tienlen' && n > mod.maxPlayers) {
    errors.push(`${mod.label} tối đa ${mod.maxPlayers} người — cho người không chơi nghỉ 💤 ở tab Người chơi.`)
  } else if (n < mod.minPlayers || n > mod.maxPlayers) {
    errors.push(`${mod.label} cần ${mod.minPlayers}–${mod.maxPlayers} người chơi.`)
  }
  if (findOpenIn(game)) errors.push('Game này đang có ván chưa chốt.')
  const isInt = (v: number | undefined, min: number) => Number.isInteger(v) && (v as number) >= min

  if (mod.stakeMode === 'common' && (!isInt(d.bet, 1) || !isInt(d.bet2, 1))) {
    errors.push('Cược Nhất và cược Nhì phải là số nguyên lớn hơn 0.')
  }
  if (mod.stakeMode === 'dealer') {
    if (!d.dealer || !d.participants.includes(d.dealer)) errors.push('Chưa chọn nhà cái.')
    else if (d.participants.some((p) => p !== d.dealer && !isInt(d.stakes[p], 1))) {
      errors.push('Mỗi người con phải cược ít nhất 1 kẹo.')
    }
  }
  if (mod.stakeMode === 'pot' && d.participants.some((p) => !isInt(d.stakes[p] ?? 0, 0))) {
    errors.push('Số kẹo bỏ vào pot phải là số nguyên ≥ 0.')
  }
  return errors
}

/** Poker: small blind + mức all-in của game (mặc định 1 và 10 × SB). */
export function pokerSettingsOf(game: Game): { sb: number; cap: number } {
  return game.pokerSettings ?? { sb: DEFAULT_SB, cap: DEFAULT_SB * ALL_IN_MULTIPLIER }
}

/** Khoảng cách tối thiểu giữa hai lần nhắc một yêu cầu. */
export const PING_COOLDOWN_MS = 30_000

/** Còn bao nhiêu giây nữa mới nhắc lại được (0 = nhắc được ngay). */
export function pingWait(req: { at: number; pingedAt?: number; answeredAt?: number }, now: number): number {
  return Math.max(0, Math.ceil(((req.pingedAt ?? req.answeredAt ?? req.at) + PING_COOLDOWN_MS - now) / 1000))
}

/** Mã bàn 5 số ngẫu nhiên (10000–99999). */
function tableCode(): string {
  return String(10000 + Math.floor(Math.random() * 90000))
}

/** Ván chơi đã chốt gần nhất (không tính chuyển tay) — ván mà host có thể quay lại. */
export function prevPlay(game: Game): Round | undefined {
  return [...game.rounds].reverse().find((r) => r.kind === 'play' && r.status === 'closed')
}

function findOpenIn(game: Game): Round | undefined {
  return game.rounds.find((r) => r.status === 'open')
}

/** Chia bài Tiến lên; người về Nhất ván trước (có chia bài) đi trước. */
function dealTienlen(g: Game, participants: ID[]) {
  const prev = [...g.rounds].reverse().find((r) => r.tienlen && r.tienlen.turn === null)?.tienlen
  return deal(participants, shuffled(), prev?.finished[0])
}

export function createAppStore(repo: SessionRepo, rooms?: RoomBackend) {
  return createStore<AppState>()((set, get) => {
    /** Mã phòng nếu bàn này đồng bộ nhiều máy. */
    const roomOf = (s: Session | null | undefined) => (rooms && s?.mode === 'multi' && s.code) || null
    let unwatch: (() => void) | null = null
    let watching: string | null = null
    /** Đang báo có mặt trong phòng nào, với vai ai. */
    let presence: { key: string; stop: () => void } | null = null
    /**
     * Thay đổi của máy này gửi lên phòng lần lượt, đúng thứ tự bấm, sau khi phòng sẵn sàng.
     * Trong lúc còn thay đổi chưa gửi xong thì giữ bản mới nhất từ phòng lại, gửi xong mới áp dụng —
     * để bản cũ trên phòng không đè mất thao tác vừa bấm.
     */
    let queue: Promise<unknown> = Promise.resolve()
    let pending = 0
    let latest: Session | null = null
    const enqueue = (work: () => Promise<unknown>, onFail: (e: unknown) => void) => {
      pending++
      queue = queue
        .then(work)
        .catch(onFail)
        .finally(() => {
          pending--
          if (pending || !latest) return
          const remote = latest
          latest = null
          if (get().session?.id === remote.id) receive(remote)
        })
    }

    /** Nhận bản mới từ phòng (máy khác vừa sửa, hoặc chính mình ghi xong). */
    const receive = (remote: Session) => {
      // Nhận được bản từ phòng = kết nối lại được → bỏ thông báo lỗi phòng cũ
      if (get().error?.includes('phòng')) set({ error: null })
      const next = normalizeSession(remote)
      if (JSON.stringify(next) === JSON.stringify(get().session)) return
      try {
        repo.save(next)
      } catch {
        // Bộ nhớ máy đầy — vẫn hiện bản mới trên màn hình
      }
      set({ session: next })
    }

    /** Mã phòng đã thuộc bàn khác → đổi sang mã mới còn trống. */
    const rehome = async (s: Session) => {
      for (let i = 0; i < 8 && rooms; i++) {
        const code = tableCode()
        if (await rooms.claim(code, { ...s, code })) {
          const next = { ...s, code }
          repo.save(next)
          if (get().session?.id === s.id) set({ session: next })
          connect(next)
          return
        }
      }
    }

    /** Theo dõi phòng của bàn đang mở; phòng chưa có thì đưa bàn lên. */
    const connect = (s: Session) => {
      const code = roomOf(s)
      const key = code && `${s.id}:${code}`
      if (key === watching) return
      unwatch?.()
      unwatch = null
      watching = key
      latest = null
      set({ present: [] })
      if (!rooms || !code) return
      const failed = (e?: unknown) => {
        console.warn('CandyPot: lỗi phòng', e)
        set({ error: 'Không kết nối được phòng chơi nhiều máy — bàn vẫn ghi trên máy này, kiểm tra mạng rồi mở lại bàn.' })
      }
      // Đưa bàn lên phòng trước mọi thay đổi (phòng có sẵn của đúng bàn này thì không ghi gì)
      enqueue(async () => {
        if (!(await rooms.claim(code, s))) await rehome(get().session ?? s)
      }, failed)
      const unwatchPresent = rooms.watchPresent?.(code, (present) => {
        if (get().session?.code === code) set({ present })
      })
      const unwatchRoom = rooms.watch(
        code,
        (remote) => {
          const current = get().session
          if (!current || current.id !== s.id || current.code !== code) return
          if (remote?.id === s.id) {
            if (pending) latest = remote
            else receive(remote)
          } else if (!remote) enqueue(() => rooms.claim(code, get().session ?? current), failed) // phòng mất (bị dọn) → đưa lên lại
          else enqueue(() => rehome(current), failed)
        },
        failed,
      )
      unwatch = () => {
        unwatchRoom()
        unwatchPresent?.()
      }
      // Mở bàn = phòng còn dùng; tiện thể dọn phòng bỏ không lâu ngày
      rooms.touch?.(code).catch(() => {})
      rooms.sweep?.().catch(() => {})
    }

    rooms?.onConnection((online) => set({ online }))

    /** Áp dụng thay đổi lên buổi hiện tại, kiểm tra tổng = 0 rồi lưu (bàn nhiều người: ghi cả lên phòng). */
    const mutate = (fn: (s: Session) => Session) => {
      const current = get().session
      if (!current) return
      const ids: ID[] = []
      recordIds = ids
      let next: Session
      try {
        next = { ...fn(current), updatedAt: Date.now() }
      } finally {
        recordIds = null
      }
      const code = roomOf(current)
      if (rooms && code) {
        // Chạy lại đúng thay đổi này (cùng các id) trên bản mới nhất của phòng — máy khác ghi cùng lúc không bị mất
        enqueue(
          () =>
            rooms.update(code, (remote) => {
              replayIds = [...ids]
              try {
                return { ...fn(normalizeSession(remote)), updatedAt: Date.now() }
              } finally {
                replayIds = null
              }
            }),
          (e) => {
            console.warn('CandyPot: chưa gửi được thay đổi', e)
            set({ error: 'Chưa gửi được thay đổi lên phòng — kiểm tra mạng rồi thao tác lại.' })
          },
        )
      }
      let error: string | null = null
      try {
        assertZeroSum(netOf(next))
      } catch (e) {
        error = `Lỗi tính toán: ${(e as Error).message}`
      }
      try {
        repo.save(next)
      } catch {
        error = 'Không lưu được vào bộ nhớ máy (có thể đã đầy). Dữ liệu vẫn còn trên màn hình.'
      }
      set({ session: next, error })
    }

    /**
     * Một nước Xì dách bài trong app: tính trên bản mới nhất (kể cả lúc chạy lại trên phòng), kết quả xét mới
     * thì tự ghi lượt trả kẹo (thắng: cái trả con; thua: con trả cái; ×2 / ×3 với bài đặc biệt).
     */
    const xidachDo = (gameId: ID, fn: (s: XidachCards) => XidachCards | string): string[] => {
      const open = openOf(gameId)
      if (!open?.xidach) return ['Ván này không chia bài trong app.']
      const first = fn(open.xidach)
      if (typeof first === 'string') return [first]
      mapRound(gameId, open.id, (x) => {
        if (!x.xidach) return x
        const r = fn(x.xidach)
        if (typeof r === 'string') return x
        const pay = xidachPayouts(x.xidach, r, x.stakes).map((p) => ({ id: newId(), ...p }))
        return { ...x, xidach: r, moves: [...x.moves, ...pay] }
      })
      return []
    }

    /** Lô tô chơi bằng giấy trong app (bàn nhiều người, host gạt "Trên app"). */
    const lotoApp = (g: Game) => g.type === 'loto' && g.cardMode === 'app' && get().session?.mode === 'multi'

    const mapGame = (gameId: ID, fn: (g: Game) => Game) =>
      mutate((s) => ({ ...s, games: s.games.map((g) => (g.id === gameId ? fn(g) : g)) }))

    const mapRound = (gameId: ID, roundId: ID, fn: (r: Round) => Round) =>
      mapGame(gameId, (g) => ({ ...g, rounds: g.rounds.map((r) => (r.id === roundId ? fn(r) : r)) }))

    const game = (gameId: ID) => get().session?.games.find((g) => g.id === gameId)
    const openOf = (gameId: ID) => {
      const g = game(gameId)
      return g && findOpenIn(g)
    }

    return {
      session: null,
      error: null,
      online: null,
      paused: false,
      reaward: null,
      present: [],
      roomKind: rooms?.kind ?? null,

      async joinRoom(code) {
        if (!rooms) return { error: 'Máy này chưa bật chơi nhiều máy.' }
        let remote: Session | null
        try {
          remote = await rooms.fetch(code)
        } catch {
          return { error: 'Không kết nối được — kiểm tra mạng rồi thử lại.' }
        }
        if (!remote) return { error: `Không có bàn nào mã ${code}.` }
        repo.save(normalizeSession(remote))
        return { id: remote.id }
      },

      createSession(name, players, mode = 'solo') {
        const now = Date.now()
        const session: Session = {
          id: newId(),
          name: name.trim() || 'Bàn chơi',
          mode,
          code: mode === 'multi' ? tableCode() : undefined,
          createdAt: now,
          updatedAt: now,
          hostId: null,
          players: players
            .slice(0, MAX_PLAYERS)
            .map((p) => ({ id: newId(), name: p.name.trim(), emoji: p.emoji, active: true })),
          games: [],
          requests: [],
          undos: [],
          hostVotes: {},
        }
        session.hostId = session.players[0]?.id ?? null
        repo.save(session)
        set({ session, error: null })
        connect(session)
        return session.id
      },

      openSession(id) {
        const raw = repo.load(id)
        const session = raw && normalizeSession(raw)
        set({ session, error: null })
        if (session) connect(session)
        return raw !== null
      },

      markPresent(playerId) {
        const code = roomOf(get().session)
        const key = code && playerId ? `${code}:${playerId}` : null
        if (key === (presence?.key ?? null)) return
        presence?.stop()
        presence = null
        if (key && code && playerId && rooms?.present) presence = { key, stop: rooms.present(code, playerId) }
      },

      closeSession() {
        get().markPresent(undefined)
        unwatch?.()
        unwatch = null
        watching = null
        set({ session: null, error: null, present: [] })
      },

      deleteSession(id) {
        repo.remove(id)
        if (get().session?.id === id) set({ session: null })
      },

      addPlayer(name, emoji) {
        const s = get().session
        if (!s || s.players.filter((p) => !p.removed).length >= MAX_PLAYERS) return
        // Thêm lại đúng tên người đã xóa khỏi phòng → đưa người đó về (giữ lời/lỗ cũ)
        const back = s.players.find((p) => p.removed && p.name.toLowerCase() === name.trim().toLowerCase())
        if (back) {
          mutate((s) => ({ ...s, players: s.players.map((p) => (p.id === back.id ? { ...p, removed: false, active: true } : p)) }))
          return
        }
        mutate((s) => ({ ...s, players: [...s.players, { id: newId(), name: name.trim(), emoji, active: true }] }))
      },

      updatePlayer(id, patch) {
        mutate((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      },

      removePlayer(id) {
        const s = get().session
        const p = s?.players.find((x) => x.id === id)
        if (!s || !p) return ['Không tìm thấy người này.']
        if (id === s.hostId) return [`${p.name} đang là host — chuyển host cho người khác trước.`]
        if (s.games.some((g) => findOpenIn(g)?.participants.includes(id)))
          return [`${p.name} đang trong ván chưa kết thúc — kết thúc hoặc hủy ván đó trước.`]
        const used = isPlayerUsed(s, id)
        mutate((s) => ({
          ...s,
          // Đã chơi thì chỉ ẩn khỏi phòng để lời/lỗ và lịch sử vẫn đúng
          players: used
            ? s.players.map((x) => (x.id === id ? { ...x, removed: true, active: false } : x))
            : s.players.filter((x) => x.id !== id),
          requests: s.requests.filter((r) => r.from !== id && r.to !== id),
          undos: s.undos.filter((u) => u.by !== id),
          hostVotes: Object.fromEntries(Object.entries(s.hostVotes).filter(([v, c]) => v !== id && c !== id)),
        }))
        return []
      },

      addGame(type) {
        const id = newId()
        mutate((s) => {
          const label = GAMES[type].label
          const same = s.games.filter((g) => g.type === type).length
          return {
            ...s,
            games: [
              ...s.games,
              {
                id,
                type,
                name: same ? `${label} ${same + 1}` : label,
                rounds: [],
              },
            ],
          }
        })
        return id
      },

      setCurrentGame(gameId) {
        if (get().session?.currentGameId === gameId || !game(gameId)) return
        mutate((s) => ({ ...s, currentGameId: gameId }))
      },

      renameGame(gameId, name) {
        mapGame(gameId, (g) => ({ ...g, name }))
      },

      removeGame(gameId) {
        mutate((s) => ({
          ...s,
          games: s.games.filter((g) => g.id !== gameId),
          requests: s.requests.filter((r) => r.gameId !== gameId),
          undos: s.undos.filter((u) => u.gameId !== gameId),
        }))
      },

      openRound(gameId, draft) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        const errors = validateOpen(g, draft)
        if (errors.length) return errors
        const mode = GAMES[g.type].stakeMode
        const stakes = Object.fromEntries(
          draft.participants
            .filter((p) => (mode === 'dealer' ? p !== draft.dealer : mode === 'pot'))
            .map((p) => [p, draft.stakes[p] ?? 0]),
        )
        const round: Round = {
          id: newId(),
          at: Date.now(),
          kind: 'play',
          status: 'open',
          participants: draft.participants,
          bet: draft.bet,
          bet2: mode === 'common' ? draft.bet2 : undefined,
          stakes,
          dealer: mode === 'dealer' ? draft.dealer : null,
          phase: GAMES[g.type].phases ? 'betting' : undefined,
          moves:
            mode === 'pot'
              ? Object.entries(stakes)
                  .filter(([, v]) => v > 0)
                  .map(([p, v]) => ({
                    id: newId(),
                    from: p,
                    to: POT,
                    amount: v,
                    label: g.type === 'loto' ? `${v / draft.bet} tờ` : 'Cược mở ván',
                  }))
              : [],
          transfers: [],
          tags: [],
        }
        if (g.type === 'poker') {
          // Poker: xoay nút D, tự bỏ SB/BB; chip trong tay bài đi qua pokerAct
          const { sb, cap } = pokerSettingsOf(g)
          const seat = new Map((get().session?.players ?? []).map((p, i) => [p.id, i]))
          const order = [...draft.participants].sort((x, y) => (seat.get(x) ?? 0) - (seat.get(y) ?? 0))
          const prev = [...g.rounds].reverse().find((r) => r.poker)?.poker
          const hand = startHand(order, nextButton(order, prev?.order, prev?.button), sb, cap, newId)
          Object.assign(round, { participants: order, bet: 2 * sb, stakes: {}, moves: hand.moves, poker: hand.hand })
        }
        if (g.type === 'tienlen' && g.cardMode === 'app' && get().session?.mode === 'multi') round.tienlen = dealTienlen(g, round.participants)
        if (lotoApp(g)) {
          // Giấy trong app: mỗi người giữ lại tờ ván trước (như giấy thật), số tờ = số tờ tự mua lại
          const prev = [...g.rounds].reverse().find((r) => r.loto)?.loto
          const loto = emptyLoto(prev?.caller && round.participants.includes(prev.caller) ? prev.caller : (get().session?.hostId ?? null))
          for (const p of round.participants) {
            const keep = (prev?.sheets[p] ?? []).slice(0, Math.round((stakes[p] ?? 0) / round.bet))
            if (keep.length) loto.sheets[p] = keep
          }
          round.loto = loto
          round.moves = Object.entries(loto.sheets).map(([p, list]) => ({ id: newId(), from: p, to: POT, amount: list.length * round.bet, label: `${list.length} tờ` }))
        }
        mapGame(gameId, (g) => ({
          ...g,
          rounds: [...g.rounds, round],
          bets: g.type === 'tienlen' ? { bet: round.bet, bet2: round.bet2 ?? round.bet } : g.bets,
        }))
        return []
      },

      setTienlenBets(gameId, bet, bet2, pigs = {}) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        const values = [bet, bet2, pigs.red, pigs.black].filter((v) => v !== undefined)
        if (!values.every((v) => Number.isInteger(v) && (v as number) > 0)) return ['Mức cược phải là số nguyên lớn hơn 0.']
        if (bet2 > bet) return ['Cược Nhì không được lớn hơn cược Nhất.']
        const open = findOpenIn(g)
        mapGame(gameId, (x) => ({
          ...x,
          bets: { bet, bet2, red: pigs.red, black: pigs.black },
          rounds: x.rounds.map((r) => (r.id === open?.id ? { ...r, bet, bet2 } : r)),
        }))
        return []
      },

      setLotoPrice(gameId, price) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (!Number.isInteger(price) || price <= 0) return ['Giá mỗi tờ phải là số nguyên lớn hơn 0.']
        const open = findOpenIn(g)
        if (open?.moves.length) return ['Ván này đã có người mua tờ — đổi giá ở ván sau.']
        mapGame(gameId, (x) => ({
          ...x,
          price,
          rounds: x.rounds.map((r) => (r.id === open?.id ? { ...r, bet: price } : r)),
        }))
        return []
      },

      pokerAct(gameId, playerId, action) {
        const open = openOf(gameId)
        if (!open?.poker) return ['Chưa có tay bài nào đang chơi.']
        const r = act({ hand: open.poker, moves: open.moves }, playerId, action, newId)
        if (typeof r === 'string') return [r]
        mapRound(gameId, open.id, (x) => ({ ...x, poker: r.hand, moves: r.moves }))
        return []
      },

      pokerAward(gameId, index, winners) {
        const open = openOf(gameId)
        if (!open?.poker) return ['Chưa có tay bài nào đang chơi.']
        const r = award({ hand: open.poker, moves: open.moves }, index, winners, newId)
        if (typeof r === 'string') return [r]
        mapRound(gameId, open.id, (x) => ({ ...x, poker: r.hand, moves: r.moves }))
        return []
      },

      pokerAwardBest(gameId, winners) {
        const open = openOf(gameId)
        if (!open?.poker) return ['Chưa có tay bài nào đang chơi.']
        const r = awardBest({ hand: open.poker, moves: open.moves }, winners, newId)
        if (typeof r === 'string') return [r]
        mapRound(gameId, open.id, (x) => ({ ...x, poker: r.hand, moves: r.moves }))
        return []
      },

      pokerUndo(gameId) {
        const open = openOf(gameId)
        if (!open?.poker) return ['Chưa có tay bài nào đang chơi.']
        const r = undoLast({ hand: open.poker, moves: open.moves })
        if (typeof r === 'string') return [r]
        mapRound(gameId, open.id, (x) => ({ ...x, poker: r.hand, moves: r.moves }))
        return []
      },

      setPokerSettings(gameId, sb, cap) {
        if (!game(gameId)) return ['Không tìm thấy game.']
        if (![sb, cap].every((v) => Number.isInteger(v) && v > 0)) return ['Small blind và mức all-in phải là số nguyên lớn hơn 0.']
        if (cap < 2 * sb) return [`Mức all-in phải ít nhất bằng big blind (${2 * sb}).`]
        mapGame(gameId, (g) => ({ ...g, pokerSettings: { sb, cap } }))
        return []
      },

      setLotoSettings(gameId, price, max) {
        if (!Number.isInteger(max) || max < 1) return ['Số tờ tối đa phải là số nguyên từ 1 trở lên.']
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (price !== lotoPrice(g)) {
          const errors = get().setLotoPrice(gameId, price)
          if (errors.length) return errors
        }
        mapGame(gameId, (x) => ({ ...x, lotoMax: max }))
        return []
      },

      setXidachLimits(gameId, min, max) {
        if (!game(gameId)) return ['Không tìm thấy game.']
        if (![min, max].every((v) => Number.isInteger(v) && v > 0)) return ['Mức cược phải là số nguyên lớn hơn 0.']
        if (max < min) return ['Cược tối đa phải lớn hơn hoặc bằng cược tối thiểu.']
        mapGame(gameId, (x) => ({ ...x, xidachLimits: { min, max } }))
        return []
      },

      setCardMode(gameId, mode) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (mode === 'app' && get().session?.mode !== 'multi') return ['Bài trong app chỉ chơi được ở bàn nhiều người.']
        const open = findOpenIn(g)
        // Ván đang mở chưa có lượt kẹo nào → chia bài / bỏ bài luôn cho ván này
        const fresh = open && !open.moves.length && g.type === 'tienlen'
        const cards = fresh && mode === 'app' ? dealTienlen(g, open.participants) : undefined
        mapGame(gameId, (x) => ({
          ...x,
          cardMode: mode,
          rounds: x.rounds.map((r) => (fresh && r.id === open.id ? { ...r, tienlen: cards } : r)),
        }))
        return []
      },

      tienlenPlay(gameId, playerId, cards) {
        const open = openOf(gameId)
        if (!open?.tienlen) return ['Ván này không chia bài trong app.']
        const r = playTienlen(open.tienlen, playerId, cards)
        if (typeof r === 'string') return [r]
        // Về hết → app tự trả kẹo theo hạng
        const pay = tienlenPayouts(r, open.bet, open.bet2 ?? open.bet).map((p) => ({
          id: newId(),
          from: p.from,
          to: p.to,
          amount: p.amount,
          label: `Bài: ${p.label}`,
        }))
        const paid = (x: Round) => x.moves.some((m) => m.label.startsWith('Bài:'))
        mapRound(gameId, open.id, (x) => (x.tienlen ? { ...x, tienlen: r, moves: paid(x) ? x.moves : [...x.moves, ...pay] } : x))
        return []
      },

      tienlenPass(gameId, playerId) {
        const open = openOf(gameId)
        if (!open?.tienlen) return ['Ván này không chia bài trong app.']
        const r = passTienlen(open.tienlen, playerId)
        if (typeof r === 'string') return [r]
        mapRound(gameId, open.id, (x) => (x.tienlen ? { ...x, tienlen: r } : x))
        return []
      },

      tienlenTimeout(gameId, playerId, step) {
        const open = openOf(gameId)
        if (!open?.tienlen) return ['Ván này không chia bài trong app.']
        if (open.tienlen.turn !== playerId || (open.tienlen.step ?? 0) !== step) return []
        // Tính trên bản mới nhất (kể cả lúc chạy lại trên phòng): lượt đã đổi thì không làm gì
        mapRound(gameId, open.id, (x) => {
          const t = x.tienlen
          if (!t || t.turn !== playerId || (t.step ?? 0) !== step) return x
          const r = autoTienlen(t, playerId)
          if (typeof r === 'string') return x
          const paid = x.moves.some((m) => m.label.startsWith('Bài:'))
          const pay = paid
            ? []
            : tienlenPayouts(r, x.bet, x.bet2 ?? x.bet).map((p) => ({ id: newId(), from: p.from, to: p.to, amount: p.amount, label: `Bài: ${p.label}` }))
          return { ...x, tienlen: r, moves: [...x.moves, ...pay] }
        })
        return []
      },

      xidachDraw(gameId, playerId) {
        return xidachDo(gameId, (s) => drawXidach(s, playerId))
      },
      xidachStand(gameId, playerId) {
        return xidachDo(gameId, (s) => standXidach(s, playerId))
      },
      xidachCheck(gameId, by, target) {
        return xidachDo(gameId, (s) => checkXidach(s, by, target))
      },
      xidachCheckAll(gameId, by) {
        return xidachDo(gameId, (s) => checkAllXidach(s, by))
      },
      xidachTimeout(gameId, playerId, step) {
        return xidachDo(gameId, (s) => (s.turn === playerId && s.step === step ? autoXidach(s, playerId) : 'Lượt đã qua.'))
      },

      tienlenPayout(gameId) {
        const open = openOf(gameId)
        if (!open?.tienlen) return ['Ván này không chia bài trong app.']
        const list = tienlenPayouts(open.tienlen, open.bet, open.bet2 ?? open.bet)
        if (!list.length) return ['Ván bài chưa xong.']
        if (open.moves.some((m) => m.label.startsWith('Bài:'))) return ['Đã trả kẹo theo hạng rồi.']
        const moves = list.map((p) => ({ id: newId(), from: p.from, to: p.to, amount: p.amount, label: `Bài: ${p.label}` }))
        mapRound(gameId, open.id, (x) => (x.moves.some((m) => m.label.startsWith('Bài:')) ? x : { ...x, moves: [...x.moves, ...moves] }))
        return []
      },

      quickOpen(gameId) {
        const g = game(gameId)
        const s = get().session
        if (!g || !s) return ['Không tìm thấy game.']
        return get().openRound(gameId, defaultDraft(s, g))
      },

      setDealer(gameId, playerId) {
        const open = openOf(gameId)
        if (!open) return ['Chưa có ván nào đang mở.']
        if (!open.participants.includes(playerId)) return ['Người này không chơi ván này.']
        if (open.phase === 'playing') return ['Đã chốt cược — đổi cái ở ván sau.']
        if (open.dealer === playerId) return []
        const old = open.dealer
        mapRound(gameId, open.id, (r) => {
          const stakes = { ...r.stakes }
          const moved = stakes[playerId]
          delete stakes[playerId]
          if (old) stakes[old] = moved ?? r.bet
          return { ...r, dealer: playerId, stakes }
        })
        return []
      },

      lockBets(gameId) {
        const open = openOf(gameId)
        if (!open) return ['Chưa có ván nào đang mở.']
        if (open.phase !== 'betting') return []
        const g = game(gameId)
        // Xì dách bài trong app: chốt cược là chia bài luôn (chia sẵn ở đây — chạy lại trên phòng vẫn đúng bộ bài này)
        const cards =
          g?.type === 'xidach' && g.cardMode === 'app' && get().session?.mode === 'multi' && open.dealer
            ? dealXidach(open.participants, open.dealer)
            : undefined
        mapRound(gameId, open.id, (r) => {
          if (r.phase !== 'betting') return r
          if (!cards) return { ...r, phase: 'playing', ...(r.loto && { loto: { ...r.loto, caller: r.loto.caller ?? get().session?.hostId ?? null } }) }
          // Vừa chia đã có xì bàn / xì dách → trả kẹo luôn
          const pay = xidachPayouts(undefined, cards, r.stakes).map((p) => ({ id: newId(), ...p }))
          return { ...r, phase: 'playing', xidach: cards, moves: [...r.moves, ...pay] }
        })
        return []
      },

      unlockBets(gameId) {
        const open = openOf(gameId)
        if (!open) return ['Chưa có ván nào đang mở.']
        if (open.phase !== 'playing') return []
        // Tự do: cược nằm trong pot nên chỉ chặn khi đã trao pot; Xì dách: chặn khi đã có lượt trả kẹo
        const paid = game(gameId)?.type === 'free' ? open.moves.some((m) => m.from === POT) : open.moves.length > 0
        if (paid) return ['Ván đã có lượt trả kẹo — hoàn tác hết rồi mới bỏ chốt được.']
        mapRound(gameId, open.id, (r) => {
          const next = { ...r, phase: 'betting' as const }
          delete next.xidach
          return next
        })
        return []
      },

      nextRound(gameId) {
        const errors = get().closeRound(gameId)
        return errors.length ? errors : get().quickOpen(gameId)
      },

      addMove(gameId, from, to, amount, label) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (from === to) return ['Người đưa và người nhận phải khác nhau.']
        if (!Number.isInteger(amount) || amount <= 0) return ['Số kẹo phải là số nguyên lớn hơn 0.']
        const move = { id: newId(), from, to, amount, label: label.trim() || 'Chuyển tay' }
        const open = findOpenIn(g)
        // Không trao nhiều hơn số kẹo đang có trong pot (pot không được âm)
        if (open && from === POT && amount > potOf(open)) return [`Pot chỉ còn ${potOf(open)} kẹo.`]
        if (open?.poker && (from === POT || to === POT)) return ['Poker: dùng các nút Theo / Tố / Bỏ bài bên dưới.']
        if (g.type === 'free' && open) {
          if (open.phase === 'betting' && from === POT) return ['Chưa chốt cược — bấm Chốt cược rồi mới trao pot.']
          if (open.phase === 'playing' && to === POT) return ['Đã chốt cược — không cược thêm được nữa.']
        } else if (g.type === 'loto' && open) {
          if (open.phase === 'betting' && to !== POT) return ['Đang mua tờ — bấm Chốt rồi host mới trao pot.']
          if (open.phase === 'playing' && to === POT) return ['Đã chốt — không mua thêm tờ được nữa.']
          if (to === POT && lotoApp(g)) return ['Lô tô giấy trong app: bấm ô Mua để chọn tờ.']
          if (to === POT) {
            const bought = open.moves.filter((m) => m.from === from && m.to === POT).reduce((s, m) => s + m.amount, 0)
            const cap = lotoMax(g) * open.bet
            if (bought + amount > cap) return [`Mỗi người mua tối đa ${lotoMax(g)} tờ một ván (${cap} kẹo).`]
          }
        } else if (open?.phase === 'betting') return ['Đang đặt cược — bấm Chốt cược rồi mới trả kẹo.']
        if (open) {
          const inRound = (id: ID) => id === POT || open.participants.includes(id)
          if (!inRound(from) || !inRound(to)) return ['Chỉ kéo kẹo giữa những người trong ván.']
          mapRound(gameId, open.id, (r) => ({ ...r, moves: [...r.moves, move] }))
          return []
        }
        if (from === POT || to === POT) return ['Chưa có ván nào đang mở.']
        mapGame(gameId, (g) => ({
          ...g,
          rounds: [
            ...g.rounds,
            {
              id: newId(),
              at: Date.now(),
              kind: 'manual',
              status: 'closed',
              participants: [from, to],
              bet: 0,
              stakes: {},
              dealer: null,
              moves: [move],
              transfers: [{ from, to, amount, reason: move.label }],
              tags: [],
            },
          ],
        }))
        return []
      },

      removeMove(gameId, roundId, moveId) {
        mapRound(gameId, roundId, (r) => ({ ...r, moves: r.moves.filter((m) => m.id !== moveId) }))
      },

      closeRound(gameId) {
        const open = openOf(gameId)
        if (!open) return ['Không có ván nào đang mở.']
        if (open.poker && open.poker.street !== 'done') return ['Tay bài chưa xong — chơi hết các vòng và trao pot trước.']
        let transfers
        try {
          transfers = closeTransfers(open)
        } catch (e) {
          return [(e as Error).message]
        }
        const tags: Tag[] = open.dealer ? [{ type: 'lam-cai', playerId: open.dealer }] : []
        // Poker: bỏ các bản chụp hoàn tác khi chốt — tay đã xong, bớt dữ liệu lưu và gửi đi
        mapRound(gameId, open.id, (r) => ({ ...r, status: 'closed', transfers, tags, ...(r.poker && { poker: { ...r.poker, undo: [] } }) }))
        return []
      },

      reopenRound(gameId, roundId) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (findOpenIn(g)) return ['Game này đang có ván chưa chốt. Chốt hoặc hủy ván đó trước.']
        mapRound(gameId, roundId, (r) => ({ ...r, status: 'open', transfers: [], tags: [] }))
        return []
      },

      backRound(gameId) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        const prev = prevPlay(g)
        if (!prev) return ['Chưa có ván trước để quay lại.']
        const open = findOpenIn(g)
        mutate((s) => ({
          ...s,
          games: s.games.map((x) =>
            x.id === gameId
              ? {
                  ...x,
                  rounds: x.rounds
                    .filter((r) => r.id !== open?.id)
                    .map((r) => (r.id === prev.id ? { ...r, status: 'open' as const, transfers: [], tags: [] } : r)),
                }
              : x,
          ),
          undos: s.undos.filter((u) => u.roundId !== open?.id),
        }))
        return []
      },

      deleteRound(gameId, roundId) {
        mutate((s) => ({
          ...s,
          games: s.games.map((g) => (g.id === gameId ? { ...g, rounds: g.rounds.filter((r) => r.id !== roundId) } : g)),
          undos: s.undos.filter((u) => u.roundId !== roundId),
        }))
      },

      requestCandy(gameId, from, to, amount) {
        if (!game(gameId)) return ['Không tìm thấy game.']
        if (from === to || from === POT || to === POT) return ['Chỉ đòi kẹo giữa hai người chơi.']
        if (!Number.isInteger(amount) || amount <= 0) return ['Số kẹo phải là số nguyên lớn hơn 0.']
        mutate((s) => ({ ...s, requests: [...s.requests, { id: newId(), gameId, from, to, amount, at: Date.now() }] }))
        return []
      },

      answerRequest(requestId, accept) {
        const req = get().session?.requests.find((r) => r.id === requestId)
        if (!req) return ['Lời đòi kẹo này không còn nữa.']
        if (req.status) return ['Lời đòi này đã được trả lời rồi.']
        if (accept) {
          const errors = get().addMove(req.gameId, req.from, req.to, req.amount, 'Đòi kẹo')
          if (errors.length) return errors
          mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
          return []
        }
        // Từ chối: giữ lại cho người đòi thấy (nhờ host hoặc tự xóa)
        const now = Date.now()
        mutate((s) => ({
          ...s,
          requests: s.requests.map((r) => (r.id === requestId && !r.status ? { ...r, status: 'declined' as const, answeredAt: now } : r)),
        }))
        return []
      },

      escalateRequest(requestId) {
        const req = get().session?.requests.find((r) => r.id === requestId)
        if (!req) return ['Lời đòi kẹo này không còn nữa.']
        if (req.status !== 'declined') return ['Chỉ nhờ host được khi lời đòi bị từ chối.']
        const now = Date.now()
        mutate((s) => ({
          ...s,
          requests: s.requests.map((r) =>
            r.id === requestId && r.status === 'declined'
              ? { ...r, status: 'escalated' as const, answeredAt: now, pingedAt: undefined, pings: undefined }
              : r,
          ),
        }))
        return []
      },

      judgeRequest(requestId, accept) {
        const req = get().session?.requests.find((r) => r.id === requestId)
        if (!req) return ['Lời đòi kẹo này không còn nữa.']
        if (req.status !== 'escalated' && req.status !== 'declined') return ['Lời đòi này không chờ host duyệt.']
        if (accept) {
          const errors = get().addMove(req.gameId, req.from, req.to, req.amount, 'Host duyệt đòi kẹo')
          if (errors.length) return errors
          mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
          return []
        }
        const now = Date.now()
        mutate((s) => ({
          ...s,
          requests: s.requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' as const, answeredAt: now } : r)),
        }))
        return []
      },

      payDeclined(requestId) {
        const req = get().session?.requests.find((r) => r.id === requestId)
        if (!req) return ['Lời đòi kẹo này không còn nữa.']
        if (!req.status) return ['Lời đòi này vẫn đang chờ bạn trả lời.']
        const errors = get().addMove(req.gameId, req.from, req.to, req.amount, 'Đòi kẹo')
        if (errors.length) return errors
        mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
        return []
      },

      setLotoCalling(gameId, mode) {
        if (!game(gameId)) return ['Không tìm thấy game.']
        mapGame(gameId, (x) => ({ ...x, lotoAuto: mode === 'auto', lotoOutside: mode === 'outside' }))
        return []
      },

      setLotoAuto(gameId, auto) {
        if (!game(gameId)) return ['Không tìm thấy game.']
        mapGame(gameId, (x) => ({ ...x, lotoAuto: auto }))
        return []
      },

      lotoPickSheets(gameId, playerId, ids) {
        const g = game(gameId)
        const open = openOf(gameId)
        if (!g || g.type !== 'loto' || !open) return ['Chưa có ván Lô tô nào đang mở.']
        if (open.phase === 'playing') return ['Đã chốt — không đổi tờ được nữa.']
        if (!open.participants.includes(playerId)) return ['Người này không chơi ván này.']
        const total = 2 * pairsFor(open.participants.length, lotoMax(g))
        const first = pickSheets(open.loto ?? emptyLoto(get().session?.hostId ?? null), playerId, ids, lotoMax(g), total)
        if (typeof first === 'string') return [first]
        const move = { id: newId(), from: playerId, to: POT, amount: ids.length * open.bet, label: `${ids.length} tờ` }
        // Tính lại trên bản mới nhất: ai vừa mua mất tờ đó thì thôi (không mua trùng)
        mapRound(gameId, open.id, (r) => {
          const next = pickSheets(r.loto ?? emptyLoto(get().session?.hostId ?? null), playerId, ids, lotoMax(g), total)
          if (typeof next === 'string' || r.phase === 'playing') return r
          const others = r.moves.filter((m) => !(m.from === playerId && m.to === POT))
          return { ...r, loto: next, moves: ids.length ? [...others, move] : others }
        })
        return []
      },

      lotoSetCaller(gameId, playerId) {
        const open = openOf(gameId)
        if (!open?.loto) return ['Ván này không chơi giấy trong app.']
        if (!open.participants.includes(playerId) && playerId !== get().session?.hostId) return ['Người này không ở trong ván.']
        mapRound(gameId, open.id, (r) => (r.loto ? { ...r, loto: { ...r.loto, caller: playerId } } : r))
        return []
      },

      lotoCall(gameId, by) {
        const open = openOf(gameId)
        if (!open?.loto) return ['Ván này không chơi giấy trong app.']
        if (open.phase !== 'playing') return ['Chốt mua tờ rồi mới gọi số.']
        const left = lotoRemaining(open.loto)
        if (!left.length) return ['Đã gọi hết 90 số.']
        // Lắc ra một số ở đây (chạy lại trên phòng vẫn là số này); số đó vừa bị gọi ở máy khác thì thôi
        const n = left[Math.floor(Math.random() * left.length)]
        const first = callLoto(open.loto, by, n)
        if (typeof first === 'string') return [first]
        mapRound(gameId, open.id, (r) => {
          if (!r.loto) return r
          const next = callLoto(r.loto, by, n)
          return typeof next === 'string' ? r : { ...r, loto: next }
        })
        return []
      },

      lotoClaim(gameId, playerId, sheet, row) {
        const g = game(gameId)
        const open = openOf(gameId)
        if (!g || !open?.loto) return ['Ván này không chơi giấy trong app.']
        const papers = sheetSet(g.id, pairsFor(open.participants.length, lotoMax(g)))
        const outside = !!g.lotoOutside
        const first = claimLoto(open.loto, papers, playerId, sheet, row, outside)
        if (typeof first === 'string') return [first]
        const award = { id: newId(), from: POT, to: playerId, amount: 0, label: 'Kinh! Ăn pot' }
        mapRound(gameId, open.id, (r) => {
          if (!r.loto) return r
          const next: LotoState | string = claimLoto(r.loto, papers, playerId, sheet, row, outside)
          if (typeof next === 'string') return r
          const pot = potOf(r)
          return { ...r, loto: next, moves: pot > 0 ? [...r.moves, { ...award, amount: pot }] : r.moves }
        })
        return []
      },

      setLotoTickets(gameId, playerId, count) {
        const g = game(gameId)
        const open = openOf(gameId)
        if (!g || g.type !== 'loto' || !open) return ['Chưa có ván Lô tô nào đang mở.']
        if (open.phase === 'playing') return ['Đã chốt — không đổi số tờ được nữa.']
        if (lotoApp(g)) return ['Lô tô giấy trong app: bấm ô Mua để chọn tờ.']
        if (!open.participants.includes(playerId)) return ['Người này không chơi ván này.']
        if (!Number.isInteger(count) || count < 0 || count > lotoMax(g)) return [`Mỗi người mua 0–${lotoMax(g)} tờ một ván.`]
        // Gộp các lần mua của người này thành một lượt đúng số tờ mới
        const move = { id: newId(), from: playerId, to: POT, amount: count * open.bet, label: `${count} tờ` }
        mapRound(gameId, open.id, (r) => {
          const others = r.moves.filter((m) => !(m.from === playerId && m.to === POT))
          return { ...r, moves: count ? [...others, move] : others }
        })
        return []
      },

      setStake(gameId, playerId, amount) {
        const open = openOf(gameId)
        if (!open) return ['Chưa có ván nào đang mở.']
        if (open.dealer === playerId) return ['Nhà cái không đặt cược.']
        if (open.phase === 'playing') return ['Đã chốt cược — bấm Kết thúc để sang ván mới rồi cược lại.']
        if (!open.participants.includes(playerId)) return ['Người này không chơi ván này.']
        if (!Number.isInteger(amount) || amount <= 0) return ['Tiền cược phải là số nguyên lớn hơn 0.']
        const g = game(gameId)
        const { min, max } = g ? xidachLimits(g) : { min: 1, max: Infinity }
        if (amount < min || amount > max) return [`Cược từ ${min} đến ${max} kẹo.`]
        mapRound(gameId, open.id, (r) => ({ ...r, stakes: { ...r.stakes, [playerId]: amount } }))
        return []
      },

      setHost(playerId) {
        mutate((s) => ({ ...s, hostId: playerId, hostVotes: {} }))
      },

      takeHost(playerId, from) {
        mutate((s) => (s.hostId === from ? { ...s, hostId: playerId, hostVotes: {} } : s))
      },

      voteHost(voter, candidate) {
        const s = get().session
        if (!s) return { errors: ['Chưa mở buổi.'], elected: false }
        const players = new Map(s.players.map((p) => [p.id, p]))
        if (!players.get(voter)?.active) return { errors: ['Người đang nghỉ không bầu được.'], elected: false }
        if (!players.has(candidate)) return { errors: ['Không tìm thấy người này.'], elected: false }
        if (candidate === s.hostId) return { errors: [`${players.get(candidate)!.name} đang là host rồi.`], elected: false }
        // Bấm lại đúng người mình đã bầu = rút phiếu
        const { [voter]: mine, ...rest } = s.hostVotes
        const hostVotes = mine === candidate ? rest : { ...rest, [voter]: candidate }
        const next = { ...s, hostVotes }
        if ((hostVoteTally(next)[candidate] ?? 0) >= hostVotesNeeded(next)) {
          mutate((x) => ({ ...x, hostId: candidate, hostVotes: {} }))
          return { errors: [], elected: true }
        }
        mutate((x) => ({ ...x, hostVotes }))
        return { errors: [], elected: false }
      },

      undoMove(gameId, roundId, moveId) {
        const round = game(gameId)?.rounds.find((r) => r.id === roundId)
        if (!round?.moves.some((m) => m.id === moveId)) return ['Lượt này không còn nữa.']
        if (round.status === 'open' && round.poker) return ['Poker: dùng nút ↩ trên bàn để hoàn tác thao tác cuối.']
        const moves = round.moves.filter((m) => m.id !== moveId)
        const dropPending = (s: Session) => ({ ...s, undos: s.undos.filter((u) => u.moveId !== moveId) })
        // Bỏ lượt bỏ kẹo vào Pot mà pot đã trao đi rồi → pot âm: phải hoàn tác lượt trao pot trước
        if (potOf({ ...round, moves }) < 0) return ['Pot sẽ bị âm — hoàn tác lượt trao pot trước rồi mới hoàn tác lượt này.']
        const undoneAward = round.moves.find((m) => m.id === moveId)?.from === POT
        if (round.status === 'open') {
          mapRound(gameId, roundId, (r) => ({ ...r, moves }))
        } else if (undoneAward) {
          // Hoàn tác trao pot ở ván đã xong: không mở lại ván — hiện popup Pot để host trao lại cho đúng người
          set({ reaward: { gameId, roundId, moveId } })
        } else if (round.kind === 'manual' && moves.length === 0) {
          mapGame(gameId, (g) => ({ ...g, rounds: g.rounds.filter((r) => r.id !== roundId) }))
        } else {
          let transfers
          try {
            transfers = closeTransfers({ ...round, moves })
          } catch (e) {
            return [`Không hoàn tác được: ${(e as Error).message}`]
          }
          mapRound(gameId, roundId, (r) => ({ ...r, moves, transfers }))
        }
        mutate(dropPending)
        return []
      },

      requestUndo(gameId, roundId, moveId, by) {
        const s = get().session
        const round = game(gameId)?.rounds.find((r) => r.id === roundId)
        if (!s || !round?.moves.some((m) => m.id === moveId)) return ['Lượt này không còn nữa.']
        if (s.undos.some((u) => u.moveId === moveId)) return ['Lượt này đang chờ host xác nhận.']
        mutate((s) => ({ ...s, undos: [...s.undos, { id: newId(), gameId, roundId, moveId, by, at: Date.now() }] }))
        return []
      },

      reassignAward(to) {
        const r = get().reaward
        set({ reaward: null })
        if (!r || !to) return []
        const round = game(r.gameId)?.rounds.find((x) => x.id === r.roundId)
        const award = round?.moves.find((m) => m.id === r.moveId)
        if (!round || !award) return ['Lượt trao pot này không còn nữa.']
        if (award.to === to) return []
        // Đổi người nhận của đúng lượt trao đó rồi tính lại trả kẹo của ván (pot vẫn hết như cũ)
        mapRound(r.gameId, r.roundId, (x) => {
          const moves = x.moves.map((m) => (m.id === r.moveId ? { ...m, to } : m))
          return { ...x, moves, transfers: x.status === 'closed' ? closeTransfers({ ...x, moves }) : x.transfers }
        })
        return []
      },

      answerUndo(undoId, accept) {
        const u = get().session?.undos.find((x) => x.id === undoId)
        if (!u) return ['Yêu cầu này không còn nữa.']
        if (accept) {
          const errors = get().undoMove(u.gameId, u.roundId, u.moveId)
          if (errors.length) return errors
        }
        mutate((s) => ({ ...s, undos: s.undos.filter((x) => x.id !== undoId) }))
        return []
      },

      cancelRequest(requestId) {
        mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
      },

      pingRequest(requestId) {
        const s = get().session
        const req = s?.requests.find((r) => r.id === requestId) ?? s?.undos.find((u) => u.id === requestId)
        if (!req) return ['Yêu cầu này không còn nữa — đã được trả lời hoặc đã hủy.']
        // Chỉ nhắc được khi còn người phải trả lời (chờ người bị đòi / chờ host)
        if ('status' in req && (req.status === 'declined' || req.status === 'rejected')) return ['Yêu cầu này đã được trả lời.']
        const wait = pingWait(req, Date.now())
        if (wait > 0) return [`Vừa nhắc xong — đợi ${wait} giây nữa.`]
        const ping = <T extends { id: ID; pings?: number }>(x: T): T =>
          x.id === requestId ? { ...x, pingedAt: Date.now(), pings: (x.pings ?? 0) + 1 } : x
        mutate((x) => ({ ...x, requests: x.requests.map(ping), undos: x.undos.map(ping) }))
        return []
      },

    }
  })
}

export type AppStore = ReturnType<typeof createAppStore>
