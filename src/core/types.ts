import type { TienlenCards } from './games/tienlenPlay'
export type ID = string

export type GameType = 'tienlen' | 'xidach' | 'poker' | 'loto' | 'free'

/** Id đặc biệt cho pot giữa bàn (Poker). */
export const POT = 'pot'

/** Id đặc biệt cho ô Bet giữa bàn Xì dách (chỉ để đặt cược, không giữ kẹo). */
export const BET = 'bet'

/** Id đặc biệt cho mũ nhà cái (kéo sang người khác để đổi cái). */
export const DEALER = 'dealer'

/** Id đặc biệt cho ô Mua giữa bàn Lô tô — chỉ là chỗ thả để mua tờ (kẹo vẫn vào Pot). */
export const BUY = 'buy'

/** Số người tối đa hiển thị quanh bàn. */
export const MAX_PLAYERS = 10

export interface Player {
  id: ID
  name: string
  emoji: string
  active: boolean
  /** Đã xóa khỏi phòng nhưng đã chơi: ẩn khỏi danh sách/bàn, lời/lỗ và lịch sử vẫn giữ. */
  removed?: boolean
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

/** Poker: các vòng cược của một tay bài; done = đã trao hết pot. */
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'done'

/** Trạng thái một tay Poker (vòng cược, lượt, bỏ bài, all-in). Chip thật nằm trong `moves` (người → POT). */
export interface PokerHand {
  street: Street
  /** Thứ tự chỗ ngồi của người trong tay bài. */
  order: ID[]
  /** Nút D (người chia). */
  button: ID
  sb: number
  /** Tổng tối đa một người bỏ vào một tay (all-in). */
  cap: number
  folded: ID[]
  allIn: ID[]
  /** Người đang tới lượt; null khi hết vòng cược. */
  toAct: ID | null
  /** Người đã hành động từ lần tố gần nhất trong vòng này. */
  acted: ID[]
  /** Kẹo mỗi người đã bỏ trong vòng hiện tại (chip trên bàn). */
  streetBets: Record<ID, number>
  currentBet: number
  /** Mức tố tối thiểu (cộng thêm trên cược hiện tại). */
  minRaise: number
  /** Chỉ số các pot đã trao ở showdown. */
  awarded: number[]
  /** Ảnh chụp để hoàn tác thao tác cuối. */
  undo: { hand: Omit<PokerHand, 'undo'>; moves: number }[]
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
  /**
   * Xì dách: betting = đang đặt cược (chưa được trả kẹo); playing = đã chốt cược, chia bài, trả kẹo.
   * Không có = playing (các game khác, dữ liệu cũ).
   */
  phase?: 'betting' | 'playing'
  moves: Move[]
  /** Poker có luật đầy đủ: blind, vòng cược, lượt, side pot. */
  poker?: PokerHand
  /** Tiến lên đánh bằng bài trong app: bài từng người, lượt, bộ trên bàn, thứ tự về. */
  tienlen?: TienlenCards
  /** Tính khi chốt ván. */
  transfers: Transfer[]
  tags: Tag[]
}

export interface Game {
  id: ID
  type: GameType
  name: string
  rounds: Round[]
  /** Tiến lên: mức cược Nhất/Nhì host đặt ở ô Bet — gợi ý khi kéo kẹo, mặc định cho ván sau. */
  bets?: { bet: number; bet2: number; red?: number; black?: number }
  /** Lô tô: giá mỗi tờ host đặt ở ô Giá. */
  price?: number
  /** Lô tô: mỗi người mua tối đa bao nhiêu tờ một ván (mặc định 2). */
  lotoMax?: number
  /** Xì dách: mức cược tối thiểu / tối đa (mặc định 1 và 5 × min). */
  xidachLimits?: { min: number; max: number }
  /** Cách chơi bài: real = đánh bài thật ngoài đời (mặc định); app = dùng bài trong app. */
  cardMode?: 'real' | 'app'
  /** Poker: small blind và mức all-in (tổng tối đa mỗi người một tay). */
  pokerSettings?: { sb: number; cap: number }
}

/** Đòi kẹo: `to` đòi `from` trả `amount` kẹo, chờ `from` bấm OK. */
export interface CandyRequest {
  id: ID
  gameId: ID
  from: ID
  to: ID
  amount: number
  at: number
  /** Lần nhắc gần nhất và số lần đã nhắc (người đòi bấm 🔔). */
  pingedAt?: number
  pings?: number
  /**
   * Không có = chờ người bị đòi. 'declined' = người bị đòi từ chối (người đòi thấy, có thể nhờ host);
   * 'escalated' = đang chờ host duyệt; 'rejected' = host cũng từ chối. Lời đòi còn trong danh sách đến khi người đòi xóa.
   */
  status?: 'declined' | 'escalated' | 'rejected'
  /** Lúc đổi trạng thái gần nhất (từ chối / nhờ host / host từ chối). */
  answeredAt?: number
}

/** Yêu cầu hoàn tác một lượt kéo — chờ host xác nhận. */
export interface UndoRequest {
  id: ID
  gameId: ID
  roundId: ID
  moveId: ID
  by: ID
  at: number
  /** Lần nhắc host gần nhất và số lần đã nhắc. */
  pingedAt?: number
  pings?: number
}

export interface Session {
  id: ID
  name: string
  createdAt: number
  updatedAt: number
  /** Người quản lý buổi: xác nhận các yêu cầu hoàn tác. */
  hostId: ID | null
  players: Player[]
  games: Game[]
  requests: CandyRequest[]
  undos: UndoRequest[]
  /** solo = một máy, host ghi hết; multi = nhiều người join bằng mã 5 số (kết nối nhiều máy: giai đoạn 2). */
  mode?: 'solo' | 'multi'
  /** Mã bàn 5 số (bàn nhiều người) để người khác join. */
  code?: string
  /** Bầu host mới (khi host vắng): người bầu → người được bầu. */
  hostVotes: Record<ID, ID>
  /** Game đang chơi trên bàn — giữ khi rời màn Bàn chơi rồi quay lại. */
  currentGameId?: ID
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
  /** Chưa có luật riêng (sắp có): không mở ván, chỉ kéo kẹo chuyển tay. */
  soon?: boolean
  /** Ván có 2 bước: đặt cược/mua vé (betting) → Chốt → trả kẹo (playing). */
  phases?: boolean
  /** Đang thử nghiệm — hiện chữ (Beta) sau tên game. */
  beta?: boolean
}
