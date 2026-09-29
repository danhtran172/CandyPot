import { createStore } from 'zustand/vanilla'
import { GAMES } from '../core/games'
import { assertZeroSum, netOf } from '../core/ledger'
import { closeTransfers, normalizeSession } from '../core/round'
import { POT, type Game, type GameType, type ID, type Player, type Round, type Session, type Tag } from '../core/types'
import type { Preset, SessionRepo } from '../storage/SessionRepo'

export const EMOJIS = ['🐱', '🐶', '🐸', '🐼', '🦊', '🐯', '🐵', '🐰', '🐨', '🐷', '🐮', '🐙', '🦄', '🐔', '🐧', '🐢']

export function newId(): ID {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface OpenDraft {
  participants: ID[]
  /** Mức cược chung (Tiến lên) hoặc cược mặc định. */
  bet: number
  /** Cược riêng: con Xì dách, kẹo bỏ vào pot lúc mở ván Poker. */
  stakes: Record<ID, number>
  dealer: ID | null
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
  updateGameConfig(gameId: ID, config: unknown): void

  /** Mở ván mới. Trả về danh sách lỗi; rỗng = đã mở. */
  openRound(gameId: ID, draft: OpenDraft): string[]
  /** Kéo kẹo. Có ván đang mở thì ghi vào ván, không thì ghi thành chuyển tay. */
  addMove(gameId: ID, from: ID, to: ID, amount: number, label: string): string[]
  removeMove(gameId: ID, roundId: ID, moveId: ID): void
  /** Xì dách: cái ăn (eat) hoặc đền (pay) cả bàn theo hệ số. */
  dealerAll(gameId: ID, mode: 'eat' | 'pay', multiplier: number): void
  closeRound(gameId: ID): string[]
  reopenRound(gameId: ID, roundId: ID): string[]
  deleteRound(gameId: ID, roundId: ID): void

  presets(): Preset[]
  savePreset(name: string, gameType: GameType, config: unknown): void
  removePreset(id: ID): void
}

export function isPlayerUsed(session: Session, playerId: ID): boolean {
  return session.games.some((g) => g.rounds.some((r) => r.participants.includes(playerId)))
}

function validateOpen(game: Game, d: OpenDraft): string[] {
  const mod = GAMES[game.type]
  const errors: string[] = []
  const n = d.participants.length
  if (n < mod.minPlayers || n > mod.maxPlayers) {
    errors.push(
      mod.maxPlayers < 99
        ? `${mod.label} cần ${mod.minPlayers}–${mod.maxPlayers} người chơi.`
        : `${mod.label} cần ít nhất ${mod.minPlayers} người chơi.`,
    )
  }
  if (findOpenIn(game)) errors.push('Game này đang có ván chưa chốt.')
  const isInt = (v: number | undefined, min: number) => Number.isInteger(v) && (v as number) >= min

  if (mod.stakeMode === 'common' && !isInt(d.bet, 1)) errors.push('Mức cược phải là số nguyên lớn hơn 0.')
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
          players: players.map((p) => ({ id: newId(), name: p.name.trim(), emoji: p.emoji, active: true })),
          games: [],
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
          const lastConfig = [...s.games].reverse().find((g) => g.type === type)?.config
          return {
            ...s,
            games: [
              ...s.games,
              {
                id,
                type,
                name: same ? `${label} ${same + 1}` : label,
                config: structuredClone(lastConfig ?? GAMES[type].defaultConfig),
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
        mutate((s) => ({ ...s, games: s.games.filter((g) => g.id !== gameId) }))
      },

      updateGameConfig(gameId, config) {
        mapGame(gameId, (g) => ({ ...g, config }))
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
          stakes,
          dealer: mode === 'dealer' ? draft.dealer : null,
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

      addMove(gameId, from, to, amount, label) {
        const g = game(gameId)
        if (!g) return ['Không tìm thấy game.']
        if (from === to) return ['Người đưa và người nhận phải khác nhau.']
        if (!Number.isInteger(amount) || amount <= 0) return ['Số kẹo phải là số nguyên lớn hơn 0.']
        const move = { id: newId(), from, to, amount, label: label.trim() || 'Chuyển tay' }
        const open = findOpenIn(g)
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

      dealerAll(gameId, mode, multiplier) {
        const open = openOf(gameId)
        if (!open?.dealer) return
        const dealer = open.dealer
        const label = `${mode === 'eat' ? 'Cái ăn cả bàn' : 'Cái đền cả bàn'} ×${multiplier}`
        const moves = Object.entries(open.stakes).map(([con, stake]) => ({
          id: newId(),
          from: mode === 'eat' ? con : dealer,
          to: mode === 'eat' ? dealer : con,
          amount: stake * multiplier,
          label,
        }))
        mapRound(gameId, open.id, (r) => ({ ...r, moves: [...r.moves, ...moves] }))
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

      presets() {
        return repo.listPresets()
      },

      savePreset(name, gameType, config) {
        repo.savePreset({ id: newId(), name: name.trim() || 'Luật nhà', gameType, config: structuredClone(config) })
      },

      removePreset(id) {
        repo.removePreset(id)
      },
    }
  })
}

export type AppStore = ReturnType<typeof createAppStore>
