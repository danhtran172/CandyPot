import { useState } from 'react'
import { useNavigate } from 'react-router'
import { repo } from '../../store'
import { tell } from '../dialog'
import { Button, Card, TopBar } from '../components/kit'

/**
 * Join bàn bằng mã 5 số. Giai đoạn 1 chỉ mở được bàn có sẵn trên máy này;
 * join bàn của máy khác (qua mạng) chờ giai đoạn 2.
 */
export function JoinTable() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const join = async () => {
    const found = repo.list().find((s) => s.code === code)
    if (found) return navigate(`/s/${found.id}`)
    await tell('Chưa join được bàn này', {
      icon: '📡',
      message: 'Join bàn từ máy khác (qua mạng) sẽ có ở giai đoạn 2. Hiện tại chỉ mở được bàn tạo trên chính máy này.',
    })
  }

  return (
    <main>
      <TopBar title="Join bàn" back="/" />
      <Card className="text-center">
        <p className="text-sm text-muted">Nhập mã 5 số mà host đưa cho bạn.</p>
        <input
          aria-label="Mã bàn 5 số"
          inputMode="numeric"
          autoFocus
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onKeyDown={(e) => e.key === 'Enter' && code.length === 5 && join()}
          placeholder="• • • • •"
          className="num font-display mt-4 w-full rounded-2xl border-2 border-line bg-night/60 py-3 text-center text-4xl font-extrabold tracking-[0.5em] outline-none placeholder:text-line focus:border-sky"
        />
        <Button variant="primary" className="font-display mt-4 w-full py-3 text-xl" disabled={code.length !== 5} onClick={join}>
          Vào bàn
        </Button>
        <p className="mt-3 rounded-2xl bg-sky/10 px-3 py-2 text-xs text-sky">
          📡 Join từ máy khác qua mạng: <b>sắp có ở giai đoạn 2</b>.
        </p>
      </Card>
    </main>
  )
}
