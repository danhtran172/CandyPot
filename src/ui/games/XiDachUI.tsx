import {
  dealerBust,
  dealerNatural,
  LABEL_NAMES,
  RESULT_NAMES,
  type HandLabel,
  type HandResult,
  type XiDachConfig,
  type XiDachHand,
  type XiDachInput,
} from '../../core/games/xidach'
import type { ID, Round } from '../../core/types'
import { Button, Chip, Stepper, Who } from '../components/kit'
import type { FormProps, GameUI } from './types'

const LABELS = Object.keys(LABEL_NAMES) as HandLabel[]
const RESULTS: [HandResult, 'mint' | 'grape' | 'berry'][] = [
  ['win', 'mint'],
  ['push', 'grape'],
  ['lose', 'berry'],
]

function build(dealer: ID, participants: ID[], bet: number, keep: XiDachHand[] = [], prev?: Round): XiDachHand[] {
  const prevHands = (prev?.input as XiDachInput | undefined)?.hands ?? []
  return participants
    .filter((id) => id !== dealer)
    .map(
      (id) =>
        keep.find((h) => h.playerId === id) ?? {
          playerId: id,
          bet: prevHands.find((h) => h.playerId === id)?.bet ?? bet,
          result: null,
          label: null,
        },
    )
}

function XiDachForm({ input, onChange, participants, players, config, bet }: FormProps<XiDachInput, XiDachConfig>) {
  const setHand = (id: ID, patch: Partial<XiDachHand>) =>
    onChange({ ...input, hands: input.hands.map((h) => (h.playerId === id ? { ...h, ...patch } : h)) })

  return (
    <div className="space-y-3">
      <section className="rounded-3xl border border-line/60 bg-plum p-4">
        <h3 className="font-display text-lg font-bold">Nhà cái</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {participants.map((id) => (
            <Chip
              key={id}
              active={input.dealer === id}
              onClick={() => onChange({ ...input, dealer: id, hands: build(id, participants, bet, input.hands) })}
            >
              <Who player={players[id]} />
            </Chip>
          ))}
        </div>
        <div className="mt-3 text-sm text-muted">Bài của cái</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {LABELS.map((l) => (
            <Chip
              key={l}
              tone="grape"
              active={input.dealerLabel === l}
              onClick={() => onChange({ ...input, dealerLabel: input.dealerLabel === l ? null : l })}
            >
              {LABEL_NAMES[l]}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button className="px-2 text-sm" onClick={() => onChange(dealerNatural(input, 'xiban'))}>
            Cái xì bàn
          </Button>
          <Button className="px-2 text-sm" onClick={() => onChange(dealerNatural(input, 'xidach'))}>
            Cái xì dách
          </Button>
          <Button className="px-2 text-sm" onClick={() => onChange(dealerBust(input, config))}>
            Cái quắc
          </Button>
        </div>
      </section>

      <ul className="space-y-2">
        {input.hands.map((h) => (
          <li key={h.playerId} className="space-y-3 rounded-3xl border border-line/60 bg-plum p-4">
            <div className="flex items-center justify-between gap-2">
              <Who player={players[h.playerId]} className="font-semibold" />
              <Stepper label={`cược của ${players[h.playerId]?.name}`} value={h.bet} min={1} onChange={(v) => setHand(h.playerId, { bet: v })} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RESULTS.map(([r, tone]) => (
                <Chip key={r} tone={tone} active={h.result === r} className="py-2" onClick={() => setHand(h.playerId, { result: r })}>
                  {RESULT_NAMES[r]}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LABELS.map((l) => (
                <Chip
                  key={l}
                  tone="grape"
                  active={h.label === l}
                  className="px-2.5 py-1 text-xs"
                  onClick={() => setHand(h.playerId, { label: h.label === l ? null : l })}
                >
                  {LABEL_NAMES[l]}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const xidachUI: GameUI<XiDachInput, XiDachConfig> = {
  minPlayers: 2,
  maxPlayers: 99,
  usesBet: true,
  init({ participants, bet, prev }) {
    const prevDealer = (prev?.input as XiDachInput | undefined)?.dealer
    const dealer = prevDealer && participants.includes(prevDealer) ? prevDealer : participants[0]
    return { dealer, dealerLabel: null, hands: build(dealer, participants, bet, [], prev) }
  },
  sync(input, participants, bet) {
    const dealer = participants.includes(input.dealer) ? input.dealer : (participants[0] ?? '')
    return { ...input, dealer, hands: build(dealer, participants, bet, input.hands) }
  },
  onBetChange: (input, bet) => ({ ...input, hands: input.hands.map((h) => ({ ...h, bet })) }),
  Form: XiDachForm,
}
