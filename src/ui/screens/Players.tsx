import { useRef, useState, type ReactNode } from 'react'
import { actions } from '../../store'
import { MAX_PLAYERS } from '../../core/types'
import { EMOJIS, isPlayerUsed } from '../../store/appStore'
import { useMe } from '../me'
import { useSession } from '../components/useSession'
import { ask, tell } from '../dialog'
import { hostVoteTally, hostVotesNeeded } from '../../core/hostVote'
import { Button, Card, Errors, SectionTitle, TopBar } from '../components/kit'

export function Players() {
  const session = useSession()
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const nextEmoji = (emoji: string) => EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length]
  const nameTaken = (n: string, except?: string) =>
    session.players.some((p) => p.id !== except && p.name.toLowerCase() === n.trim().toLowerCase())

  const [me, setMe] = useMe(session)

  const add = () => {
    if (session.players.length >= MAX_PLAYERS) return setErrors([`Tối đa ${MAX_PLAYERS} người một buổi.`])
    if (!name.trim()) return setErrors(['Nhập tên người chơi.'])
    if (nameTaken(name)) return setErrors(['Tên này đã có trong buổi.'])
    actions().addPlayer(name, EMOJIS[session.players.length % EMOJIS.length])
    setName('')
    setErrors([])
  }

  const isHost = !!me && me === session.hostId
  const needed = hostVotesNeeded(session)
  const tally = hostVoteTally(session)
  const myVote = me ? session.hostVotes[me] : undefined
  const activeCount = session.players.filter((p) => p.active).length
  const hostName = session.players.find((p) => p.id === session.hostId)?.name ?? 'host'

  /** 🛎️: host chuyển host ngay; người khác bỏ phiếu bầu (bấm lại để rút). */
  const pickHost = async (id: string, playerName: string) => {
    if (id === session.hostId) return
    if (isHost || !me) {
      if (await ask(`Chuyển host cho ${playerName}?`, { icon: '🛎️', okLabel: 'Chuyển' })) actions().setHost(id)
      return
    }
    const { errors, elected } = actions().voteHost(me, id)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
    else if (elected) await tell(`${playerName} là host mới!`, { icon: '🛎️', message: `Đủ ${needed} phiếu bầu.` })
  }

  const remove = async (id: string, playerName: string) => {
    if (await ask(`Bỏ ${playerName} khỏi buổi?`, { icon: '👋', okLabel: 'Bỏ', danger: true })) actions().removePlayer(id)
  }

  return (
    <main>
      <TopBar title="Người chơi" back={`/s/${session.id}`} />
      <ul className="mb-3 space-y-0.5 text-sm text-muted">
        <li>
          <b className="text-cream">Chạm avatar</b> để chọn bạn (🙋) — chỗ của bạn luôn ở dưới cùng bàn · <b className="text-cream">giữ</b> để đổi biểu tượng.
        </li>
        <li>
          🛎️ <b className="text-cream">Host</b> — người duyệt hoàn tác và đặt Rule. 💤 <b className="text-cream">Tạm nghỉ</b> — người đã chơi không xóa được, lời/lỗ vẫn giữ.
        </li>
      </ul>

      <div className="mb-3 rounded-2xl border border-sky/40 bg-sky/10 px-3 py-2 text-sm">
        {isHost ? (
          <>
            Bạn là host — bấm 🛎️ ở người khác để chuyển host ngay.
          </>
        ) : (
          <>
            🗳️ <b>{hostName}</b> vắng? Bấm 🛎️ ở người bạn muốn để <b>bầu host mới</b> (bấm lại để rút phiếu).
          </>
        )}
        <div className="mt-0.5 text-xs text-muted">
          Cần <b className="text-cream">{needed} phiếu</b> — 30% của {activeCount} người đang chơi, tối thiểu 2
          {Object.keys(tally).length > 0 &&
            ` · đang có: ${Object.entries(tally)
              .sort((x, y) => y[1] - x[1])
              .map(([id, n]) => `${session.players.find((p) => p.id === id)?.name} ${n}/${needed}`)
              .join(', ')}`}
        </div>
      </div>

      <Card className="p-2">
        <ul>
          {session.players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-2 py-2">
              <Avatar
                emoji={p.emoji}
                isMe={me === p.id}
                name={p.name}
                onTap={() => setMe(p.id)}
                onHold={() => actions().updatePlayer(p.id, { emoji: nextEmoji(p.emoji) })}
              />
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
              <IconToggle
                on={session.hostId === p.id}
                icon="🛎️"
                label={
                  session.hostId === p.id
                    ? `${p.name} là host`
                    : isHost
                      ? `Chuyển host cho ${p.name}`
                      : myVote === p.id
                        ? `Rút phiếu bầu ${p.name}`
                        : `Bầu ${p.name} làm host`
                }
                onClick={() => pickHost(p.id, p.name)}
                onClass="bg-mint/25 border-mint"
                badge={tally[p.id] ? `${tally[p.id]}/${needed}` : undefined}
                marked={myVote === p.id}
              />
              {isPlayerUsed(session, p.id) ? (
                <IconToggle
                  on={!p.active}
                  icon="💤"
                  label={p.active ? `Cho ${p.name} tạm nghỉ` : `${p.name} đang nghỉ — bấm để chơi lại`}
                  onClick={() => actions().updatePlayer(p.id, { active: !p.active })}
                  onClass="bg-grape/30 border-grape"
                />
              ) : (
                <IconToggle icon="✕" label={`Bỏ ${p.name} khỏi buổi`} onClick={() => remove(p.id, p.name)} onClass="" />
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

/** Avatar người chơi: chạm = chọn là mình (gắn 🙋), giữ ~0,5 giây = đổi biểu tượng. */
function Avatar({
  emoji,
  isMe,
  name,
  onTap,
  onHold,
}: {
  emoji: string
  isMe: boolean
  name: string
  onTap: () => void
  onHold: () => void
}) {
  const timer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const start = () => {
    held.current = false
    timer.current = window.setTimeout(() => {
      held.current = true
      onHold()
    }, 500)
  }
  const stop = () => window.clearTimeout(timer.current)
  return (
    <button
      type="button"
      aria-label={isMe ? `${name} là bạn — giữ để đổi biểu tượng` : `Chọn ${name} là bạn`}
      aria-pressed={isMe}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => !held.current && onTap()}
      className={`relative grid size-11 shrink-0 touch-none place-items-center rounded-full border-2 bg-plum-2 text-2xl transition select-none active:scale-95 ${
        isMe ? 'border-lemon shadow-[0_0_14px_rgb(255_210_63/0.35)]' : 'border-line'
      }`}
    >
      {emoji}
      {isMe && (
        <span aria-hidden className="absolute -right-1.5 -bottom-1 grid size-5 place-items-center rounded-full bg-lemon text-[11px] leading-none">
          🙋
        </span>
      )}
    </button>
  )
}

/** Nút icon bật/tắt (Host, Tạm nghỉ…). */
function IconToggle({
  on,
  icon,
  label,
  onClick,
  onClass,
  badge,
  marked,
}: {
  on?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
  onClass: string
  /** Chữ nhỏ gắn góc (vd số phiếu 1/2). */
  badge?: string
  /** Viền xanh: lựa chọn của mình (vd phiếu mình đã bầu). */
  marked?: boolean
}) {
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-pressed={on || marked}
        title={label}
        onClick={onClick}
        className={`grid size-10 place-items-center rounded-full border text-lg transition ${
          on ? onClass : marked ? 'border-sky bg-sky/15 ring-2 ring-sky/40' : 'border-line/60 text-muted opacity-45 grayscale hover:opacity-80'
        }`}
      >
        {icon}
      </button>
      {badge && (
        <span className="num pointer-events-none absolute -top-1.5 -right-2 rounded-full bg-sky px-1 text-[10px] leading-4 font-bold text-night">
          {badge}
        </span>
      )}
    </span>
  )
}
