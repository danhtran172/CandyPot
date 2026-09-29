export type ID = string

export type GameType = 'tienlen' | 'xidach' | 'poker'

/** Id đặc biệt cho pot giữa bàn (Poker). */
export const POT = 'pot'

/** Id đặc biệt cho ô Bet giữa bàn Xì dách (chỉ để đặt cược, không giữ kẹo). */
export const BET = 'bet'

/** Id đặc biệt cho mũ nhà cái (kéo sang người khác để đổi cái). */
export const DEALER = 'dealer'

/** Số người tối đa hiển thị quanh bàn. */
export const MAX_PLAYERS = 10

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
  /** Mức cược chung (Tiến lên: cược Nhất); các game khác dùng làm cược mặc định. */
  bet: number
  /** Tiến lên: cược Nhì (Ba trả Nhì). */
  bet2?: number
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
  rounds: Round[]
}

/** Đòi kẹo: `to` đòi `from` trả `amount` kẹo, chờ `from` bấm OK. */
export interface CandyRequest {
  id: ID
  gameId: ID
  from: ID
  to: ID
  amount: number
  at: number
}

export interface Session {
  id: ID
  name: string
  createdAt: number
  updatedAt: number
  players: Player[]
  games: Game[]
  requests: CandyRequest[]
}

export type Net = Record<ID, number>

/** Một nút gợi ý trong popup kéo kẹo. */
export interface Option {
  amount: number
  label: string
}

export interface GameModule {
  type: GameType
  label: string
  minPlayers: number
  maxPlayers: number
  /** Cách đặt cược lúc mở ván. */
  stakeMode: 'common' | 'dealer' | 'pot'
}
