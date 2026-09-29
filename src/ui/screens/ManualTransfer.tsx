import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { ID } from '../../core/types'
import { actions } from '../../store'
import { useSession } from '../components/useSession'
import { Button, Card, Chip, Errors, SectionTitle, Stepper, TopBar, Who } from '../components/kit'

interface ManualInput {
  from: ID
  to: ID
  amount: number
  note: string
}

export function ManualTransfer() {
  const session = useSession()
  const { gid, rid } = useParams()
  const navigate = useNavigate()
  const game = session.games.find((g) => g.id === gid)
  const editing = game?.rounds.find((r) => r.id === rid && r.kind === 'manual')
  const back = `/s/${session.id}?g=${gid}`
  const [t, setT] = useState<ManualInput>(
    () => (editing?.input as ManualInput | undefined) ?? { from: '', to: '', amount: 1, note: '' },
  )
  const [errors, setErrors] = useState<string[]>([])

  if (!game) return <p className="pt-24 text-center text-muted">Không tìm thấy game.</p>

  const candidates = session.players.filter((p) => p.active || p.id === t.from || p.id === t.to)

  const save = () => {
    const errs = actions().saveManual(game.id, t, editing?.id)
    setErrors(errs)
    if (!errs.length) navigate(back, { replace: true })
  }

  const remove = () => {
    if (!editing || !confirm('Xóa lượt chuyển tay này?')) return
    actions().deleteRound(game.id, editing.id)
    navigate(back, { replace: true })
  }

  const picker = (field: 'from' | 'to') => (
    <div className="flex flex-wrap gap-1.5">
      {candidates.map((p) => (
        <Chip
          key={p.id}
          tone={field === 'from' ? 'berry' : 'mint'}
          active={t[field] === p.id}
          onClick={() => setT({ ...t, [field]: p.id })}
        >
          <Who player={p} />
        </Chip>
      ))}
    </div>
  )

  return (
    <main>
      <TopBar title="⇄ Chuyển tay" back={back} />
      <p className="mb-3 text-sm text-muted">
        Dùng cho mọi tình huống ngoài luật: phạt, thỏa thuận riêng, nhập bù… Lượt chuyển được tính vào {game.name}.
      </p>
      <Card>
        <SectionTitle>Ai đưa</SectionTitle>
        {picker('from')}
      </Card>
      <Card className="mt-3">
        <SectionTitle>Đưa cho ai</SectionTitle>
        {picker('to')}
      </Card>
      <Card className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Số kẹo</span>
          <Stepper value={t.amount} min={1} onChange={(amount) => setT({ ...t, amount })} label="số kẹo" />
        </div>
        <input
          aria-label="Ghi chú"
          className="w-full rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
          placeholder="Ghi chú (không bắt buộc)"
          value={t.note}
          onChange={(e) => setT({ ...t, note: e.target.value })}
        />
      </Card>
      <div className="mt-3">
        <Errors errors={errors} />
      </div>
      <div className="mt-4 flex gap-2">
        {editing && (
          <Button variant="danger" onClick={remove}>
            Xóa
          </Button>
        )}
        <Button variant="primary" className="font-display flex-1 py-3.5 text-xl" onClick={save}>
          {editing ? 'Lưu thay đổi' : 'Chuyển kẹo'}
        </Button>
      </div>
    </main>
  )
}
