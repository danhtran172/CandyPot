import type { CandyRequest, ID, Session, UndoRequest } from '../core/types'
import { actions } from '../store'

/** Một việc chờ mình trả lời: bị đòi kẹo, hoặc (host) có người xin hoàn tác. */
export type Task =
  | { kind: 'ask'; id: ID; at: number; req: CandyRequest }
  | { kind: 'undo'; id: ID; at: number; undo: UndoRequest }

const oldestFirst = <T extends { at: number }>(list: T[]) => [...list].sort((a, b) => a.at - b.at)

/** Trung tâm yêu cầu: người khác đòi mình — mình cần trả lời. */
export function incomingAsks(session: Session, me: ID | undefined): Task[] {
  if (!me) return []
  return oldestFirst(session.requests.filter((r) => r.from === me)).map((req) => ({ kind: 'ask', id: req.id, at: req.at, req }))
}

/** Trung tâm yêu cầu: mình đang đòi người khác, chờ họ xác nhận. */
export function outgoingAsks(session: Session, me: ID | undefined): CandyRequest[] {
  if (!me) return []
  return oldestFirst(session.requests.filter((r) => r.to === me))
}

/** Task host: yêu cầu hoàn tác chờ host duyệt (chỉ host trả lời được). */
export function hostTasks(session: Session, me: ID | undefined): Task[] {
  if (!me || me !== session.hostId) return []
  return oldestFirst(session.undos).map((undo) => ({ kind: 'undo', id: undo.id, at: undo.at, undo }))
}

/** Task host: yêu cầu hoàn tác của mình đang chờ host. */
export function myUndos(session: Session, me: ID | undefined): UndoRequest[] {
  if (!me || me === session.hostId) return []
  return oldestFirst(session.undos.filter((u) => u.by === me))
}

/** Host theo dõi: lời đòi giữa những người khác còn chờ xác nhận. */
export function othersPending(session: Session, me: ID | undefined): CandyRequest[] {
  if (!me || me !== session.hostId) return []
  return oldestFirst(session.requests.filter((r) => r.from !== me && r.to !== me))
}

/** Mọi việc mình cần trả lời, cũ nhất trước. */
export function tasksFor(session: Session, me: ID | undefined): Task[] {
  return oldestFirst([...incomingAsks(session, me), ...hostTasks(session, me)])
}

export function answerTask(task: Task, accept: boolean): string[] {
  return task.kind === 'ask' ? actions().answerRequest(task.id, accept) : actions().answerUndo(task.id, accept)
}

/** Chữ nút đồng ý. */
export const okLabel = (task: Task) => (task.kind === 'ask' ? `OK, chuyển ${task.req.amount}` : 'OK, hoàn tác')
