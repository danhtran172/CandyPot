import { createStore } from 'zustand/vanilla'
import { GAMES } from '../core/games'
import { assertZeroSum, netOf } from '../core/ledger'
import type { GameType, ID, Player, Round, Session } from '../core/types'
import type { Preset, SessionRepo } from '../storage/SessionRepo'

export const EMOJIS = ['🐱', '🐶', '🐸', '🐼', '🦊', '🐯', '🐵', '🐰', '🐨', '🐷', '🐮', '🐙', '🦄', '🐔', '🐧', '🐢']

export function newId(): ID {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface RoundDraft {
  participants: ID[]
  bet: number
  input: unknown
}

export interface AppState {
  session: Session | null
  error: string | null
  createSession(name: string, players: { name: string; emoji: string }[], packSize: number): ID
  openSession(id: ID): boolean
  closeSession(): void
  deleteSession(id: ID): void

  addPlayer(name: string, emoji: string): void
  updatePlayer(id: ID, patch: Partial<Pick<Player, 'name' | 'emoji' | 'active'>>): void
  removePlayer(id: ID): boolean
  setPackSize(size: number): void

  addGame(type: GameType): ID
  renameGame(gameId: ID, name: string): void
  removeGame(gameId: ID): void
  updateGameConfig(gameId: ID, config: unknown): void

  /** Lưu ván (thêm mới hoặc sửa nếu có roundId). Trả về danh sách lỗi; rỗng = đã lưu. */
  saveRound(gameId: ID, draft: RoundDraft, roundId?: ID): string[]
  saveManual(gameId: ID, t: { from: ID; to: ID; amount: number; note: string }, roundId?: ID): string[]
  deleteRound(gameId: ID, roundId: ID): void

  renew(playerId: ID): void
  undoRenew(renewId: ID): void

  presets(): Preset[]
  savePreset(name: string, gameType: GameType, config: unknown): void
  removePreset(id: ID): void
}

export function isPlayerUsed(session: Session, playerId: ID): boolean {
  return (
    session.renews.some((r) => r.playerId === playerId) ||
    session.games.some((g) => g.rounds.some((r) => r.participants.includes(playerId)))
  )
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

    const mapGame = (s: Session, gameId: ID, fn: (rounds: Round[]) => Round[]): Session => ({
      ...s,
      games: s.games.map((g) => (g.id === gameId ? { ...g, rounds: fn(g.rounds) } : g)),
    })

    const upsertRound = (gameId: ID, round: Round, roundId?: ID) =>
      mutate((s) =>
        mapGame(s, gameId, (rounds) =>
          roundId ? rounds.map((r) => (r.id === roundId ? { ...round, id: roundId, at: r.at } : r)) : [...rounds, round],
        ),
      )

    return {
      session: null,
      error: null,

      createSession(name, players, packSize) {
        const now = Date.now()
        const session: Session = {
          id: newId(),
          name: name.trim() || 'Buổi chơi',
          createdAt: now,
          updatedAt: now,
          players: players.map((p) => ({ id: newId(), name: p.name.trim(), emoji: p.emoji, active: true })),
          settings: { packSize },
          renews: [],
          games: [],
        }
        repo.save(session)
        set({ session, error: null })
        return session.id
      },

      openSession(id) {
        const session = repo.load(id)
        set({ session, error: null })
        return session !== null
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

      setPackSize(size) {
        mutate((s) => ({ ...s, settings: { ...s.settings, packSize: size } }))
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
        mutate((s) => ({ ...s, games: s.games.map((g) => (g.id === gameId ? { ...g, name } : g)) }))
      },

      removeGame(gameId) {
        mutate((s) => ({ ...s, games: s.games.filter((g) => g.id !== gameId) }))
      },

      updateGameConfig(gameId, config) {
        mutate((s) => ({ ...s, games: s.games.map((g) => (g.id === gameId ? { ...g, config } : g)) }))
      },

      saveRound(gameId, draft, roundId) {
        const game = get().session?.games.find((g) => g.id === gameId)
        if (!game) return ['Không tìm thấy game.']
        const mod = GAMES[game.type]
        if (!Number.isInteger(draft.bet) || draft.bet <= 0) return ['Mức cược phải là số nguyên lớn hơn 0.']
        const errors = mod.validate(draft.input, game.config)
        if (errors.length) return errors
        const { transfers, tags } = mod.resolve(draft.input, game.config, draft.bet)
        upsertRound(gameId, { id: newId(), at: Date.now(), kind: 'play', ...draft, transfers, tags }, roundId)
        return []
      },

      saveManual(gameId, t, roundId) {
        if (!t.from || !t.to) return ['Chọn người đưa và người nhận.']
        if (t.from === t.to) return ['Người đưa và người nhận phải khác nhau.']
        if (!Number.isInteger(t.amount) || t.amount <= 0) return ['Số kẹo phải là số nguyên lớn hơn 0.']
        upsertRound(
          gameId,
          {
            id: newId(),
            at: Date.now(),
            kind: 'manual',
            participants: [t.from, t.to],
            bet: 0,
            input: t,
            transfers: [{ from: t.from, to: t.to, amount: t.amount, reason: t.note.trim() || 'Chuyển tay' }],
            tags: [],
          },
          roundId,
        )
        return []
      },

      deleteRound(gameId, roundId) {
        mutate((s) => mapGame(s, gameId, (rounds) => rounds.filter((r) => r.id !== roundId)))
      },

      renew(playerId) {
        mutate((s) => ({ ...s, renews: [...s.renews, { id: newId(), playerId, at: Date.now() }] }))
      },

      undoRenew(renewId) {
        mutate((s) => ({ ...s, renews: s.renews.filter((r) => r.id !== renewId) }))
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
