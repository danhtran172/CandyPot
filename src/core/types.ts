export type ID = string

export type GameType = 'tienlen' | 'xidach' | 'poker'

export interface Player {
  id: ID
  name: string
  emoji: string
  active: boolean
}

export interface Renew {
  id: ID
  playerId: ID
  at: number
}

/** "from đưa to amount kẹo" — đơn vị dữ liệu duy nhất để tính mọi con số. */
export interface Transfer {
  from: ID
  to: ID
  amount: number
  reason: string
}

export type TagType = 'thoi' | 'chat' | 'lam-cai' | 'toi-trang' | 'chay'

export interface Tag {
  type: TagType
  playerId: ID
}

export interface Round {
  id: ID
  at: number
  kind: 'play' | 'manual'
  participants: ID[]
  bet: number
  input: unknown
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
  settings: { packSize: number }
  renews: Renew[]
  games: Game[]
}

export interface Resolution {
  transfers: Transfer[]
  tags: Tag[]
}

export interface GameModule<Cfg, In> {
  type: GameType
  label: string
  defaultConfig: Cfg
  /** Trả về danh sách lỗi tiếng Việt; rỗng = hợp lệ. */
  validate(input: In, cfg: Cfg): string[]
  resolve(input: In, cfg: Cfg, bet: number): Resolution
}

export type Net = Record<ID, number>
