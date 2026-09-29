import { useState } from 'react'
import type { ID, Session } from '../../core/types'
import { MAX_PLAYERS } from '../../core/types'
import { actions } from '../../store'
import { EMOJIS } from '../../store/appStore'
import { writeMeHere } from '../me'

/**
 * Vừa join bàn nhiều người: hỏi "Bạn là ai?" — chọn tên có sẵn (host đã thêm) hoặc thêm mình vào bàn.
 * Lựa chọn lưu trên máy này (đổi lại ở màn Người chơi).
 */
export function WhoAmI({ session, onDone }: { session: Session; onDone: (id: ID) => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[session.players.length % EMOJIS.length])
  const [error, setError] = useState('')
  const inRoom = session.players.filter((p) => !p.removed)

  const pick = (id: ID) => {
    writeMeHere(session.id, id)
    onDone(id)
  }

  const join = () => {
    const n = name.trim()
    if (!n) return setError('Nhập tên của bạn.')
    const same = session.players.find((p) => p.name.toLowerCase() === n.toLowerCase())
    if (same && !same.removed) return setError(`Đã có "${same.name}" trong bàn — bấm vào tên đó nếu là bạn.`)
    if (inRoom.length >= MAX_PLAYERS) return setError(`Bàn đã đủ ${MAX_PLAYERS} người.`)
    actions().addPlayer(n, emoji)
    const added = actions().session?.players.find((p) => p.name.toLowerCase() === n.toLowerCase())
    if (added) pick(added.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Bạn là ai?">
      <div className="absolute inset-0 bg-night/85 backdrop-blur-sm" />
      <div className="pop relative w-full max-w-lg rounded-t-[2rem] border-t border-line bg-plum px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <h2 className="font-display text-center text-2xl font-bold">Bạn là ai?</h2>
        <p className="text-center text-xs text-muted">
          Bàn <b className="text-cream">{session.name}</b> · mã {session.code}
        </p>

        {inRoom.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {inRoom.map((p) => (
              <li key={p.id} className="w-[calc((100%-1rem)/3)]">
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  className="flex w-full flex-col items-center gap-1 rounded-2xl border border-line bg-night/50 px-1 py-2.5 active:scale-95"
                >
                  <span aria-hidden className="text-3xl leading-none">
                    {p.emoji}
                  </span>
                  <span className="w-full truncate text-center text-sm font-semibold">{p.name}</span>
                  {p.id === session.hostId && <span className="text-[10px] font-bold text-lemon">host</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-center text-xs text-muted">Chưa có tên bạn? Thêm mình vào bàn:</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Đổi biểu tượng"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-plum-2 text-2xl"
            onClick={() => setEmoji(EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length])}
          >
            {emoji}
          </button>
          <input
            aria-label="Tên của bạn"
            className="min-w-0 flex-1 rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
            placeholder="Tên của bạn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
          <button type="button" onClick={join} className="font-display rounded-xl bg-lemon px-4 py-2.5 font-bold text-night">
            Vào
          </button>
        </div>
        {error && <p className="mt-2 text-center text-sm text-berry">{error}</p>}
      </div>
    </div>
  )
}
