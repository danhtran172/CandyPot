import { useState } from 'react'
import { useNavigate } from 'react-router'
import { actions } from '../../store'
import { MAX_PLAYERS } from '../../core/types'
import { EMOJIS } from '../../store/appStore'
import { Button, Card, Errors, SectionTitle, TopBar } from '../components/kit'

const MODES = [
  { value: 'solo', icon: '🙋', title: 'Một máy', hint: 'Host ghi hết cho cả bàn.' },
  { value: 'multi', icon: '📱', title: 'Nhiều người join', hint: 'Mỗi người vào bằng mã 5 số.' },
] as const

interface Draft {
  name: string
  emoji: string
}

export function NewSession() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [defaultName] = useState(() => `Bàn ${new Date().toLocaleDateString('vi-VN')}`)
  const [mode, setMode] = useState<'solo' | 'multi'>('solo')
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
    const id = actions().createSession(name || defaultName, named, mode)
    navigate(`/s/${id}`, { replace: true })
  }

  return (
    <main>
      <TopBar title="Tạo bàn" back="/" />

      <div className="mb-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kiểu bàn">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => setMode(m.value)}
            className={`flex flex-col items-start gap-1 rounded-3xl border-2 p-3 text-left transition ${
              mode === m.value ? 'border-lemon bg-lemon/10' : 'border-line bg-plum'
            }`}
          >
            <span className="text-2xl leading-none">{m.icon}</span>
            <span className="font-display leading-tight font-bold">{m.title}</span>
            <span className="text-xs text-muted">{m.hint}</span>
          </button>
        ))}
      </div>
      {mode === 'multi' && (
        <p className="mb-3 rounded-2xl border border-sky/40 bg-sky/10 px-3 py-2 text-xs">
          Bàn sẽ có <b>mã 5 số</b> để mọi người join từ máy mình. Kết nối nhiều máy sẽ có ở <b>giai đoạn 2</b> — hiện tại vẫn ghi
          trên máy này.
        </p>
      )}

      <Card>
        <label className="block text-sm text-muted" htmlFor="session-name">
          Tên bàn
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
          disabled={players.length >= MAX_PLAYERS}
          onClick={() => setPlayers((ps) => [...ps, { name: '', emoji: EMOJIS[ps.length % EMOJIS.length] }])}
        >
          {players.length >= MAX_PLAYERS ? `Tối đa ${MAX_PLAYERS} người` : '+ Thêm người chơi'}
        </Button>
      </Card>


      <div className="mt-4">
        <Errors errors={errors} />
      </div>
      <Button variant="primary" className="font-display mt-4 w-full py-3.5 text-xl" onClick={start}>
        Tạo bàn
      </Button>
    </main>
  )
}
