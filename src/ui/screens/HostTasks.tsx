import { Link } from 'react-router'
import { actions } from '../../store'
import { ask, tell } from '../dialog'
import { playerMap, timeOf } from '../format'
import { useMe } from '../me'
import { answerTask, hostTasks, myUndos, othersPending } from '../tasks'
import { PingButton } from '../components/PingButton'
import { Button, SectionTitle, TopBar, Who } from '../components/kit'
import { TaskCard, UndoDetail } from '../components/TaskCard'
import { UndoIcon } from '../components/UndoIcon'
import { useSession } from '../components/useSession'

/**
 * Task host: host duyệt yêu cầu hoàn tác và theo dõi lời đòi giữa mọi người;
 * người khác xem yêu cầu hoàn tác của mình đang chờ host (rút lại được).
 */
export function HostTasks() {
  const session = useSession()
  const [me] = useMe(session)
  const players = playerMap(session)
  const host = session.hostId ? players[session.hostId] : undefined
  const isHost = !!me && me === session.hostId
  const tasks = hostTasks(session, me)
  const others = othersPending(session, me)
  const mine = myUndos(session, me)

  const acceptAll = async () => {
    const ok = await ask(`Duyệt cả ${tasks.length} việc?`, { icon: '🛎️', message: 'Hoàn tác các lượt được xin, chuyển kẹo các lời đòi được nhờ.', okLabel: 'Duyệt hết' })
    if (!ok) return
    const errors = tasks.flatMap((t) => answerTask(t, true))
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  return (
    <main>
      <TopBar title="🛎️ Host" back={`/s/${session.id}`} />
      <p className="mb-4 flex items-center gap-1.5 text-sm text-muted">
        Host: <Who player={host} className="font-semibold text-cream" />
        {isHost && <span className="rounded-full bg-lemon px-2 text-xs font-bold text-night">bạn</span>}
        {!isHost && (
          <Link to={`/s/${session.id}/players`} className="ml-auto text-xs font-semibold text-sky">
            🗳️ Host vắng? Bầu host mới ›
          </Link>
        )}
      </p>

      {isHost ? (
        <>
          <SectionTitle
            aside={
              tasks.length > 1 && (
                <Button variant="primary" className="px-3 py-1.5 text-sm" onClick={acceptAll}>
                  OK tất cả ({tasks.length})
                </Button>
              )
            }
          >
            Chờ host duyệt
          </SectionTitle>
          {tasks.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">
              Không có yêu cầu nào chờ duyệt 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <TaskCard key={t.id} session={session} task={t} />
              ))}
            </ul>
          )}

          {others.length > 0 && (
            <>
              <div className="mt-6" />
              <SectionTitle>Lời đòi đang chờ người khác</SectionTitle>
              <ul className="rounded-2xl bg-plum">
                {others.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 border-b border-line/40 px-3 py-2.5 text-sm last:border-0">
                    <Who chip player={players[r.to]} className="min-w-0 font-semibold text-sky" />
                    <span className="text-muted">đòi</span>
                    <Who chip player={players[r.from]} className="min-w-0 font-semibold text-sky" />
                    <span className="candy num ml-auto text-sm">{r.amount}</span>
                    <span className="text-[11px] text-muted">{timeOf(r.at)}</span>
                    <button
                      type="button"
                      aria-label="Hủy lời đòi"
                      className="px-1 text-muted hover:text-berry"
                      onClick={async () => {
                        const ok = await ask('Hủy lời đòi này?', {
                          icon: '✋',
                          message: `${players[r.to]?.name} đòi ${players[r.from]?.name} ${r.amount} kẹo.`,
                          okLabel: 'Hủy lời đòi',
                          danger: true,
                        })
                        if (ok) actions().cancelRequest(r.id)
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <SectionTitle>Bạn xin hoàn tác</SectionTitle>
          {mine.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line p-5 text-center text-sm text-muted">
              Mở 📜 Trả/nhận trên bàn chơi, bấm <UndoIcon className="size-3.5 align-[-2px]" /> ở một lượt để xin host hoàn tác.
            </p>
          ) : (
            <ul className="space-y-2">
              {mine.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-line/60 bg-plum p-3">
                  <div className="min-w-0 flex-1">
                    <UndoDetail session={session} undo={u} />
                    <div className="mt-0.5 text-xs font-semibold text-lemon">⏳ Chờ {host?.name ?? 'host'} xác nhận</div>
                  </div>
                  <PingButton req={u} />
                  <Button variant="danger" className="px-3 py-1.5 text-sm" onClick={() => actions().answerUndo(u.id, false)}>
                    Rút lại
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
