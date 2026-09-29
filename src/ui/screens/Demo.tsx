import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { actions, repo } from '../../store'
import { writeMe, writeWindowMe } from '../me'

const DEMO_KEY = 'candypot:demo:v2'

const PLAYERS = [
  { name: 'Minh', emoji: '🐱' },
  { name: 'An', emoji: '🐶' },
  { name: 'Bình', emoji: '🐸' },
  { name: 'Cường', emoji: '🐼' },
  { name: 'Dũng', emoji: '🦊' },
  { name: 'Em', emoji: '🐯' },
]

/**
 * Buổi mẫu 6 người (bạn là Minh) đang mở sẵn một ván Xì dách.
 * `?as=1` mở cửa sổ này dưới vai người thứ 2 (An) để giả lập máy của người khác.
 */
function seedDemo(): { sessionId: string; gameId: string } {
  const a = actions()
  const sessionId = a.createSession('Demo 6 người', PLAYERS)
  const ids = actions().session!.players.map((p) => p.id)
  writeMe(sessionId, ids[0])
  a.addGame('tienlen')
  a.addGame('poker')
  const gameId = a.addGame('xidach')
  a.openRound(gameId, {
    participants: ids,
    bet: 5,
    stakes: Object.fromEntries(ids.map((id, i) => [id, [5, 5, 10, 5, 2, 5][i]])),
    dealer: ids[1],
  })
  try {
    localStorage.setItem(DEMO_KEY, sessionId)
  } catch {
    // Không lưu được thì lần sau tạo demo mới
  }
  return { sessionId, gameId }
}

export function Demo() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let existing: string | null = null
    try {
      existing = params.get('reset') ? null : localStorage.getItem(DEMO_KEY)
    } catch {
      existing = null
    }
    const as = Number(params.get('as'))
    const playAs = (sessionId: string) => {
      const player = repo.load(sessionId)?.players[as]
      if (as > 0 && player) writeWindowMe(sessionId, player.id)
    }
    if (existing && repo.load(existing)) {
      playAs(existing)
      navigate(`/s/${existing}`, { replace: true })
      return
    }
    const { sessionId, gameId } = seedDemo()
    playAs(sessionId)
    navigate(`/s/${sessionId}?g=${gameId}`, { replace: true })
  }, [navigate, params])

  return <p className="pt-24 text-center text-muted">Đang dựng bàn demo…</p>
}
