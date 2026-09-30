import { actions } from '../../store'
import { ask, tell } from '../dialog'
import { playerMap, timeOf } from '../format'
import { useMe } from '../me'
import { answerTask, declinedByMe, incomingAsks, outgoingAsks } from '../tasks'
import { Button, SectionTitle, TopBar, Who } from '../components/kit'
import { TaskCard } from '../components/TaskCard'
import { UndoIcon } from '../components/UndoIcon'
import { PingButton } from '../components/PingButton'
import { useSession } from '../components/useSession'

/** Trạng thái lời đòi của mình. */
const STATUS = {
  waiting: { label: () => '⏳ chờ', tone: 'text-lemon' },
  declined: { label: (name: string) => `✋ ${name} từ chối`, tone: 'text-berry' },
  escalated: { label: () => '🛎️ chờ host', tone: 'text-sky' },
  rejected: { label: () => '❌ host từ chối', tone: 'text-berry' },
} as const

/** Trạng thái lời đòi mình đã từ chối (nhìn từ phía người bị đòi). */
const DECLINED = {
  declined: { label: () => '✋ bạn đã từ chối', tone: 'text-berry' },
  escalated: { label: (name: string) => `🛎️ ${name} nhờ host`, tone: 'text-sky' },
  rejected: { label: () => '✅ host đồng ý không trả', tone: 'text-mint' },
} as const

/**
 * Trung tâm yêu cầu: ai đòi mình (trả lời), lời đòi mình đã từ chối (ghi lại, đổi ý thì trả được)
 * và mình đang đòi ai (chờ họ, bị từ chối → nhờ host).
 */
export function Requests() {
  const session = useSession()
  const [me] = useMe(session)
  const players = playerMap(session)
  const incoming = incomingAsks(session, me)
  const outgoing = outgoingAsks(session, me)
  const declined = declinedByMe(session, me)
  const isHost = !!me && me === session.hostId

  const escalate = async (id: string) => {
    const errors = actions().escalateRequest(id)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  /** Host tự đòi mà bị từ chối → host tự quyết luôn. */
  const judge = async (id: string) => {
    const r = session.requests.find((x) => x.id === id)
    const ok = await ask(`Ghi ${players[r?.from ?? '']?.name} trả bạn ${r?.amount} kẹo?`, {
      icon: '🛎️',
      message: 'Bạn là host — lời đòi bị từ chối nhưng bạn vẫn ghi được.',
      okLabel: 'Ghi luôn',
    })
    if (!ok) return
    const errors = actions().judgeRequest(id, true)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  /** Đổi ý: trả lời đòi mình đã từ chối. */
  const payAnyway = async (id: string) => {
    const r = session.requests.find((x) => x.id === id)
    if (!r) return
    const ok = await ask(`Trả ${players[r.to]?.name} ${r.amount} kẹo?`, {
      icon: '🍬',
      message: 'Bạn đã từ chối lời đòi này — đổi ý thì trả luôn.',
      okLabel: 'Trả luôn',
    })
    if (!ok) return
    const errors = actions().payDeclined(id)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  const acceptAll = async () => {
    const total = incoming.reduce((n, t) => n + (t.kind === 'ask' ? t.req.amount : 0), 0)
    const ok = await ask(`Trả hết ${incoming.length} lời đòi?`, { icon: '🍬', message: `Tổng ${total} kẹo.`, okLabel: 'Trả hết' })
    if (!ok) return
    const errors = incoming.flatMap((t) => answerTask(t, true))
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  return (
    <main>
      <TopBar title="📨 Yêu cầu" back={`/s/${session.id}`} />

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

      {declined.length > 0 && (
        <>
          <div className="mt-6" />
          <SectionTitle>Bạn đã từ chối</SectionTitle>
          <ul className="rounded-2xl bg-plum">
            {declined.map((r) => {
              const st = DECLINED[r.status as keyof typeof DECLINED]
              return (
                <li key={r.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2.5 text-sm last:border-0">
                  <Who player={players[r.to]} className="min-w-0 font-semibold text-sky" />
                  <span className="text-muted">đòi</span>
                  <span className="num font-display font-extrabold text-lemon">{r.amount}</span>
                  <span className={`ml-auto text-[11px] whitespace-nowrap ${st.tone}`}>
                    {st.label(players[r.to]?.name ?? '?')} · {timeOf(r.answeredAt ?? r.at)}
                  </span>
                  <Button className="shrink-0 px-2.5 py-1 text-xs font-bold text-lemon" onClick={() => payAnyway(r.id)}>
                    Trả
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="mt-6" />
      <SectionTitle>Bạn đang đòi</SectionTitle>
      {outgoing.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">
          Bấm một người trên bàn chơi → ⇄ Đòi (hoặc kéo người đó vào mình) để đòi kẹo.
        </p>
      ) : (
        <ul className="rounded-2xl bg-plum">
          {outgoing.map((r) => (
            <li key={r.id} className="border-b border-line/40 px-3 py-2.5 text-sm last:border-0">
              <div className="flex items-center gap-2">
                <Who player={players[r.from]} className="min-w-0 font-semibold text-sky" />
                <span className="candy num text-sm">{r.amount}</span>
                <span className={`ml-auto text-[11px] whitespace-nowrap ${STATUS[r.status ?? 'waiting'].tone}`}>
                  {STATUS[r.status ?? 'waiting'].label(players[r.from]?.name ?? '?')} · {timeOf(r.answeredAt ?? r.at)}
                </span>
                {/* Còn người phải trả lời (người bị đòi / host) → nhắc được */}
                {(!r.status || r.status === 'escalated') && <PingButton req={r} />}
                <button
                  type="button"
                  aria-label={r.status ? 'Xóa lời đòi' : 'Hủy lời đòi'}
                  className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100 active:scale-90"
                  onClick={() => actions().cancelRequest(r.id)}
                >
                  {r.status ? <span className="px-0.5 text-base leading-none text-muted">✕</span> : <UndoIcon className="size-4" />}
                </button>
              </div>
              {r.status === 'declined' && (
                <div className="mt-2 flex justify-end">
                  {isHost ? (
                    <Button variant="primary" className="px-3 py-1 text-xs" onClick={() => judge(r.id)}>
                      🛎️ Host ghi luôn {r.amount} kẹo
                    </Button>
                  ) : (
                    <Button className="px-3 py-1 text-xs font-bold text-lemon" onClick={() => escalate(r.id)}>
                      🛎️ Nhờ host giải quyết
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
