import { useState } from 'react'
import { useNavigate } from 'react-router'
import { actions } from '../../store'
import { EMOJIS } from '../../store/appStore'
import { Button, Card, Errors, SectionTitle, TopBar } from '../components/kit'

interface Draft {
  name: string
  emoji: string
}

export function NewSession() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [defaultName] = useState(() => `Buổi ${new Date().toLocaleDateString('vi-VN')}`)
  const [players, setPlayers] = useState<Draft[]>([
    { name: '', emoji: EMOJIS[0] },
    { name: '', emoji: EMOJIS[1] },
  ])
  const [errors, setErrors] = useState<string[]>([])

  const update = (i: number, patch: Partial<Draft>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const nextEmoji = (emoji: string) => EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length]

  const start = () => {
    const named = players.filter((p) => p.name.trim())
    const errs: string[] = []
    if (named.length < 2) errs.push('Cần ít nhất 2 người chơi có tên.')
    const names = named.map((p) => p.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) errs.push('Hai người chơi đang trùng tên.')
    setErrors(errs)
    if (errs.length) return
    const id = actions().createSession(name || defaultName, named)
    navigate(`/s/${id}`, { replace: true })
  }

  return (
    <main>
      <TopBar title="Buổi mới" back="/" />

      <Card>
        <label className="block text-sm text-muted" htmlFor="session-name">
          Tên buổi
        </label>
        <input
          id="session-name"
          className="mt-1 w-full rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
          placeholder={defaultName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      <Card className="mt-3">
        <SectionTitle aside={<span className="text-sm text-muted">{players.filter((p) => p.name.trim()).length} người</span>}>
          Người chơi
        </SectionTitle>
        <ul className="space-y-2">
          {players.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Đổi biểu tượng"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-plum-2 text-2xl"
                onClick={() => update(i, { emoji: nextEmoji(p.emoji) })}
              >
                {p.emoji}
              </button>
              <input
                aria-label={`Tên người chơi ${i + 1}`}
                className="min-w-0 flex-1 rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
                placeholder={`Người chơi ${i + 1}`}
                value={p.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <button
                type="button"
                aria-label="Bỏ người này"
                className="px-2 text-muted hover:text-berry"
                onClick={() => setPlayers((ps) => ps.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <Button
          className="mt-3 w-full"
          onClick={() => setPlayers((ps) => [...ps, { name: '', emoji: EMOJIS[ps.length % EMOJIS.length] }])}
        >
          + Thêm người chơi
        </Button>
      </Card>


      <div className="mt-4">
        <Errors errors={errors} />
      </div>
      <Button variant="primary" className="font-display mt-4 w-full py-3.5 text-xl" onClick={start}>
        Bắt đầu chơi
      </Button>
    </main>
  )
}
