import { actions } from '../../store'
import { ask, tell } from '../dialog'
import { playerMap, timeOf } from '../format'
import { useMe } from '../me'
import { answerTask, incomingAsks, outgoingAsks } from '../tasks'
import { Button, SectionTitle, TopBar, Who } from '../components/kit'
import { TaskCard } from '../components/TaskCard'
import { useSession } from '../components/useSession'

/** Trung tâm yêu cầu: ai đòi mình (trả lời) và mình đang đòi ai (chờ họ). */
export function Requests() {
  const session = useSession()
  const [me] = useMe(session)
  const players = playerMap(session)
  const incoming = incomingAsks(session, me)
  const outgoing = outgoingAsks(session, me)

  const acceptAll = async () => {
    const total = incoming.reduce((n, t) => n + (t.kind === 'ask' ? t.req.amount : 0), 0)
    const ok = await ask(`Trả hết ${incoming.length} lời đòi?`, { icon: '🍬', message: `Tổng ${total} kẹo.`, okLabel: 'Trả hết' })
    if (!ok) return
    const errors = incoming.flatMap((t) => answerTask(t, true))
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  return (
    <main>
      <TopBar title="📨 Yêu cầu" />

      <SectionTitle
        aside={
          incoming.length > 1 && (
            <Button variant="primary" className="px-3 py-1.5 text-sm" onClick={acceptAll}>
              OK tất cả ({incoming.length})
            </Button>
          )
        }
      >
        Người khác đòi bạn
      </SectionTitle>
      {incoming.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">Không ai đang đòi bạn 🎉</p>
      ) : (
        <ul className="space-y-2">
          {incoming.map((t) => (
            <TaskCard key={t.id} session={session} task={t} />
          ))}
        </ul>
      )}

      <div className="mt-6" />
      <SectionTitle>Bạn đang đòi</SectionTitle>
      {outgoing.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">
          Kéo một người vào mình trên bàn chơi để đòi kẹo.
        </p>
      ) : (
        <ul className="rounded-2xl bg-plum">
          {outgoing.map((r) => (
            <li key={r.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2.5 text-sm last:border-0">
              <span className="text-muted">Đòi</span>
              <Who player={players[r.from]} className="min-w-0 font-semibold text-sky" />
              <span className="candy num text-sm">{r.amount}</span>
              <span className="ml-auto text-[11px] whitespace-nowrap text-lemon">⏳ {timeOf(r.at)}</span>
              <button
                type="button"
                aria-label="Hủy lời đòi"
                className="px-1 text-muted hover:text-berry"
                onClick={() => actions().cancelRequest(r.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
