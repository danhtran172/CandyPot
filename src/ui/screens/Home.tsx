import { useState } from 'react'
import { Link } from 'react-router'
import { appStore, repo } from '../../store'
import { ask } from '../dialog'
import { dateOf } from '../format'

/** 3 lý do dùng app thay cho tiền mặt / ghi giấy — hiện ngay dưới tên app. */
const BENEFITS = [
  { icon: '🧾', title: 'Hết cảnh "ván đó tao thắng mà"', text: 'Ván nào cũng lưu, ai cũng xem lại được.' },
  { icon: '⚡', title: 'Tàn cuộc 1 phút là xong', text: 'App gom nợ chéo còn ít lượt trả nhất.' },
  { icon: '🍬', title: 'Không tiền trên bàn', text: 'Khỏi đổi tiền lẻ, chơi vui mà không sát phạt.' },
]

export function Home() {
  const [sessions, setSessions] = useState(() => repo.list())

  const remove = async (id: string, name: string) => {
    const ok = await ask(`Xóa bàn "${name}"?`, {
      icon: '🗑️',
      message: 'Toàn bộ lịch sử của bàn này sẽ mất.',
      okLabel: 'Xóa',
      danger: true,
    })
    if (!ok) return
    appStore.getState().deleteSession(id)
    setSessions(repo.list())
  }

  return (
    <main className="pt-12">
      <h1 className="font-display text-6xl leading-none font-extrabold tracking-tight">
        Candy<span className="text-lemon">Pot</span>
      </h1>
      <p className="mt-2 text-muted">Sổ ghi kẹo cho bàn bài của nhóm bạn.</p>

      <ul className="mt-5 space-y-3">
        {BENEFITS.map((b) => (
          <li key={b.icon} className="flex gap-3">
            <span aria-hidden className="text-2xl leading-none">
              {b.icon}
            </span>
            <span className="leading-tight">
              <b className="block">{b.title}</b>
              <span className="text-sm text-muted">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-[1fr_auto] gap-2">
        <Link
          to="/new"
          className="font-display flex items-center justify-center rounded-3xl bg-lemon py-4 text-2xl font-extrabold text-night shadow-[inset_0_-5px_0_rgb(0_0_0/0.18)]"
        >
          + Tạo bàn
        </Link>
        <Link
          to="/join"
          className="font-display flex items-center justify-center rounded-3xl border-2 border-sky/60 px-5 text-lg font-bold text-sky"
        >
          Join bàn
        </Link>
      </div>

      <h2 className="font-display mt-10 mb-3 text-lg font-bold">Bàn đã chơi</h2>
      {sessions.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Chưa có bàn nào. Tạo bàn để bắt đầu ghi kẹo.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-3xl border border-line/60 bg-plum p-2 pl-4">
              <Link to={`/s/${s.id}`} className="min-w-0 flex-1 py-2">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="text-sm text-muted">
                  {s.playerCount} người · {dateOf(s.updatedAt)}
                  {s.code && <span className="num ml-1.5 rounded-full bg-sky/15 px-1.5 text-xs font-bold text-sky">#{s.code}</span>}
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Xóa bàn ${s.name}`}
                className="rounded-full px-3 py-2 text-muted hover:text-berry"
                onClick={() => remove(s.id, s.name)}
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
