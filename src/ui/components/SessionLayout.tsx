import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { actions, useApp } from '../../store'
import { useMe } from '../me'
import { hostTasks, incomingAsks } from '../tasks'
import { RequestInbox } from './RequestInbox'

const TABS = [
  { to: '', label: 'Bàn chơi', icon: '🃏' },
  { to: 'summary', label: 'Tổng kết', icon: '🍬' },
  { to: 'history', label: 'Lịch sử', icon: '📜' },
  { to: 'titles', label: 'Danh hiệu', icon: '👑' },
  { to: 'host', label: 'Host', icon: '🛎️' },
  { to: 'requests', label: 'Yêu cầu', icon: '📨' },
] as const

/** Nạp buổi theo URL, hiện thanh điều hướng dưới cùng. */
export function SessionLayout() {
  const { sid } = useParams()
  const session = useApp((s) => s.session)
  const error = useApp((s) => s.error)
  const { pathname } = useLocation()
  const loaded = session?.id === sid
  const [me] = useMe(session)
  const navigate = useNavigate()

  useEffect(() => {
    if (sid && !loaded) actions().openSession(sid)
  }, [sid, loaded])

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
        <p>Không tìm thấy buổi chơi này trên máy.</p>
        <Link to="/" className="mt-4 inline-block text-lemon underline">
          Về trang chủ
        </Link>
      </div>
    )
  }

  const showNav = !/\/g\//.test(pathname) && !pathname.endsWith('/players')
  // Số việc cần mình trả lời, hiện trên tab
  const badges: Partial<Record<(typeof TABS)[number]['to'], number>> = {
    host: hostTasks(session, me).length,
    requests: incomingAsks(session, me).length,
  }

  return (
    <>
      {error && (
        <div role="alert" className="mt-3 rounded-2xl border border-berry/50 bg-berry/15 p-3 text-sm text-berry">
          {error}
        </div>
      )}
      <Outlet />
      {!/\/(host|requests)$/.test(pathname) && (
        <RequestInbox session={session} onOpenAll={(tab) => navigate(`/s/${sid}/${tab}`)} />
      )}
      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line/60 bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <ul className="mx-auto grid max-w-lg grid-cols-6">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to ? `/s/${sid}/${t.to}` : `/s/${sid}`}
                  end
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold whitespace-nowrap ${isActive ? 'text-lemon' : 'text-muted'}`
                  }
                >
                  <span aria-hidden className="relative text-lg leading-none">
                    {t.icon}
                    {!!badges[t.to] && (
                      <span className="num absolute -top-1.5 -right-3 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-berry px-1 text-[10px] font-bold text-night">
                        {badges[t.to]}
                      </span>
                    )}
                  </span>
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
