import type { GameModule, ID, Tag, Transfer } from '../types'

export type CardKey = 'heoDen' | 'heoDo' | 'baDoiThong' | 'tuQuy' | 'bonDoiThong'
export type CardCount = Partial<Record<CardKey, number>>

export const CARD_LABELS: Record<CardKey, string> = {
  heoDen: 'Heo đen',
  heoDo: 'Heo đỏ',
  baDoiThong: '3 đôi thông',
  tuQuy: 'Tứ quý',
  bonDoiThong: '4 đôi thông',
}

export const CARD_KEYS = Object.keys(CARD_LABELS) as CardKey[]

export interface TienLenConfig {
  /** 4 người: Bét → Nhất */
  pay4Bet: number
  /** 4 người: Ba → Nhì */
  pay4Ba: number
  /** 3 người: Bét → Nhất */
  pay3Bet: number
  /** 2 người: Bét → Nhất */
  pay2Bet: number
  toiTrang: number
  chay: number
  cards: Record<CardKey, number>
}

export interface ChopStep {
  playerId: ID
  cards: CardCount
}

export interface TienLenInput {
  players: ID[]
  /** Thứ tự về của những người không cháy (Nhất → Bét). */
  ranking: ID[]
  chay: ID[]
  toiTrang: ID | null
  thoi: { playerId: ID; cards: CardCount }[]
  chops: { steps: ChopStep[] }[]
}

export function cardValue(cards: CardCount, cfg: TienLenConfig): number {
  return CARD_KEYS.reduce((s, k) => s + (cards[k] ?? 0) * cfg.cards[k], 0)
}

export function describeCards(cards: CardCount): string {
  return CARD_KEYS.filter((k) => (cards[k] ?? 0) > 0)
    .map((k) => `${cards[k]} ${CARD_LABELS[k].toLowerCase()}`)
    .join(', ')
}

function rankPayments(ranking: ID[], cfg: TienLenConfig): [ID, ID, number, string][] {
  const [nhat, nhi, ba, bet] = ranking
  if (ranking.length >= 4) {
    return [
      [bet, nhat, cfg.pay4Bet, 'Bét trả Nhất'],
      [ba, nhi, cfg.pay4Ba, 'Ba trả Nhì'],
    ]
  }
  if (ranking.length === 3) return [[ba, nhat, cfg.pay3Bet, 'Bét trả Nhất']]
  if (ranking.length === 2) return [[nhi, nhat, cfg.pay2Bet, 'Thua trả Nhất']]
  return []
}

export const tienlen: GameModule<TienLenConfig, TienLenInput> = {
  type: 'tienlen',
  label: 'Tiến lên',
  defaultConfig: {
    pay4Bet: 2,
    pay4Ba: 1,
    pay3Bet: 2,
    pay2Bet: 1,
    toiTrang: 3,
    chay: 3,
    cards: { heoDen: 1, heoDo: 2, baDoiThong: 2, tuQuy: 3, bonDoiThong: 4 },
  },

  validate(input, cfg) {
    const errors: string[] = []
    const { players, ranking, chay, toiTrang, thoi, chops } = input
    const inGame = (id: ID) => players.includes(id)

    if (players.length < 2 || players.length > 4) errors.push('Tiến lên cần 2–4 người chơi.')

    if (toiTrang) {
      if (!inGame(toiTrang)) errors.push('Người tới trắng không có trong ván.')
      if (ranking.length || chay.length || thoi.length || chops.length) {
        errors.push('Tới trắng thì không có xếp hạng, cháy, thối hay chặt.')
      }
      return errors
    }

    const placed = [...ranking, ...chay]
    if (new Set(placed).size !== placed.length) errors.push('Một người bị xếp hai lần.')
    if (placed.length !== players.length || !placed.every(inGame)) {
      errors.push('Chưa xếp hạng đủ mọi người.')
    }
    if (ranking.length === 0) errors.push('Phải có người về Nhất.')

    for (const t of thoi) {
      if (!inGame(t.playerId)) errors.push('Người bị thối không có trong ván.')
      else if (t.playerId === ranking[0]) errors.push('Người về Nhất không thể bị thối.')
      if (cardValue(t.cards, cfg) <= 0) errors.push('Thối phải có ít nhất một quân.')
    }

    for (const chop of chops) {
      const { steps } = chop
      if (steps.length < 2) {
        errors.push('Chặt cần ít nhất 2 bước (người đánh và người chặt).')
        continue
      }
      if (!steps.every((s) => inGame(s.playerId))) errors.push('Người trong chuỗi chặt không có trong ván.')
      if (steps.some((s, i) => i > 0 && s.playerId === steps[i - 1].playerId)) {
        errors.push('Không thể tự chặt mình.')
      }
      if (steps.slice(0, -1).some((s) => cardValue(s.cards, cfg) <= 0)) {
        errors.push('Quân bị chặt phải có giá trị.')
      }
    }
    return errors
  },

  resolve(input, cfg, bet) {
    const transfers: Transfer[] = []
    const tags: Tag[] = []
    const pay = (from: ID, to: ID, units: number, reason: string) => {
      if (units > 0 && from !== to) transfers.push({ from, to, amount: units * bet, reason })
    }

    if (input.toiTrang) {
      const winner = input.toiTrang
      for (const p of input.players) pay(p, winner, cfg.toiTrang, 'Tới trắng')
      tags.push({ type: 'toi-trang', playerId: winner })
      return { transfers, tags }
    }

    const nhat = input.ranking[0]
    for (const [from, to, units, reason] of rankPayments(input.ranking, cfg)) pay(from, to, units, reason)

    for (const p of input.chay) {
      pay(p, nhat, cfg.chay, 'Cháy')
      tags.push({ type: 'chay', playerId: p })
    }

    for (const t of input.thoi) {
      pay(t.playerId, nhat, cardValue(t.cards, cfg), `Thối ${describeCards(t.cards)}`)
      tags.push({ type: 'thoi', playerId: t.playerId })
    }

    for (const { steps } of input.chops) {
      const chopper = steps[steps.length - 1]
      const victim = steps[steps.length - 2]
      const chopped = steps.slice(0, -1)
      const units = chopped.reduce((s, step) => s + cardValue(step.cards, cfg), 0)
      const label = steps.length > 2 ? 'Chặt chồng' : 'Chặt'
      pay(victim.playerId, chopper.playerId, units, `${label} ${chopped.map((s) => describeCards(s.cards)).join(' + ')}`)
      tags.push({ type: 'chat', playerId: chopper.playerId })
    }

    return { transfers, tags }
  },
}
