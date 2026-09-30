import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'
import { netOf } from '../../core/ledger'
import { settle } from '../../core/settle'
import type { ID } from '../../core/types'
import { GameIcon } from '../components/GameIcon'
import { useSession } from '../components/useSession'
import { TransferList } from '../components/TransferList'
import { Button, Card, Chip, SectionTitle, TopBar, Who } from '../components/kit'
import { playerMap, signed, toneOf } from '../format'
import { useMe } from '../me'

/** Lọc danh sách trả kẹo: tất cả / mình phải trả ai / ai phải trả mình. */
type Filter = 'all' | 'pay' | 'receive'

export function Summary() {
  const session = useSession()
  const [me] = useMe(session)
  const [gameId, setGameId] = useState<ID | undefined>()
  // undefined = chưa chọn → tự chọn theo mình (đang nợ → "Tôi cần trả", được nợ → "Ai cần trả tôi")
  const [picked, setPicked] = useState<Filter | undefined>()
  const [status, setStatus] = useState('')
  const shot = useRef<HTMLDivElement>(null)
  const players = playerMap(session)
  const net = netOf(session, gameId)
  const ranked = session.players.filter((p) => net[p.id] !== 0 || p.active).sort((a, b) => net[b.id] - net[a.id])
  const transfers = settle(net)
  const toPay = transfers.filter((t) => t.from === me)
  const toGet = transfers.filter((t) => t.to === me)
  const sum = (list: typeof transfers) => list.reduce((n, t) => n + t.amount, 0)
  const filter: Filter = !me ? 'all' : (picked ?? (toPay.length ? 'pay' : toGet.length ? 'receive' : 'all'))
  const shown = filter === 'pay' ? toPay : filter === 'receive' ? toGet : transfers
  const scope = gameId ? session.games.find((g) => g.id === gameId)?.name : 'Cả bàn'

  const flash = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2500)
  }

  const copy = async () => {
    const lines = [
      `🍬 ${session.name} — ${scope}`,
      '',
      'Lời/lỗ:',
      ...ranked.map((p) => `${p.emoji} ${p.name}: ${signed(net[p.id])}`),
      '',
      transfers.length ? 'Trả kẹo:' : 'Không ai cần trả kẹo.',
      ...transfers.map((t) => `${players[t.from].name} → ${players[t.to].name}: ${t.amount} kẹo`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      flash('Đã copy — dán vào nhóm chat là xong.')
    } catch {
      flash('Trình duyệt không cho copy. Hãy chụp màn hình.')
    }
  }

  const saveImage = async () => {
    if (!shot.current) return
    try {
      const url = await toPng(shot.current, { backgroundColor: '#1c0e22', pixelRatio: 2 })
      const file = new File([await (await fetch(url)).blob()], 'candypot.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: session.name })
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `candypot-${session.name}.png`
        a.click()
      }
      flash('Đã lưu ảnh.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') flash('Không tạo được ảnh.')
    }
  }

  return (
    <main>
      <TopBar title="Tổng kết" />

      {session.games.length > 1 && (
        <nav aria-label="Phạm vi" className="-mx-4 mb-3 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={!gameId} onClick={() => setGameId(undefined)}>
            Cả bàn
          </Chip>
          {session.games.map((g) => (
            <Chip key={g.id} active={gameId === g.id} onClick={() => setGameId(g.id)}>
              <GameIcon type={g.type} /> {g.name}
            </Chip>
          ))}
        </nav>
      )}

      <div ref={shot} className="space-y-3">
        <Card>
          <SectionTitle aside={<span className="text-xs text-muted">{scope}</span>}>Lời / lỗ</SectionTitle>
          <ul>
            {ranked.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-line/40 py-2 last:border-0">
                <Who player={p} className="font-semibold" />
                <span className={`num font-display text-xl font-extrabold ${toneOf(net[p.id])}`}>{signed(net[p.id])}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle
            aside={transfers.length > 0 && <span className="text-xs text-muted">{transfers.length} lượt · ít nhất có thể</span>}
          >
            Trả kẹo
          </SectionTitle>
          {me && transfers.length > 0 && (
            <div role="radiogroup" aria-label="Lọc trả kẹo" className="-mx-1 mb-3 no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1">
              <Chip role="radio" aria-checked={filter === 'pay'} active={filter === 'pay'} tone="berry" onClick={() => setPicked('pay')}>
                Tôi cần trả ai{toPay.length > 0 && ` · ${sum(toPay)}`}
              </Chip>
              <Chip role="radio" aria-checked={filter === 'receive'} active={filter === 'receive'} tone="mint" onClick={() => setPicked('receive')}>
                Ai cần trả tôi{toGet.length > 0 && ` · ${sum(toGet)}`}
              </Chip>
              <Chip role="radio" aria-checked={filter === 'all'} active={filter === 'all'} onClick={() => setPicked('all')}>
                Tất cả
              </Chip>
            </div>
          )}
          {!transfers.length ? (
            <p className="py-4 text-center text-muted">Hòa cả bàn — không ai phải trả kẹo.</p>
          ) : shown.length ? (
            <TransferList transfers={shown} players={players} highlight={filter === 'all' ? me : undefined} />
          ) : (
            <p className="py-4 text-center text-muted">
              {filter === 'pay' ? 'Bạn không phải trả ai 🎉' : 'Không ai phải trả bạn.'}
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={copy}>📋 Copy text</Button>
        <Button onClick={saveImage}>🖼 Lưu ảnh</Button>
      </div>
      <p role="status" className="mt-2 h-5 text-center text-sm text-mint">
        {status}
      </p>
    </main>
  )
}
