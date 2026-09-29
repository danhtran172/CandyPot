import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { GAME_ICONS, GAMES } from '../../core/games'
import type { ID } from '../../core/types'
import { actions } from '../../store'
import type { OpenDraft } from '../../store/appStore'
import { Button, Card, Chip, Errors, SectionTitle, Stepper, TopBar, Who } from '../components/kit'
import { useSession } from '../components/useSession'
import { playCount } from '../format'

export function OpenRound() {
  const session = useSession()
  const { gid } = useParams()
  const navigate = useNavigate()
  const game = session.games.find((g) => g.id === gid)
  const back = `/s/${session.id}?g=${gid}`
  const [errors, setErrors] = useState<string[]>([])

  const [draft, setDraft] = useState<OpenDraft | null>(() => {
    if (!game) return null
    const mod = GAMES[game.type]
    const prev = [...game.rounds].reverse().find((r) => r.kind === 'play')
    const active = session.players.filter((p) => p.active).map((p) => p.id)
    const fromPrev = prev?.participants.filter((id) => active.includes(id))
    const participants = (fromPrev && fromPrev.length >= mod.minPlayers ? fromPrev : active).slice(0, mod.maxPlayers)
    const bet = prev?.bet || 1
    const dealer = prev?.dealer && participants.includes(prev.dealer) ? prev.dealer : (participants[0] ?? null)
    const stakes = Object.fromEntries(active.map((id) => [id, prev?.stakes[id] ?? bet]))
    return { participants, bet, stakes, dealer }
  })

  if (!game || !draft) return <p className="pt-24 text-center text-muted">Không tìm thấy game.</p>

  const mod = GAMES[game.type]
  const order = session.players.map((p) => p.id)
  const candidates = session.players.filter((p) => p.active || draft.participants.includes(p.id))
  const stakeIds = draft.participants.filter((id) =>
    mod.stakeMode === 'dealer' ? id !== draft.dealer : mod.stakeMode === 'pot',
  )

  const toggle = (id: ID) => {
    const participants = draft.participants.includes(id)
      ? draft.participants.filter((p) => p !== id)
      : [...draft.participants, id].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    if (participants.length > mod.maxPlayers) return
    const dealer = draft.dealer && participants.includes(draft.dealer) ? draft.dealer : (participants[0] ?? null)
    setDraft({ ...draft, participants, dealer })
  }

  const setAll = (bet: number) =>
    setDraft({ ...draft, bet, stakes: { ...draft.stakes, ...Object.fromEntries(stakeIds.map((id) => [id, bet])) } })

  const open = () => {
    const errs = actions().openRound(game.id, draft)
    setErrors(errs)
    if (!errs.length) navigate(back, { replace: true })
  }

  const stakeLabel = mod.stakeMode === 'pot' ? 'Bỏ vào pot' : 'Cược'

  return (
    <main className="pb-24">
      <TopBar title={`${GAME_ICONS[game.type]} Mở ván ${playCount(game) + 1}`} back={back} />

      <Card>
        <SectionTitle
          aside={
            <span className="text-xs text-muted">
              {mod.maxPlayers < 99 ? `${mod.minPlayers}–${mod.maxPlayers} người` : `≥ ${mod.minPlayers} người`}
            </span>
          }
        >
          Ai chơi ván này
        </SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((p) => (
            <Chip key={p.id} active={draft.participants.includes(p.id)} onClick={() => toggle(p.id)}>
              <Who player={p} />
            </Chip>
          ))}
        </div>
      </Card>

      {mod.stakeMode === 'dealer' && (
        <Card className="mt-3">
          <SectionTitle>🎩 Nhà cái</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {draft.participants.map((id) => (
              <Chip key={id} tone="grape" active={draft.dealer === id} onClick={() => setDraft({ ...draft, dealer: id })}>
                <Who player={session.players.find((p) => p.id === id)} />
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{mod.stakeMode === 'common' ? 'Mức cược chung' : 'Cược mặc định'}</div>
            <div className="text-xs text-muted">
              {mod.stakeMode === 'common'
                ? 'Gợi ý khi kéo kẹo = hệ số luật × mức này'
                : 'Đổi ở đây sẽ đặt lại cược của mọi người bên dưới'}
            </div>
          </div>
          <Stepper value={draft.bet} min={1} onChange={setAll} label="mức cược" />
        </div>

        {mod.stakeMode !== 'common' && stakeIds.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line/60 pt-4">
            {stakeIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <Who player={session.players.find((p) => p.id === id)} className="font-semibold" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{stakeLabel}</span>
                  <Stepper
                    value={draft.stakes[id] ?? 0}
                    min={mod.stakeMode === 'pot' ? 0 : 1}
                    label={`${stakeLabel} của ${session.players.find((p) => p.id === id)?.name}`}
                    onChange={(v) => setDraft({ ...draft, stakes: { ...draft.stakes, [id]: v } })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-3">
        <Errors errors={errors} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg bg-night/90 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button variant="primary" className="font-display w-full py-3.5 text-xl" onClick={open}>
          Mở ván
        </Button>
      </div>
    </main>
  )
}
