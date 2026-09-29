import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { actions, useApp } from '../../store'
import { RequestInbox } from './RequestInbox'

const TABS = [
  { to: '', label: 'Bàn chơi', icon: '🃏' },
  { to: 'summary', label: 'Tổng kết', icon: '🍬' },
  { to: 'history', label: 'Lịch sử', icon: '📜' },
  { to: 'titles', label: 'Danh hiệu', icon: '👑' },
]

/** Nạp buổi theo URL, hiện thanh điều hướng dưới cùng. */
export function SessionLayout() {
  const { sid } = useParams()
  const session = useApp((s) => s.session)
  const error = useApp((s) => s.error)
  const { pathname } = useLocation()
  const loaded = session?.id === sid
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
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to ? `/s/${sid}/${t.to}` : `/s/${sid}`}
                  end
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${isActive ? 'text-lemon' : 'text-muted'}`
                  }
                >
                  <span aria-hidden className="text-lg leading-none">
                    {t.icon}
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
