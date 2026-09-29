import type { FC } from 'react'
import type { Game, ID, Player, Round } from '../../core/types'

export interface FormProps<In, Cfg> {
  input: In
  onChange: (input: In) => void
  participants: ID[]
  players: Record<ID, Player>
  config: Cfg
  bet: number
}

/** Phần giao diện nhập ván của một game. */
export interface GameUI<In, Cfg = unknown> {
  minPlayers: number
  maxPlayers: number
  /** Có dùng ô "Mức cược" chung hay không. */
  usesBet: boolean
  init(ctx: { participants: ID[]; bet: number; prev?: Round; game: Game }): In
  /** Điều chỉnh dữ liệu khi danh sách người chơi ván thay đổi. */
  sync(input: In, participants: ID[], bet: number): In
  onBetChange?(input: In, bet: number): In
  Form: FC<FormProps<In, Cfg>>
}
