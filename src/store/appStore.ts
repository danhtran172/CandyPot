import { createStore } from 'zustand/vanilla'
import { GAMES } from '../core/games'
import { assertZeroSum, netOf } from '../core/ledger'
import { closeTransfers, normalizeSession } from '../core/round'
import { MAX_PLAYERS, POT, type Game, type GameType, type ID, type Player, type Round, type Session, type Tag } from '../core/types'
import type { SessionRepo } from '../storage/SessionRepo'

export const EMOJIS = ['🐱', '🐶', '🐸', '🐼', '🦊', '🐯', '🐵', '🐰', '🐨', '🐷', '🐮', '🐙', '🦄', '🐔', '🐧', '🐢']

export function newId(): ID {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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
  const fromPrev = prev?.participants.filter((id) => active.includes(id))
  const participants = (fromPrev && fromPrev.length >= mod.minPlayers ? fromPrev : active).slice(0, mod.maxPlayers)
  const bet = prev?.bet || { common: 4, dealer: 5, pot: 1 }[mod.stakeMode]
  const bet2 = prev?.bet2 || Math.max(1, Math.round(bet / 2))
  const dealer = prev?.dealer && participants.includes(prev.dealer) ? prev.dealer : (participants[0] ?? null)
  const stakes = Object.fromEntries(active.map((id) => [id, prev?.stakes[id] ?? bet]))
  return { participants, bet, bet2, stakes, dealer }
}

export interface AppState {
  session: Session | null
  error: string | null
  createSession(name: string, players: { name: string; emoji: string }[]): ID
  openSession(id: ID): boolean
  closeSession(): void
  deleteSession(id: ID): void

  addPlayer(name: string, emoji: string): void
  updatePlayer(id: ID, patch: Partial<Pick<Player, 'name' | 'emoji' | 'active'>>): void
  removePlayer(id: ID): boolean

  addGame(type: GameType): ID
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
  /** Chốt ván hiện tại rồi mở ngay ván sau với cài đặt cũ. */
  nextRound(gameId: ID): string[]
  /** Kéo kẹo. Có ván đang mở thì ghi vào ván, không thì ghi thành chuyển tay. */
  addMove(gameId: ID, from: ID, to: ID, amount: number, label: string): string[]
  removeMove(gameId: ID, roundId: ID, moveId: ID): void
  /** Đòi kẹo: `to` đòi `from` trả `amount`, chờ `from` xác nhận. */
  requestCandy(gameId: ID, from: ID, to: ID, amount: number): string[]
  /** Người bị đòi trả lời: OK thì chuyển kẹo. */
  answerRequest(requestId: ID, accept: boolean): string[]
  cancelRequest(requestId: ID): void
  /** Xì dách: người con đặt cược (ghi đè mức cược của ván đang mở). */
  setStake(gameId: ID, playerId: ID, amount: number): string[]
  closeRound(gameId: ID): string[]
  reopenRound(gameId: ID, roundId: ID): string[]
  deleteRound(gameId: ID, roundId: ID): void

}

export function isPlayerUsed(session: Session, playerId: ID): boolean {
  return session.games.some((g) => g.rounds.some((r) => r.participants.includes(playerId)))
}

