import { useNavigate, useParams } from 'react-router'
import { actions } from '../../store'
import { GameIcon } from '../components/GameIcon'
import { ask } from '../dialog'
import { Button, Card, TopBar } from '../components/kit'
import { useSession } from '../components/useSession'

export function GameSettings() {
  const session = useSession()
  const { gid } = useParams()
  const navigate = useNavigate()
  const game = session.games.find((g) => g.id === gid)
  if (!game) return <p className="pt-24 text-center text-muted">Không tìm thấy game.</p>

  const back = `/s/${session.id}?g=${game.id}`

  const removeGame = async () => {
    const msg = game.rounds.length ? `Cùng ${game.rounds.length} ván đã chơi — lời/lỗ sẽ được tính lại.` : undefined
    if (!(await ask(`Xóa ${game.name}?`, { icon: '🗑️', message: msg, okLabel: 'Xóa', danger: true }))) return
    actions().removeGame(game.id)
    navigate(`/s/${session.id}`, { replace: true })
  }

  return (
    <main>
      <TopBar title={<><GameIcon type={game.type} /> Cài đặt game</>} back={back} />

      <Card>
        <label htmlFor="game-name" className="text-sm text-muted">
          Tên game
        </label>
        <input
          id="game-name"
          className="mt-1 w-full rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
          defaultValue={game.name}
          onBlur={(e) => e.target.value.trim() && actions().renameGame(game.id, e.target.value.trim())}
        />
      </Card>

      <p className="mt-3 text-sm text-muted">
        Khi trả kẹo, app gợi ý 3 mức: cược × 1, × 1,5 và × 2 (Xì dách lấy cược của người con, Poker lấy số kẹo cần theo).
      </p>

      <Button variant="danger" className="mt-6 w-full" onClick={removeGame}>
        Xóa game này
      </Button>
    </main>
  )
}
