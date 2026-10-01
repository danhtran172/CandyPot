import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { actions, useApp } from '../../store'
import { RequestInbox } from './RequestInbox'
import { WhoAmI } from './WhoAmI'
import { PotAwardNotice } from './PotAwardNotice'
import { ReawardSheet } from './ReawardSheet'
import { readMe } from '../me'
import navTable from '../../assets/nav/table.webp'
import navSummary from '../../assets/nav/summary.webp'
import navHistory from '../../assets/nav/history.webp'
import navTitles from '../../assets/nav/titles.webp'

const TABS = [
  { to: '', label: 'Bàn chơi', icon: navTable },
  { to: 'summary', label: 'Sổ nợ', icon: navSummary },
  { to: 'history', label: 'Lịch sử', icon: navHistory },
  { to: 'titles', label: 'Danh hiệu', icon: navTitles },
]

/** Nạp buổi theo URL, hiện thanh điều hướng dưới cùng. */
export function SessionLayout() {
  const { sid } = useParams()
  const session = useApp((s) => s.session)
  const error = useApp((s) => s.error)
  const online = useApp((s) => s.online)
  const paused = useApp((s) => s.paused)
  const [, setPicked] = useState(0)
  const { pathname } = useLocation()
  const loaded = session?.id === sid
  const navigate = useNavigate()

  useEffect(() => {
    if (sid && !loaded) actions().openSession(sid)
  }, [sid, loaded])

  // Bàn nhiều người: báo "đang mở bàn" (chấm xanh) khi máy này đã chọn mình là ai; rời bàn thì thôi
  const meHere = loaded && session?.mode === 'multi' ? readMe(session.id) : null
  const presentAs = session?.players.some((p) => p.id === meHere && !p.removed) ? (meHere ?? undefined) : undefined
  useEffect(() => {
    actions().markPresent(presentAs)
  }, [presentAs, session?.code])
  useEffect(() => () => actions().markPresent(undefined), [])

  // Cửa sổ khác (cùng máy) vừa sửa buổi này → nạp lại để thấy ngay
  useEffect(() => {
    if (!sid) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === `candypot:session:${sid}`) actions().openSession(sid)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [sid])

  if (!loaded || !session) {
    return (
      <div className="pt-24 text-center text-muted">
        <p>Không tìm thấy bàn chơi này trên máy.</p>
        <Link to="/" className="mt-4 inline-block text-lemon underline">
          Về trang chủ
        </Link>
      </div>
    )
  }

  const showNav = !/\/g\//.test(pathname) && !pathname.endsWith('/players')
  const multi = session.mode === 'multi' && !!session.code
  // Bàn nhiều người, máy này chưa chọn mình là ai (vừa join) → hỏi trước
  const me = readMe(session.id)
  const needWho = multi && !session.players.some((p) => p.id === me && !p.removed)
  return (
    <>
      {multi && paused && (
        <div role="status" className="mt-3 rounded-2xl border border-sky/50 bg-sky/10 p-2.5 text-center text-xs font-semibold text-sky">
          💤 Tạm ngắt kết nối vì lâu không dùng — chạm vào màn hình để nối lại.
        </div>
      )}
      {multi && !paused && online === false && (
        <div role="status" className="mt-3 rounded-2xl border border-lemon/50 bg-lemon/10 p-2.5 text-center text-xs font-semibold text-lemon">
          📡 Mất kết nối — đang hiện dữ liệu cũ, thay đổi sẽ gửi khi có mạng lại.
        </div>
      )}
      {needWho && <WhoAmI session={session} onDone={() => setPicked((n) => n + 1)} />}
      {error && (
        <div role="alert" className="mt-3 rounded-2xl border border-berry/50 bg-berry/15 p-3 text-sm text-berry">
          {error}
        </div>
      )}
      <Outlet />
      {/* Trao pot cho ai → cả bàn thấy thông báo */}
      <PotAwardNotice session={session} />
      {/* Host hoàn tác trao pot của ván đã xong → chọn lại người nhận */}
      <ReawardSheet session={session} />
      {!/\/(host|requests)$/.test(pathname) && (
        <RequestInbox session={session} onOpenAll={(tab) => navigate(`/s/${sid}/${tab}`)} />
      )}
      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line/60 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur land:inset-x-auto land:inset-y-0 land:right-0 land:flex land:w-[calc(5rem+env(safe-area-inset-right))] land:items-center land:border-t-0 land:border-l land:pr-[env(safe-area-inset-right)] land:pb-0">
          {/* Xoay ngang: cột dọc bên phải */}
          <ul className="mx-auto grid max-w-lg grid-cols-4 land:w-full land:grid-cols-1 land:gap-3">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to ? `/s/${sid}/${t.to}` : `/s/${sid}`}
                  end
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-2 text-xs font-semibold transition-opacity ${isActive ? 'text-lemon' : 'text-muted opacity-60'}`
                  }
                >
                  {/* Icon cắt sát viền, vuông 96px → hiển thị 24px cho cả 4 tab đều nhau */}
                  <img src={t.icon} alt="" aria-hidden draggable={false} className="size-6 object-contain" />
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
