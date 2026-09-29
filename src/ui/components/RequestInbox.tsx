import { useEffect, useRef, useState } from 'react'
import type { ID, Session } from '../../core/types'
import { useMe } from '../me'
import { answerTask, okLabel, tasksFor, type Task } from '../tasks'
import { Button } from './kit'
import { TaskSummary } from './TaskCard'

/** Yêu cầu gốc của một việc (để biết lần nhắc). */
const pingOf = (t: Task) => (t.kind === 'ask' ? t.req : t.undo)

/**
 * Thông báo trên cùng cho việc cũ nhất đang chờ mình (bị đòi kẹo / host duyệt hoàn tác).
 * "Để sau" ẩn thông báo đến khi có việc mới hoặc bên kia bấm 🔔 nhắc — các việc vẫn nằm ở tab Yêu cầu / Host.
 */
export function RequestInbox({ session, onOpenAll }: { session: Session; onOpenAll: (tab: 'host' | 'requests') => void }) {
  const [me] = useMe(session)
  const [error, setError] = useState<string | null>(null)
  // Việc đã "Để sau" → lúc bấm; bị nhắc sau lúc đó thì hiện lại
  const [snoozed, setSnoozed] = useState<Map<ID, number>>(() => new Map())
  const tasks = tasksFor(session, me)
  const ids = tasks.map((t) => `${t.id}:${pingOf(t)?.pings ?? 0}`).join()
  const seen = useRef(new Set<string>())

  // Rung nhẹ khi có thông báo mới
  useEffect(() => {
    const fresh = ids.split(',').filter((id) => id && !seen.current.has(id))
    fresh.forEach((id) => seen.current.add(id))
    if (fresh.length) navigator.vibrate?.(200)
  }, [ids])

  const task = tasks.find((t) => !snoozed.has(t.id) || (pingOf(t)?.pingedAt ?? 0) > snoozed.get(t.id)!)
  if (!task) return null
  const later = () => {
    setError(null)
    // Ẩn mọi việc hiện có — việc mới hoặc bị nhắc lại mới bật lại thông báo
    const at = Date.now()
    setSnoozed((s) => new Map([...s, ...tasks.map((t): [ID, number] => [t.id, at])]))
  }

  return (
    <div role="alertdialog" aria-label="Thông báo" className="fixed inset-x-0 top-0 z-30 mx-auto max-w-lg px-3 pt-3">
      <div className="pop rounded-3xl border-2 border-lemon bg-plum-2 p-4 shadow-2xl">
        <TaskSummary session={session} task={task} />
        {error && <p className="mt-2 text-sm text-berry">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button variant="danger" onClick={() => setError(answerTask(task, false)[0] ?? null)}>
            Không
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => setError(answerTask(task, true)[0] ?? null)}>
            {okLabel(task)}
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <button type="button" className="py-1 font-semibold text-muted" onClick={later}>
            Để sau
          </button>
          {tasks.length > 1 && (
            <button
              type="button"
              className="py-1 font-semibold text-lemon"
              onClick={() => onOpenAll(task.kind === 'ask' ? 'requests' : 'host')}
            >
              Xem cả {tasks.length} việc ›
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
