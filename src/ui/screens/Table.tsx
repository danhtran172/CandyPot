import { Link, useNavigate, useSearchParams } from 'react-router'
import { GAME_ICONS, GAME_ORDER, GAMES } from '../../core/games'
import { handOf, netOf, renewCount } from '../../core/ledger'
import type { GameType } from '../../core/types'
import { actions } from '../../store'
import { useSession } from '../components/useSession'
import { Button, Card, Chip, SectionTitle, TopBar } from '../components/kit'
import { playCount, signed, toneOf } from '../format'

export function Table() {
  const session = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const game = session.games.find((g) => g.id === params.get('g')) ?? session.games[session.games.length - 1]
  const net = netOf(session)
  const base = `/s/${session.id}`

  const addGame = (type: GameType) => {
    const id = actions().addGame(type)
    setParams({ g: id }, { replace: true })
  }

  const renew = (playerId: string, name: string) => {
    if (confirm(`${name} renew thêm ${session.settings.packSize} kẹo?`)) actions().renew(playerId)
  }

  return (
    <main className="pb-24">
      <TopBar
        title={session.name}
        back="/"
        right={
          <Link to={`${base}/players`} className="rounded-full bg-plum-2 px-3 py-1.5 text-sm font-semibold">
            👥 Người chơi
          </Link>
        }
      />

      <div className="flex items-center gap-2">
        <nav aria-label="Game" className="no-scrollbar -ml-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pl-4">
          {session.games.map((g) => (
            <Chip key={g.id} active={g.id === game?.id} onClick={() => setParams({ g: g.id }, { replace: true })}>
              {GAME_ICONS[g.type]} {g.name}
            </Chip>
          ))}
        </nav>
        {session.games.length > 0 && (
          <details className="relative shrink-0">
            <summary className="cursor-pointer list-none rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-muted">
              + Game
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 space-y-1 rounded-2xl border border-line bg-plum-2 p-2 shadow-xl">
              {GAME_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-plum"
                  onClick={(e) => {
                    ;(e.currentTarget.closest('details') as HTMLDetailsElement).open = false
                    addGame(t)
                  }}
                >
                  {GAME_ICONS[t]} {GAMES[t].label}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {!game ? (
        <Card className="mt-4 text-center">
          <p className="font-display text-xl font-bold">Chơi game gì trước?</p>
          <p className="mt-1 text-sm text-muted">Một buổi có thể chơi nhiều game, thêm game khác lúc nào cũng được.</p>
          <div className="mt-4 grid gap-2">
            {GAME_ORDER.map((t) => (
              <Button key={t} className="py-3 text-lg" onClick={() => addGame(t)}>
                {GAME_ICONS[t]} {GAMES[t].label}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="mt-2 flex items-center justify-between text-sm text-muted">
          <span>
            {playCount(game) ? `Đã chơi ${playCount(game)} ván` : 'Chưa có ván nào'}
          </span>
          <Link to={`${base}/g/${game.id}/settings`} className="font-semibold text-muted underline-offset-4 hover:underline">
            ⚙ Luật & cài đặt
          </Link>
        </div>
      )}

      <Card className="mt-3 p-2">
        <div className="px-2 pt-2">
          <SectionTitle aside={<span className="text-xs text-muted">lời/lỗ cả buổi</span>}>Bàn</SectionTitle>
        </div>
        <ul>
          {session.players
            .filter((p) => p.active || net[p.id] !== 0)
            .map((p) => {
              const hand = handOf(session, p.id, net)
              const renews = renewCount(session, p.id)
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 odd:bg-night/30">
                  <span aria-hidden className="text-2xl">
                    {p.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-xs text-muted">
                      🍬 <span className="num">{hand}</span> trên tay
                      {renews > 0 && <span className="ml-1.5">· ♻️ {renews}</span>}
                    </div>
                  </div>
                  <span className={`num font-display text-2xl font-extrabold ${toneOf(net[p.id])}`}>{signed(net[p.id])}</span>
                  <button
                    type="button"
                    onClick={() => renew(p.id, p.name)}
                    className={`rounded-xl px-2 py-1 text-xs font-bold ${
                      hand <= 0 ? 'bg-lemon text-night' : 'border border-line text-muted'
                    }`}
                  >
                    Renew
                  </button>
                </li>
              )
            })}
        </ul>
      </Card>

      {game && (
        <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-lg gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
          <Button
            variant="primary"
            className="font-display flex-1 py-3.5 text-xl"
            onClick={() => navigate(`${base}/g/${game.id}/round`)}
          >
            + Ván mới
          </Button>
          <Button className="px-4" onClick={() => navigate(`${base}/g/${game.id}/manual`)}>
            ⇄ Chuyển tay
          </Button>
        </div>
      )}
    </main>
  )
}
