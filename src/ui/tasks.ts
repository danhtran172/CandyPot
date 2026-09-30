import type { CandyRequest, ID, Session, UndoRequest } from '../core/types'
import { actions } from '../store'

/** Một việc chờ mình trả lời: bị đòi kẹo, hoặc (host) có người xin hoàn tác / nhờ duyệt lời đòi bị từ chối. */
export type Task =
  | { kind: 'ask'; id: ID; at: number; req: CandyRequest }
  | { kind: 'undo'; id: ID; at: number; undo: UndoRequest }
  | { kind: 'judge'; id: ID; at: number; req: CandyRequest }

const oldestFirst = <T extends { at: number }>(list: T[]) => [...list].sort((a, b) => a.at - b.at)

/** Trung tâm yêu cầu: người khác đòi mình — mình cần trả lời. */
export function incomingAsks(session: Session, me: ID | undefined): Task[] {
  if (!me) return []
  return oldestFirst(session.requests.filter((r) => r.from === me && !r.status)).map((req) => ({ kind: 'ask', id: req.id, at: req.at, req }))
}

/** Trung tâm yêu cầu: mình đang đòi người khác — chờ họ, bị từ chối, đang nhờ host… (đến khi mình xóa). */
export function outgoingAsks(session: Session, me: ID | undefined): CandyRequest[] {
  if (!me) return []
  return oldestFirst(session.requests.filter((r) => r.to === me))
}

/** Trung tâm yêu cầu: lời đòi mình đã từ chối — vẫn ghi lại (còn đến khi người đòi xóa hoặc mình đổi ý trả). */
export function declinedByMe(session: Session, me: ID | undefined): CandyRequest[] {
  if (!me) return []
  return oldestFirst(session.requests.filter((r) => r.from === me && !!r.status)).reverse()
}

/** Task host: yêu cầu hoàn tác + lời đòi bị từ chối được nhờ host duyệt (chỉ host trả lời được). */
export function hostTasks(session: Session, me: ID | undefined): Task[] {
  if (!me || me !== session.hostId) return []
  return oldestFirst([
    ...session.undos.map((undo): Task => ({ kind: 'undo', id: undo.id, at: undo.at, undo })),
    ...session.requests
      .filter((r) => r.status === 'escalated')
      .map((req): Task => ({ kind: 'judge', id: req.id, at: req.answeredAt ?? req.at, req })),
  ])
}

/** Việc mình cần làm với lời đòi của chính mình: bị từ chối (nhờ host hoặc xóa) / host từ chối (xóa). */
export function answeredAsks(session: Session, me: ID | undefined): CandyRequest[] {
  return outgoingAsks(session, me).filter((r) => r.status === 'declined' || r.status === 'rejected')
}

/** Task host: yêu cầu hoàn tác của mình đang chờ host. */
export function myUndos(session: Session, me: ID | undefined): UndoRequest[] {
  if (!me || me === session.hostId) return []
  return oldestFirst(session.undos.filter((u) => u.by === me))
}

/** Host theo dõi: lời đòi giữa những người khác còn chờ xác nhận. */
export function othersPending(session: Session, me: ID | undefined): CandyRequest[] {
  if (!me || me !== session.hostId) return []
  return oldestFirst(session.requests.filter((r) => r.from !== me && r.to !== me && !r.status))
}

/** Mọi việc mình cần trả lời, cũ nhất trước. */
export function tasksFor(session: Session, me: ID | undefined): Task[] {
  return oldestFirst([...incomingAsks(session, me), ...hostTasks(session, me)])
}

export function answerTask(task: Task, accept: boolean): string[] {
  if (task.kind === 'ask') return actions().answerRequest(task.id, accept)
  if (task.kind === 'judge') return actions().judgeRequest(task.id, accept)
  return actions().answerUndo(task.id, accept)
}

/** Chữ nút đồng ý. */
export const okLabel = (task: Task) =>
  task.kind === 'ask' ? `OK, chuyển ${task.req.amount}` : task.kind === 'judge' ? `Duyệt, chuyển ${task.req.amount}` : 'OK, hoàn tác'

/** Yêu cầu gốc của một việc (để biết lần nhắc). */
export const requestOf = (task: Task) => (task.kind === 'undo' ? task.undo : task.req)
