import { useState } from 'react'
import type { Session } from '../../core/types'
import { playerMap, roundNumber, timeOf } from '../format'
import { answerTask, okLabel, requestOf, type Task } from '../tasks'
import { Button, Who } from './kit'

/** Nội dung một việc — dùng chung cho thông báo trên cùng và các màn Host / Yêu cầu. */
export function TaskSummary({ session, task }: { session: Session; task: Task }) {
  const players = playerMap(session)
  const gameId = requestOf(task).gameId
  const game = session.games.find((g) => g.id === gameId)

  if (task.kind === 'ask') {
    const { req } = task
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="text-3xl">
          {players[req.to]?.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight font-bold">
            <span className="text-sky">{players[req.to]?.name}</span> đòi bạn{' '}
            <span className="candy num text-base">{req.amount}</span>
          </div>
          <div className="text-xs text-muted">
            {game?.name} · {timeOf(req.at)}
            {!!req.pings && <span className="ml-1.5 font-bold text-lemon">🔔 nhắc lần {req.pings}</span>}
          </div>
        </div>
      </div>
    )
  }

  if (task.kind === 'judge') {
    const { req } = task
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="text-3xl">
          ⚖️
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight font-bold">
            <span className="text-sky">{players[req.to]?.name}</span> nhờ host: đòi <span className="text-sky">{players[req.from]?.name}</span>{' '}
            <span className="candy num text-base">{req.amount}</span>
          </div>
          <div className="text-xs text-muted">
            {players[req.from]?.name} đã từ chối · {game?.name} · {timeOf(req.answeredAt ?? req.at)}
            {!!req.pings && <span className="ml-1.5 font-bold text-lemon">🔔 nhắc lần {req.pings}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="text-3xl">
        ↩️
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg leading-tight font-bold">
          <span className="text-sky">{players[task.undo.by]?.name}</span> muốn hoàn tác
          {!!task.undo.pings && <span className="ml-1.5 text-xs font-bold text-lemon">🔔 nhắc lần {task.undo.pings}</span>}
        </div>
        <UndoDetail session={session} undo={task.undo} />
      </div>
    </div>
  )
}

/** Lượt kéo được xin hoàn tác: A → B [N] · game · ván · giờ. */
export function UndoDetail({ session, undo }: { session: Session; undo: Extract<Task, { kind: 'undo' }>['undo'] }) {
  const players = playerMap(session)
  const game = session.games.find((g) => g.id === undo.gameId)
  const round = game?.rounds.find((r) => r.id === undo.roundId)
  const move = round?.moves.find((m) => m.id === undo.moveId)
  return (
    <>
      {move ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
          <Who chip player={players[move.from]} className="font-semibold text-sky" />→
          <Who chip player={players[move.to]} className="font-semibold text-sky" />
          <span className="candy num text-sm">{move.amount}</span>
        </div>
      ) : (
        <div className="text-sm text-muted">Lượt này đã bị xóa.</div>
      )}
      <div className="text-xs text-muted">
        {game?.name}
        {round && (round.kind === 'manual' ? ' · Chuyển tay' : ` · Ván ${roundNumber(game!, round)}`)} · {timeOf(undo.at)}
      </div>
    </>
  )
}

/** Thẻ việc có nút Không / OK. */
export function TaskCard({ session, task }: { session: Session; task: Task }) {
  const [error, setError] = useState<string | null>(null)
  const answer = (accept: boolean) => setError(answerTask(task, accept)[0] ?? null)
  return (
    <li className="pop rounded-2xl border border-line/60 bg-plum p-3">
      <TaskSummary session={session} task={task} />
      {error && <p className="mt-1.5 text-xs text-berry">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button variant="danger" className="py-1.5 text-sm" onClick={() => answer(false)}>
          Không
        </Button>
        <Button variant="primary" className="flex-1 py-1.5 text-sm" onClick={() => answer(true)}>
          {okLabel(task)}
        </Button>
      </div>
    </li>
  )
}