function validateOpen(game: Game, d: OpenDraft): string[] {
  const mod = GAMES[game.type]
  const errors: string[] = []
  const n = d.participants.length
  if (n < mod.minPlayers || n > mod.maxPlayers) {
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

function findOpenIn(game: Game): Round | undefined {
  return game.rounds.find((r) => r.status === 'open')
}

export function createAppStore(repo: SessionRepo) {
  return createStore<AppState>()((set, get) => {
    /** Áp dụng thay đổi lên buổi hiện tại, kiểm tra tổng = 0 rồi lưu. */
    const mutate = (fn: (s: Session) => Session) => {
      const current = get().session
      if (!current) return
      const next = { ...fn(current), updatedAt: Date.now() }
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

      createSession(name, players) {
        const now = Date.now()
        const session: Session = {
          id: newId(),
          name: name.trim() || 'Buổi chơi',
          createdAt: now,
          updatedAt: now,
          players: players
            .slice(0, MAX_PLAYERS)
            .map((p) => ({ id: newId(), name: p.name.trim(), emoji: p.emoji, active: true })),
          games: [],
          requests: [],
        }
        repo.save(session)
        set({ session, error: null })
        return session.id
      },

      openSession(id) {
        const raw = repo.load(id)
        set({ session: raw && normalizeSession(raw), error: null })
        return raw !== null
      },

      closeSession() {
        set({ session: null, error: null })
      },

      deleteSession(id) {
        repo.remove(id)
        if (get().session?.id === id) set({ session: null })
      },

      addPlayer(name, emoji) {
        if ((get().session?.players.length ?? 0) >= MAX_PLAYERS) return
        mutate((s) => ({ ...s, players: [...s.players, { id: newId(), name: name.trim(), emoji, active: true }] }))
      },

      updatePlayer(id, patch) {
        mutate((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      },

      removePlayer(id) {
        const s = get().session
        if (!s || isPlayerUsed(s, id)) return false
        mutate((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }))
        return true
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

      renameGame(gameId, name) {
        mapGame(gameId, (g) => ({ ...g, name }))
      },

      removeGame(gameId) {
        mutate((s) => ({
          ...s,
          games: s.games.filter((g) => g.id !== gameId),
          requests: s.requests.filter((r) => r.gameId !== gameId),
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
          phase: mode === 'dealer' ? 'betting' : undefined,
          moves:
            mode === 'pot'
              ? Object.entries(stakes)
                  .filter(([, v]) => v > 0)
                  .map(([p, v]) => ({ id: newId(), from: p, to: POT, amount: v, label: 'Cược mở ván' }))
              : [],
          transfers: [],
          tags: [],
        }
        mapGame(gameId, (g) => ({ ...g, rounds: [...g.rounds, round] }))
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
        mapRound(gameId, open.id, (r) => ({ ...r, phase: 'playing' }))
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
        if (open?.phase === 'betting') return ['Đang đặt cược — bấm Chốt cược rồi mới trả kẹo.']
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
        let transfers
        try {
          transfers = closeTransfers(open)
        } catch (e) {
          return [(e as Error).message]
        }
        const tags: Tag[] = open.dealer ? [{ type: 'lam-cai', playerId: open.dealer }] : []
        mapRound(gameId, open.id, (r) => ({ ...r, status: 'closed', transfers, tags }))
        return []
      },

      reopenRound(gameId, roundId) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (findOpenIn(g)) return ['Game này đang có ván chưa chốt. Chốt hoặc hủy ván đó trước.']
        mapRound(gameId, roundId, (r) => ({ ...r, status: 'open', transfers: [], tags: [] }))
        return []
      },

      deleteRound(gameId, roundId) {
        mapGame(gameId, (g) => ({ ...g, rounds: g.rounds.filter((r) => r.id !== roundId) }))
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
        if (accept) {
          const errors = get().addMove(req.gameId, req.from, req.to, req.amount, 'Đòi kẹo')
          if (errors.length) return errors
        }
        mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
        return []
      },

      setStake(gameId, playerId, amount) {
        const open = openOf(gameId)
        if (!open) return ['Chưa có ván nào đang mở.']
        if (open.dealer === playerId) return ['Nhà cái không đặt cược.']
        if (open.phase === 'playing') return ['Đã chốt cược — bấm Ván mới để cược lại.']
        if (!open.participants.includes(playerId)) return ['Người này không chơi ván này.']
        if (!Number.isInteger(amount) || amount <= 0) return ['Tiền cược phải là số nguyên lớn hơn 0.']
        mapRound(gameId, open.id, (r) => ({ ...r, stakes: { ...r.stakes, [playerId]: amount } }))
        return []
      },

      cancelRequest(requestId) {
        mutate((s) => ({ ...s, requests: s.requests.filter((r) => r.id !== requestId) }))
      },

    }
  })
}

export type AppStore = ReturnType<typeof createAppStore>
