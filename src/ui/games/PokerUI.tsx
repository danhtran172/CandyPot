import { needsRanking, type PokerConfig, type PokerInput } from '../../core/games/poker'
import type { ID } from '../../core/types'
import { Chip, Stepper, Who } from '../components/kit'
import type { FormProps, GameUI } from './types'

function PokerForm({ input, onChange, participants, players }: FormProps<PokerInput, PokerConfig>) {
  const pot = participants.reduce((s, id) => s + (input.contributions[id] ?? 0), 0)
  const ranked = needsRanking(input)
  const toggle = (list: ID[], id: ID) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  return (
    <div className="space-y-3">
      <section className="flex items-center justify-between rounded-3xl border border-line/60 bg-plum p-4">
        <div>
          <h3 className="font-display text-lg font-bold">Pot</h3>
          <p className="text-sm text-muted">Nhập tổng kẹo mỗi người đã bỏ vào cả ván, kể cả người fold.</p>
        </div>
        <span className="candy num text-xl">{pot}</span>
      </section>

      {ranked && (
        <p className="rounded-2xl border border-grape/50 bg-grape/10 p-3 text-sm">
          Có side pot vì mọi người bỏ vào không bằng nhau. Xếp hạng bài cho người chưa fold: <b>1 = mạnh nhất</b>, bài bằng
          nhau thì cùng hạng.
        </p>
      )}

      <ul className="space-y-2">
        {participants.map((id) => {
          const folded = input.folded.includes(id)
          return (
            <li key={id} className={`space-y-3 rounded-3xl border border-line/60 bg-plum p-4 ${folded ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <Who player={players[id]} className="font-semibold" />
                <Stepper
                  label={`kẹo ${players[id]?.name} bỏ vào`}
                  value={input.contributions[id] ?? 0}
                  onChange={(v) => onChange({ ...input, contributions: { ...input.contributions, [id]: v } })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Chip
                  tone="berry"
                  active={folded}
                  onClick={() =>
                    onChange({
                      ...input,
                      folded: toggle(input.folded, id),
                      winners: input.winners.filter((w) => w !== id),
                    })
                  }
                >
                  Fold
                </Chip>
                {!folded && !ranked && (
                  <Chip tone="mint" active={input.winners.includes(id)} onClick={() => onChange({ ...input, winners: toggle(input.winners, id) })}>
                    🏆 Thắng
                  </Chip>
                )}
                {!folded && ranked && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-muted">
                    Hạng
                    <Stepper
                      label={`hạng bài ${players[id]?.name}`}
                      value={input.ranks[id] ?? 0}
                      min={1}
                      onChange={(v) => onChange({ ...input, ranks: { ...input.ranks, [id]: v } })}
                    />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const pokerUI: GameUI<PokerInput, PokerConfig> = {
  minPlayers: 2,
  maxPlayers: 99,
  usesBet: false,
  init: ({ participants }) => ({ players: participants, contributions: {}, folded: [], winners: [], ranks: {} }),
  sync(input, participants) {
    const keep = (id: ID) => participants.includes(id)
    return {
      players: participants,
      contributions: Object.fromEntries(Object.entries(input.contributions).filter(([id]) => keep(id))),
      folded: input.folded.filter(keep),
      winners: input.winners.filter(keep),
      ranks: Object.fromEntries(Object.entries(input.ranks).filter(([id]) => keep(id))),
    }
  },
  Form: PokerForm,
}
