import { useState } from 'react'
import { actions } from '../../store'
import { EMOJIS, isPlayerUsed } from '../../store/appStore'
import { useSession } from '../components/useSession'
import { Button, Card, Chip, Errors, SectionTitle, TopBar } from '../components/kit'

export function Players() {
  const session = useSession()
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const nextEmoji = (emoji: string) => EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length]
  const nameTaken = (n: string, except?: string) =>
    session.players.some((p) => p.id !== except && p.name.toLowerCase() === n.trim().toLowerCase())

  const add = () => {
    if (!name.trim()) return setErrors(['Nhập tên người chơi.'])
    if (nameTaken(name)) return setErrors(['Tên này đã có trong buổi.'])
    actions().addPlayer(name, EMOJIS[session.players.length % EMOJIS.length])
    setName('')
    setErrors([])
  }

  const remove = (id: string, playerName: string) => {
    if (confirm(`Bỏ ${playerName} khỏi buổi?`)) actions().removePlayer(id)
  }

  return (
    <main>
      <TopBar title="Người chơi" back={`/s/${session.id}`} />
      <p className="mb-3 text-sm text-muted">
        Người đã chơi không xóa được. Hãy tạm nghỉ họ; lời/lỗ của họ vẫn được giữ và tính khi trả kẹo.
      </p>

      <Card className="p-2">
        <ul>
          {session.players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-2 py-2">
              <button
                type="button"
                aria-label="Đổi biểu tượng"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-plum-2 text-xl"
                onClick={() => actions().updatePlayer(p.id, { emoji: nextEmoji(p.emoji) })}
              >
                {p.emoji}
              </button>
              <input
                aria-label={`Tên ${p.name}`}
                className={`min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-2 font-semibold outline-none focus:border-lemon ${
                  p.active ? '' : 'text-muted line-through'
                }`}
                defaultValue={p.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && !nameTaken(v, p.id)) actions().updatePlayer(p.id, { name: v })
                  else e.target.value = p.name
                }}
              />
              {isPlayerUsed(session, p.id) ? (
                <Chip active={!p.active} tone="grape" onClick={() => actions().updatePlayer(p.id, { active: !p.active })}>
                  {p.active ? 'Tạm nghỉ' : 'Đang nghỉ'}
                </Chip>
              ) : (
                <button type="button" className="px-2 text-muted hover:text-berry" onClick={() => remove(p.id, p.name)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-3">
        <SectionTitle>Thêm người</SectionTitle>
        <div className="flex gap-2">
          <input
            aria-label="Tên người mới"
            className="min-w-0 flex-1 rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
            placeholder="Tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button variant="primary" onClick={add}>
            Thêm
          </Button>
        </div>
        <div className="mt-2">
          <Errors errors={errors} />
        </div>
      </Card>


    </main>
  )
}
