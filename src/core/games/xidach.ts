import type { GameModule, ID, Transfer } from '../types'

export type HandLabel = 'xiban' | 'xidach' | 'ngulinh' | 'quac' | 'non'
export type HandResult = 'win' | 'push' | 'lose'
type BonusLabel = 'xiban' | 'xidach' | 'ngulinh'

export const LABEL_NAMES: Record<HandLabel, string> = {
  xiban: 'Xì bàn',
  xidach: 'Xì dách',
  ngulinh: 'Ngũ linh',
  quac: 'Quắc',
  non: 'Non',
}

export const RESULT_NAMES: Record<HandResult, string> = { win: 'Thắng', push: 'Hòa', lose: 'Thua' }

export interface XiDachConfig {
  multipliers: Record<BonusLabel, number>
  /** Cái quắc thì con cũng quắc tính là gì */
  bothBust: 'push' | 'lose'
}

export interface XiDachHand {
  playerId: ID
  bet: number
  result: HandResult | null
  label: HandLabel | null
}

export interface XiDachInput {
  dealer: ID
  dealerLabel: HandLabel | null
  hands: XiDachHand[]
}

export function multiplier(label: HandLabel | null, cfg: XiDachConfig): number {
  if (label === 'xiban' || label === 'xidach' || label === 'ngulinh') return cfg.multipliers[label]
  return 1
}

/** Nút nhanh: cái xì bàn / xì dách → mọi con thua. */
export function dealerNatural(input: XiDachInput, label: 'xiban' | 'xidach'): XiDachInput {
  return { ...input, dealerLabel: label, hands: input.hands.map((h) => ({ ...h, result: 'lose' })) }
}

/** Nút nhanh: cái quắc → con không quắc thắng, con quắc theo cấu hình. */
export function dealerBust(input: XiDachInput, cfg: XiDachConfig): XiDachInput {
  return {
    ...input,
    dealerLabel: 'quac',
    hands: input.hands.map((h) => ({
      ...h,
      result: h.label === 'quac' ? (cfg.bothBust === 'push' ? 'push' : 'lose') : 'win',
    })),
  }
}

export const xidach: GameModule<XiDachConfig, XiDachInput> = {
  type: 'xidach',
  label: 'Xì dách',
  defaultConfig: {
    multipliers: { xiban: 2, xidach: 2, ngulinh: 2 },
    bothBust: 'push',
  },

  validate(input) {
    const errors: string[] = []
    if (!input.dealer) errors.push('Chưa chọn nhà cái.')
    if (input.hands.length === 0) errors.push('Cần ít nhất 1 người con.')
    const ids = input.hands.map((h) => h.playerId)
    if (ids.includes(input.dealer)) errors.push('Nhà cái không thể đồng thời là con.')
    if (new Set(ids).size !== ids.length) errors.push('Một người con bị nhập hai lần.')
    if (input.hands.some((h) => !Number.isInteger(h.bet) || h.bet <= 0)) {
      errors.push('Tiền cược phải là số nguyên lớn hơn 0.')
    }
    if (input.hands.some((h) => !h.result)) errors.push('Chưa nhập kết quả cho mọi người con.')
    return errors
  },

  resolve(input, cfg) {
    const transfers: Transfer[] = []
    const dealerMult = multiplier(input.dealerLabel, cfg)
    for (const h of input.hands) {
      if (h.result === 'win') {
        const m = multiplier(h.label, cfg)
        const reason = h.label && m > 1 ? `Thắng cái (${LABEL_NAMES[h.label]} ×${m})` : 'Thắng cái'
        transfers.push({ from: input.dealer, to: h.playerId, amount: h.bet * m, reason })
      } else if (h.result === 'lose') {
        const reason =
          input.dealerLabel && dealerMult > 1 ? `Thua cái (cái ${LABEL_NAMES[input.dealerLabel]} ×${dealerMult})` : 'Thua cái'
        transfers.push({ from: h.playerId, to: input.dealer, amount: h.bet * dealerMult, reason })
      }
    }
    return { transfers, tags: [{ type: 'lam-cai', playerId: input.dealer }] }
  },
}
