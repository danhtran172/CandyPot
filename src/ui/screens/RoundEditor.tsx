import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { GAME_ICONS, GAMES } from '../../core/games'
import { netOfTransfers } from '../../core/ledger'
import type { ID } from '../../core/types'
import { actions } from '../../store'
import { useSession } from '../components/useSession'
import { TransferList } from '../components/TransferList'
import { Button, Card, Chip, Errors, SectionTitle, Stepper, TopBar, Who } from '../components/kit'
import { playCount, playerMap, roundNumber, signed, toneOf } from '../format'
import { GAME_UIS } from '../games'

export function RoundEditor() {
  const session = useSession()
  const { gid, rid } = useParams()
  const navigate = useNavigate()
  const game = session.games.find((g) => g.id === gid)
  const editing = game?.rounds.find((r) => r.id === rid)
  const back = `/s/${session.id}?g=${gid}`

  const [draft, setDraft] = useState(() => {
    if (!game) return null
    const ui = GAME_UIS[game.type]
    if (editing) return { participants: editing.participants, bet: editing.bet, input: editing.input }
    const prev = [...game.rounds].reverse().find((r) => r.kind === 'play')
    const active = session.players.filter((p) => p.active).map((p) => p.id)
    const fromPrev = prev?.participants.filter((id) => active.includes(id))
    const participants = (fromPrev && fromPrev.length >= ui.minPlayers ? fromPrev : active).slice(0, ui.maxPlayers)
    const bet = prev?.bet ?? 1
    return { participants, bet, input: ui.init({ participants, bet, prev, game }) }
  })
  const [saveErrors, setSaveErrors] = useState<string[]>([])

  const players = playerMap(session)
  const preview = useMemo(() => {
    if (!game || !draft) return null
    const mod = GAMES[game.type]
    const errors = mod.validate(draft.input, game.config)
    if (errors.length) return { errors, transfers: [], net: {} }
    const { transfers } = mod.resolve(draft.input, game.config, draft.bet)
    return { errors, transfers, net: netOfTransfers(transfers) }
  }, [game, draft])

  if (!game || !draft || !preview) {
    return <p className="pt-24 text-center text-muted">Không tìm thấy ván này.</p>
  }

  const ui = GAME_UIS[game.type]
  const order = session.players.map((p) => p.id)
  const candidates = session.players.filter((p) => p.active || draft.participants.includes(p.id))

  const toggleParticipant = (id: ID) => {
    const next = draft.participants.includes(id)
      ? draft.participants.filter((p) => p !== id)
      : [...draft.participants, id].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    if (next.length > ui.maxPlayers) return
    setDraft({ ...draft, participants: next, input: ui.sync(draft.input, next, draft.bet) })
  }

  const setBet = (bet: number) =>
    setDraft({ ...draft, bet, input: ui.onBetChange ? ui.onBetChange(draft.input, bet) : draft.input })

  const save = () => {
    const errors = actions().saveRound(game.id, { ...draft, bet: ui.usesBet ? draft.bet : 1 }, editing?.id)
    setSaveErrors(errors)
    if (!errors.length) navigate(back, { replace: true })
  }

  const remove = () => {
    if (!editing || !confirm('Xóa ván này? Lời/lỗ sẽ được tính lại.')) return
    actions().deleteRound(game.id, editing.id)
    navigate(back, { replace: true })
  }

  const roundNo = editing ? roundNumber(game, editing) : playCount(game) + 1
  const Form = ui.Form

  return (
    <main className="pb-24">
      <TopBar title={`${GAME_ICONS[game.type]} Ván ${roundNo}`} back={back} />

      <Card>
        <SectionTitle
          aside={
            <span className="text-xs text-muted">
              {ui.maxPlayers < 99 ? `${ui.minPlayers}–${ui.maxPlayers} người` : `≥ ${ui.minPlayers} người`}
            </span>
          }
        >
          Ai chơi ván này
        </SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((p) => (
            <Chip key={p.id} active={draft.participants.includes(p.id)} onClick={() => toggleParticipant(p.id)}>
              <Who player={p} />
            </Chip>
          ))}
        </div>
        {ui.usesBet && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
            <div>
              <div className="font-semibold">Mức cược</div>
              <div className="text-xs text-muted">
                {game.type === 'xidach' ? 'Đổi ở đây sẽ đặt lại cược mọi người con' : 'Mọi hệ số nhân với mức này'}
              </div>
            </div>
            <Stepper value={draft.bet} min={1} onChange={setBet} label="mức cược" />
          </div>
        )}
      </Card>

      <div className="mt-3">
        {draft.participants.length >= ui.minPlayers ? (
          <Form
            input={draft.input}
            onChange={(input) => setDraft({ ...draft, input })}
            participants={draft.participants}
            players={players}
            config={game.config}
            bet={draft.bet}
          />
        ) : (
          <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
            Chọn ít nhất {ui.minPlayers} người chơi.
          </p>
        )}
      </div>

      <Card className="mt-3">
        <SectionTitle>Kết quả ván</SectionTitle>
        {preview.errors.length ? (
          <ul className="space-y-1 text-sm text-muted">
            {preview.errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        ) : (
          <>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
              {draft.participants.map((id) => (
                <li key={id} className="flex items-center gap-1.5">
                  <Who player={players[id]} />
                  <b className={`num ${toneOf(preview.net[id] ?? 0)}`}>{signed(preview.net[id] ?? 0)}</b>
                </li>
              ))}
            </ul>
            {preview.transfers.length > 0 ? (
              <TransferList transfers={preview.transfers} players={players} showReason />
            ) : (
              <p className="text-sm text-muted">Ván hòa, không ai đưa kẹo.</p>
            )}
          </>
        )}
      </Card>

      <div className="mt-3">
        <Errors errors={saveErrors} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-lg gap-2 bg-night/90 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {editing && (
          <Button variant="danger" onClick={remove}>
            Xóa
          </Button>
        )}
        <Button
          variant="primary"
          className="font-display flex-1 py-3.5 text-xl"
          disabled={preview.errors.length > 0}
          onClick={save}
        >
          {editing ? 'Lưu thay đổi' : 'Lưu ván'}
        </Button>
      </div>
    </main>
  )
}
