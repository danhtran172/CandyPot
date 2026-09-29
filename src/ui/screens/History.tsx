import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GAME_ICONS } from '../../core/games'
import { netOfTransfers } from '../../core/ledger'
import { actions } from '../../store'
import type { Game, ID, Round } from '../../core/types'
import { useSession } from '../components/useSession'
import { TransferList } from '../components/TransferList'
import { Button, Card, Chip, TopBar, Who } from '../components/kit'
import { playerMap, roundNumber, signed, timeOf, toneOf } from '../format'

interface Entry {
  game: Game
  round: Round
  no: number
}

export function History() {
  const session = useSession()
  const [tab, setTab] = useState<'rounds' | 'people'>('rounds')
  const [open, setOpen] = useState<ID | null>(null)
  const [who, setWho] = useState<ID>(session.players[0]?.id ?? '')
  const navigate = useNavigate()
  const players = playerMap(session)

  const entries: Entry[] = session.games
    .flatMap((game) =>
      game.rounds.filter((r) => r.status === 'closed').map((round) => ({ game, round, no: roundNumber(game, round) })),
    )
    .sort((a, b) => a.round.at - b.round.at)

  const label = (e: Entry) => (e.round.kind === 'manual' ? 'Chuyển tay' : `Ván ${e.no}`)

  const reopen = (e: Entry) => {
    const errors = actions().reopenRound(e.game.id, e.round.id)
    if (errors.length) return alert(errors[0])
    navigate(`/s/${session.id}?g=${e.game.id}`)
  }

  const remove = (e: Entry) => {
    if (confirm(`Xóa ${e.game.name} · ${label(e)}? Lời/lỗ sẽ được tính lại.`)) actions().deleteRound(e.game.id, e.round.id)
  }

  let running = 0
  const series = [{ x: 0, name: 'Đầu buổi', net: 0 }]
  const personal: { e: Entry; delta: number }[] = []
  for (const e of entries) {
    const delta = netOfTransfers(e.round.transfers)[who] ?? 0
    if (!e.round.participants.includes(who) && delta === 0) continue
    running += delta
    personal.push({ e, delta })
    series.push({ x: series.length, name: `${e.game.name} · ${label(e)}`, net: running })
  }

  return (
    <main>
      <TopBar title="Lịch sử" />
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-plum p-1">
        {(
          [
            ['rounds', 'Theo ván'],
            ['people', 'Theo người'],
          ] as const
        ).map(([k, text]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-xl py-2 font-semibold ${tab === k ? 'bg-plum-2 text-lemon' : 'text-muted'}`}
          >
            {text}
          </button>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Chưa có ván nào. Về Bàn chơi và bấm “+ Mở ván”.
        </p>
      )}

      {tab === 'rounds' && (
        <ul className="space-y-2">
          {[...entries].reverse().map((e) => {
            const net = netOfTransfers(e.round.transfers)
            const isOpen = open === e.round.id
            return (
              <li key={e.round.id}>
                <Card className="p-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="w-full p-4 text-left"
                    onClick={() => setOpen(isOpen ? null : e.round.id)}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">
                        {GAME_ICONS[e.game.type]} {e.game.name} · {label(e)}
                      </span>
                      <span className="text-xs text-muted">{timeOf(e.round.at)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                      {Object.entries(net)
                        .filter(([, v]) => v !== 0)
                        .map(([id, v]) => (
                          <span key={id}>
                            {players[id]?.emoji} <b className={`num ${toneOf(v)}`}>{signed(v)}</b>
                          </span>
                        ))}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line/60 p-4 pt-3">
                      <TransferList
                        transfers={e.round.moves.map((m) => ({ from: m.from, to: m.to, amount: m.amount, reason: m.label }))}
                        players={players}
                        showReason
                      />
                      <div className="mt-3 flex gap-2">
                        {e.round.kind === 'play' && (
                          <Button className="flex-1 text-sm" onClick={() => reopen(e)}>
                            Mở lại để sửa
                          </Button>
                        )}
                        <Button variant="danger" className="text-sm" onClick={() => remove(e)}>
                          Xóa
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'people' && entries.length > 0 && (
        <>
          <nav aria-label="Người chơi" className="-mx-4 mb-3 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
            {session.players.map((p) => (
              <Chip key={p.id} active={who === p.id} onClick={() => setWho(p.id)}>
                <Who player={p} />
              </Chip>
            ))}
          </nav>
          <Card>
            <div className="flex items-baseline justify-between">
              <Who player={players[who]} className="font-display text-xl font-bold" />
              <span className={`num font-display text-2xl font-extrabold ${toneOf(running)}`}>{signed(running)}</span>
            </div>
            <div className="mt-3 h-48">
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="#4d2f5c" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="x" tick={{ fill: '#bda3c8', fontSize: 11 }} stroke="#4d2f5c" />
                  <YAxis tick={{ fill: '#bda3c8', fontSize: 11 }} stroke="#4d2f5c" allowDecimals={false} />
                  <ReferenceLine y={0} stroke="#bda3c8" strokeOpacity={0.5} />
                  <Tooltip
                    contentStyle={{ background: '#3b2147', border: '1px solid #4d2f5c', borderRadius: 12 }}
                    labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''}
                    formatter={(v) => [signed(Number(v)), 'Lời/lỗ']}
                  />
                  <Line type="monotone" dataKey="net" stroke="#ffd23f" strokeWidth={3} dot={{ r: 3, fill: '#ffd23f' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <ul className="mt-3 space-y-1">
            {[...personal].reverse().map(({ e, delta }) => (
              <li key={e.round.id} className="flex items-center justify-between rounded-2xl bg-plum px-4 py-2.5">
                <span className="text-sm">
                  {GAME_ICONS[e.game.type]} {e.game.name} · {label(e)}
                </span>
                <b className={`num ${toneOf(delta)}`}>{signed(delta)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
