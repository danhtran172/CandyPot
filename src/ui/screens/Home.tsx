import { useState } from 'react'
import { Link } from 'react-router'
import { appStore, repo } from '../../store'
import { ask } from '../dialog'
import { dateOf } from '../format'
import { QrModal } from '../components/QrModal'
import { appUrl } from '../appUrl'
import { MAX_SAVED } from '../../storage/LocalRepo'
import type { SessionMeta } from '../../storage/SessionRepo'
import soloIcon from '../../assets/mode-solo.webp'
import multiIcon from '../../assets/mode-multi.webp'

/** Danh sách bàn thu gọn: hiện chừng này bàn gần nhất, còn lại bấm "Xem thêm". */
const COLLAPSED = 3

/** 3 lý do dùng app thay cho tiền mặt / ghi giấy — hiện ngay dưới tên app. */
const BENEFITS = [
  { icon: '🧾', title: 'Hết cảnh "ván đó tao thắng mà"', text: 'Ván nào cũng lưu, ai cũng xem lại được.' },
  { icon: '⚡', title: 'Tàn cuộc 1 phút là xong', text: 'App gom nợ chéo còn ít lượt trả nhất.' },
  { icon: '🍬', title: 'Không tiền trên bàn', text: 'Khỏi đổi tiền lẻ, chơi vui mà không sát phạt.' },
]

export function Home() {
  const [sessions, setSessions] = useState(() => repo.list())
  const [showQr, setShowQr] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? sessions : sessions.slice(0, COLLAPSED)

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
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-6xl leading-none font-extrabold tracking-tight">
          Candy<span className="text-lemon">Pot</span>
        </h1>
        <button
          type="button"
          aria-label="Mã QR mở app cho người khác"
          onClick={() => setShowQr(true)}
          className="mt-1 grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-plum-2 text-muted active:scale-95"
        >
          <QrIcon />
        </button>
      </div>
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

      <h2 className="font-display mt-10 mb-3 flex items-baseline justify-between text-lg font-bold">
        Bàn đã chơi
        {sessions.length > 0 && <span className="font-sans text-xs font-normal text-muted">giữ {MAX_SAVED} bàn gần nhất</span>}
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Chưa có bàn nào. Tạo bàn để bắt đầu ghi kẹo.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-3xl border border-line/60 bg-plum p-2 pl-4">
              <Link to={`/s/${s.id}`} className="min-w-0 flex-1 py-2">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="flex items-center text-sm text-muted">
                  {s.playerCount} người{s.updatedAt ? ` · ${dateOf(s.updatedAt)}` : ''}
                  <ModeTag meta={s} />
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
      {sessions.length > COLLAPSED && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((x) => !x)}
          className="mt-2 w-full rounded-2xl py-2 text-sm font-semibold text-sky"
        >
          {expanded ? 'Thu gọn ▴' : `Xem thêm ${sessions.length - COLLAPSED} bàn ▾`}
        </button>
      )}
      {showQr && (
        <QrModal
          title="Quét để mở CandyPot"
          subtitle="Mở bằng camera điện thoại"
          url={appUrl()}
          onClose={() => setShowQr(false)}
          footer={<p className="mt-2 text-sm font-semibold text-sky">{new URL(appUrl()).host}</p>}
        />
      )}
    </main>
  )
}

/**
 * Nhãn kiểu bàn: nhiều người = xanh + icon nhóm + mã bàn; một máy = cam, chỉ icon người cầm máy.
 * (Bàn lưu từ bản cũ chưa có `mode`: có mã = nhiều người.)
 */
function ModeTag({ meta }: { meta: SessionMeta }) {
  const multi = (meta.mode ?? (meta.code ? 'multi' : 'solo')) === 'multi'
  const mask = `url(${multi ? multiIcon : soloIcon}) center / contain no-repeat`
  return (
    <span
      title={multi ? 'Bàn nhiều người' : 'Bàn một máy'}
      className={`num ml-1.5 inline-flex items-center gap-1 rounded-full py-0.5 text-xs font-bold ${
        multi ? 'bg-sky/15 px-1.5 text-sky' : 'bg-orange-400/15 px-1 text-orange-400'
      }`}
    >
      <span role="img" aria-label={multi ? 'Nhiều người' : 'Một máy'} className="size-3.5 bg-current" style={{ mask, WebkitMask: mask }} />
      {multi && meta.code && `#${meta.code}`}
    </span>
  )
}

/** Biểu tượng mã QR (3 ô vuông góc + chấm). */
function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h.01M17.5 20.5h3v-3" strokeLinecap="round" />
    </svg>
  )
}
