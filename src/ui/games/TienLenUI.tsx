import type { ReactNode } from 'react'
import type { ChopStep, TienLenConfig, TienLenInput } from '../../core/games/tienlen'
import type { ID } from '../../core/types'
import { Button, Chip, Who } from '../components/kit'
import { CardCounter } from './CardCounter'
import type { FormProps, GameUI } from './types'

function rankName(i: number, n: number): string {
  if (i === 0) return 'Nhất'
  if (i === n - 1) return 'Bét'
  return ['Nhì', 'Ba'][i - 1]
}

function empty(participants: ID[]): TienLenInput {
  return { players: participants, ranking: [], chay: [], toiTrang: null, thoi: [], chops: [] }
}

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line/60 bg-plum p-4">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      {children}
    </section>
  )
}

function PlayerChips({
  ids,
  players,
  value,
  onPick,
}: {
  ids: ID[]
  players: FormProps<TienLenInput, TienLenConfig>['players']
  value: ID | null
  onPick: (id: ID) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <Chip key={id} active={value === id} onClick={() => onPick(id)}>
          <Who player={players[id]} />
        </Chip>
      ))}
    </div>
  )
}

function TienLenForm({ input, onChange, participants, players }: FormProps<TienLenInput, TienLenConfig>) {
  const set = (patch: Partial<TienLenInput>) => onChange({ ...input, ...patch })
  const nhat = input.ranking[0]
  const nonChay = participants.length - input.chay.length

  const tapRank = (id: ID) => {
    if (input.chay.includes(id)) return
    set({ ranking: input.ranking.includes(id) ? input.ranking.filter((r) => r !== id) : [...input.ranking, id] })
  }
  const toggleChay = (id: ID) =>
    input.chay.includes(id)
      ? set({ chay: input.chay.filter((c) => c !== id) })
      : set({ chay: [...input.chay, id], ranking: input.ranking.filter((r) => r !== id) })

  const updateChop = (i: number, steps: ChopStep[]) =>
    set({ chops: input.chops.map((c, j) => (j === i ? { steps } : c)) })

  return (
    <div className="space-y-3">
      <Block title="Tới trắng?" hint="Chọn nếu có người tới trắng — ván kết thúc ngay, không cần nhập gì thêm.">
        <PlayerChips
          ids={participants}
          players={players}
          value={input.toiTrang}
          onPick={(id) => onChange(input.toiTrang === id ? empty(participants) : { ...empty(participants), toiTrang: id })}
        />
      </Block>

      {!input.toiTrang && (
        <>
          <Block title="Thứ tự về" hint="Bấm lần lượt từ người về Nhất đến Bét. Bấm lại để bỏ.">
            <ul className="space-y-1.5">
              {participants.map((id) => {
                const rank = input.ranking.indexOf(id)
                const chay = input.chay.includes(id)
                return (
                  <li key={id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => tapRank(id)}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${
                        rank >= 0 ? 'border-lemon bg-lemon/10' : 'border-line bg-night/40'
                      }`}
                    >
                      <span
                        className={`font-display w-12 shrink-0 text-center text-base font-extrabold ${
                          rank === 0 ? 'text-lemon' : chay ? 'text-berry' : 'text-cream'
                        }`}
                      >
                        {chay ? 'Cháy' : rank >= 0 ? rankName(rank, nonChay) : '—'}
                      </span>
                      <Who player={players[id]} className="font-semibold" />
                    </button>
                    <Chip active={chay} tone="berry" onClick={() => toggleChay(id)}>
                      Cháy
                    </Chip>
                  </li>
                )
              })}
            </ul>
          </Block>

          <Block title="Thối" hint={nhat ? 'Quân còn trên tay, trả cho người về Nhất.' : 'Xếp người về Nhất trước.'}>
            <div className="space-y-3">
              {input.thoi.map((t, i) => (
                <div key={i} className="space-y-2 rounded-2xl bg-night/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <PlayerChips
                      ids={participants.filter((id) => id !== nhat)}
                      players={players}
                      value={t.playerId}
                      onPick={(id) => set({ thoi: input.thoi.map((x, j) => (j === i ? { ...x, playerId: id } : x)) })}
                    />
                    <button
                      type="button"
                      aria-label="Bỏ dòng thối"
                      className="px-1 text-muted"
                      onClick={() => set({ thoi: input.thoi.filter((_, j) => j !== i) })}
                    >
                      ✕
                    </button>
                  </div>
                  <CardCounter
                    value={t.cards}
                    onChange={(cards) => set({ thoi: input.thoi.map((x, j) => (j === i ? { ...x, cards } : x)) })}
                  />
                </div>
              ))}
              <Button
                className="w-full"
                disabled={!nhat}
                onClick={() => {
                  const bet = input.ranking[input.ranking.length - 1]
                  const who = input.ranking.length > 1 ? bet : (participants.find((p) => p !== nhat) ?? '')
                  set({ thoi: [...input.thoi, { playerId: who, cards: {} }] })
                }}
              >
                + Thêm thối
              </Button>
            </div>
          </Block>

          <Block title="Chặt" hint="Người đánh → người chặt. Chặt chồng: thêm bước, người bị chặt cuối trả hết.">
            <div className="space-y-3">
              {input.chops.map((chop, i) => (
                <div key={i} className="space-y-3 rounded-2xl bg-night/40 p-3">
                  {chop.steps.map((step, k) => {
                    const last = k === chop.steps.length - 1
                    return (
                      <div key={k} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold tracking-wide text-muted uppercase">
                          <span>{k === 0 ? 'Người đánh' : last ? 'Người chặt' : `Chặt lần ${k}`}</span>
                          {k >= 2 && (
                            <button
                              type="button"
                              className="normal-case"
                              onClick={() => updateChop(i, chop.steps.filter((_, j) => j !== k))}
                            >
                              Bỏ bước
                            </button>
                          )}
                        </div>
                        <PlayerChips
                          ids={participants}
                          players={players}
                          value={step.playerId}
                          onPick={(id) => updateChop(i, chop.steps.map((s, j) => (j === k ? { ...s, playerId: id } : s)))}
                        />
                        <CardCounter
                          value={step.cards}
                          onChange={(cards) => updateChop(i, chop.steps.map((s, j) => (j === k ? { ...s, cards } : s)))}
                        />
                      </div>
                    )
                  })}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 text-sm"
                      onClick={() => updateChop(i, [...chop.steps, { playerId: '', cards: {} }])}
                    >
                      + Chặt chồng
                    </Button>
                    <Button
                      variant="danger"
                      className="text-sm"
                      onClick={() => set({ chops: input.chops.filter((_, j) => j !== i) })}
                    >
                      Bỏ
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                className="w-full"
                onClick={() =>
                  set({
                    chops: [
                      ...input.chops,
                      { steps: [{ playerId: '', cards: { heoDen: 1 } }, { playerId: '', cards: {} }] },
                    ],
                  })
                }
              >
                + Thêm chặt
              </Button>
            </div>
          </Block>
        </>
      )}
    </div>
  )
}

export const tienlenUI: GameUI<TienLenInput, TienLenConfig> = {
  minPlayers: 2,
  maxPlayers: 4,
  usesBet: true,
  init: ({ participants }) => empty(participants),
  sync(input, participants) {
    const keep = (id: ID) => participants.includes(id)
    return {
      players: participants,
      ranking: input.ranking.filter(keep),
      chay: input.chay.filter(keep),
      toiTrang: input.toiTrang && keep(input.toiTrang) ? input.toiTrang : null,
      thoi: input.thoi.filter((t) => keep(t.playerId)),
      chops: input.chops.filter((c) => c.steps.every((s) => !s.playerId || keep(s.playerId))),
    }
  },
  Form: TienLenForm,
}
