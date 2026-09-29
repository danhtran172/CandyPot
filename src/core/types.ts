export type ID = string

export type GameType = 'tienlen' | 'xidach' | 'poker'

/** Id đặc biệt cho pot giữa bàn (Poker). */
export const POT = 'pot'

export interface Player {
  id: ID
  name: string
  emoji: string
  active: boolean
}

/** "from đưa to amount kẹo" — đơn vị dữ liệu để tính lời/lỗ. */
export interface Transfer {
  from: ID
  to: ID
  amount: number
  reason: string
}

/** Một lần kéo kẹo trong ván. from/to có thể là POT. */
export interface Move {
  id: ID
  from: ID
  to: ID
  amount: number
  label: string
}

export type TagType = 'lam-cai'

export interface Tag {
  type: TagType
  playerId: ID
}

export interface Round {
  id: ID
  at: number
  /** manual = kéo kẹo khi không có ván nào đang mở */
  kind: 'play' | 'manual'
  status: 'open' | 'closed'
  participants: ID[]
  /** Mức cược chung (Tiến lên); các game khác dùng làm cược mặc định. */
  bet: number
  /** Cược riêng từng người: tiền cược của con (Xì dách), số kẹo bỏ vào pot lúc mở ván (Poker). */
  stakes: Record<ID, number>
  dealer: ID | null
  moves: Move[]
  /** Tính khi chốt ván. */
  transfers: Transfer[]
  tags: Tag[]
}

export interface Game {
  id: ID
  type: GameType
  name: string
  config: unknown
  rounds: Round[]
}

export interface Session {
  id: ID
  name: string
  createdAt: number
  updatedAt: number
  players: Player[]
  games: Game[]
}

export type Net = Record<ID, number>

/** Một nút gợi ý trong popup kéo kẹo. */
export interface Option {
  amount: number
  label: string
}

export interface GameModule<Cfg> {
  type: GameType
  label: string
  minPlayers: number
  maxPlayers: number
  /** Cách đặt cược lúc mở ván. */
  stakeMode: 'common' | 'dealer' | 'pot'
  defaultConfig: Cfg
}
