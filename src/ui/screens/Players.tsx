import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { actions } from '../../store'
import { MAX_PLAYERS } from '../../core/types'
import { EMOJIS, isPlayerUsed } from '../../store/appStore'
import { canHostOf, useMe } from '../me'
import { confirmTakeHost, useHostAway, useOnlineIds } from '../presence'
import { saveProfile } from '../profile'
import { useSession } from '../components/useSession'
import { ask, tell } from '../dialog'
import { hostVoteTally, hostVotesNeeded } from '../../core/hostVote'
import { Button, Card, Errors, SectionTitle, TopBar } from '../components/kit'
import { RoomCode } from '../components/RoomCode'
import { MeIcon } from '../components/MeIcon'
import { OnlineDot } from '../components/Board'

export function Players() {
  const session = useSession()
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const nextEmoji = (emoji: string) => EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length]
  const nameTaken = (n: string, except?: string) =>
    session.players.some((p) => p.id !== except && p.name.toLowerCase() === n.trim().toLowerCase())

  // "Bạn là ai" chọn lúc tạo / join bàn, không đổi ở đây — tránh máy này giả làm người khác
  const [me] = useMe(session)
  const onlineIds = useOnlineIds()
  // Bàn nhiều người: người thường chỉ sửa được chính mình; thêm / xóa / sửa người khác là việc của host
  const canHost = canHostOf(session, me)

  const inRoom = session.players.filter((p) => !p.removed)
  const [swiped, setSwiped] = useState<string | null>(null)

  const add = () => {
    if (inRoom.length >= MAX_PLAYERS) return setErrors([`Tối đa ${MAX_PLAYERS} người một bàn.`])
    if (!name.trim()) return setErrors(['Nhập tên người chơi.'])
    // Tên của người đã xóa khỏi phòng → thêm lại chính người đó (giữ lời/lỗ cũ)
    const back = session.players.find((p) => p.removed && p.name.toLowerCase() === name.trim().toLowerCase())
    if (!back && nameTaken(name)) return setErrors(['Tên này đã có trong bàn.'])
    actions().addPlayer(name, EMOJIS[session.players.length % EMOJIS.length])
    if (back) void tell(`${back.name} đã trở lại phòng`, { icon: '👋', message: 'Lời/lỗ cũ vẫn giữ nguyên.' })
    setName('')
    setErrors([])
  }

  const isHost = !!me && me === session.hostId
  const needed = hostVotesNeeded(session)
  const tally = hostVoteTally(session)
  const myVote = me ? session.hostVotes[me] : undefined
  const hostName = session.players.find((p) => p.id === session.hostId)?.name ?? 'host'
  const hostAway = useHostAway(session, me)

  /** 🛎️: host chuyển host ngay; người khác bỏ phiếu bầu (bấm lại để rút). */
  const pickHost = async (id: string, playerName: string) => {
    if (id === session.hostId) return
    if (!me) return tell('Chưa chọn bạn là ai', { icon: '🙋', message: 'Chọn tên của bạn trong bàn trước đã.' })
    // Host offline: bấm 🛎️ ở dòng của mình = nhận làm host luôn
    if (hostAway && id === me) return confirmTakeHost(session, me)
    if (isHost) {
      if (await ask(`Chuyển host cho ${playerName}?`, { icon: '🛎️', okLabel: 'Chuyển' })) actions().setHost(id)
      return
    }
    const { errors, elected } = actions().voteHost(me, id)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
    else if (elected) await tell(`${playerName} là host mới!`, { icon: '🛎️', message: `Đủ ${needed} phiếu bầu.` })
  }

  /** Vuốt trái → Xóa: chưa chơi thì xóa hẳn; đã chơi thì ẩn khỏi phòng, lời/lỗ vẫn giữ. */
  const remove = async (id: string, playerName: string) => {
    setSwiped(null)
    const used = isPlayerUsed(session, id)
    const ok = await ask(`Xóa ${playerName} khỏi phòng?`, {
      icon: '🗑️',
      message: used
        ? 'Lời/lỗ và lịch sử vẫn giữ để tính trả kẹo. Thêm lại đúng tên này để đưa người đó trở lại.'
        : `${playerName} chưa chơi ván nào — xóa hẳn.`,
      okLabel: 'Xóa',
      danger: true,
    })
    if (!ok) return
    const errors = actions().removePlayer(id)
    if (errors.length) await tell(errors[0], { icon: '⚠️' })
  }

  return (
    <main>
      <TopBar title="Người chơi" back={`/s/${session.id}`} />
      {session.code && <RoomCode session={session} />}
      <ul className="mb-3 space-y-0.5 text-sm text-muted">
        <li>
          <b className="text-cream">Chạm avatar{canHost ? '' : ' của bạn'}</b> để đổi biểu tượng · dấu <MeIcon className="inline size-3.5 align-[-2px] text-lemon" /> là bạn (chọn lúc tạo / join bàn, không đổi được).
        </li>
        <li>
          🛎️ <b className="text-cream">Host</b> — người duyệt hoàn tác và đặt Rule. 💤 <b className="text-cream">Tạm nghỉ</b> — không vào ván mới, lời/lỗ vẫn giữ.
        </li>
        {canHost && (
          <li>
            👈 <b className="text-cream">Vuốt trái</b> một dòng để xóa người khỏi phòng.
          </li>
        )}
      </ul>

      <div className="mb-3 rounded-2xl border border-sky/40 bg-sky/10 px-3 py-2 text-sm">
        {isHost ? (
          <>
            Bạn là host — bấm 🛎️ ở người khác để chuyển host ngay.
          </>
        ) : hostAway ? (
          <>
            ⚪ <b>{hostName}</b> đang offline — bấm 🛎️ ở <b>dòng của bạn</b> để làm host luôn, hoặc bấm ở người khác để bầu.
          </>
        ) : (
          <>
            🗳️ <b>{hostName}</b> vắng? Bấm 🛎️ ở người bạn muốn để <b>bầu host mới</b> (bấm lại để rút phiếu).
          </>
        )}
        <div className="mt-0.5 text-xs text-muted">
          {!isHost && (
            <>
              Đủ <b className="text-cream">{needed} phiếu</b> là thành host
            </>
          )}
          {Object.keys(tally).length > 0 &&
            `${isHost ? 'Đang có phiếu bầu:' : ' ·'} ${Object.entries(tally)
              .sort((x, y) => y[1] - x[1])
              .map(([id, n]) => `${session.players.find((p) => p.id === id)?.name} ${n}/${needed}`)
              .join(', ')}`}
        </div>
      </div>

      <Card className="p-2">
        <ul>
          {inRoom.map((p) => {
            const editable = canHost || p.id === me
            return (
            <SwipeRow
              key={p.id}
              locked={!canHost}
              open={swiped === p.id}
              onOpen={() => setSwiped(p.id)}
              onClose={() => setSwiped((x) => (x === p.id ? null : x))}
              onDelete={() => remove(p.id, p.name)}
              deleteLabel={`Xóa ${p.name} khỏi phòng`}
            >
              <Avatar
                emoji={p.emoji}
                isMe={me === p.id}
                online={onlineIds.has(p.id)}
                resting={!p.active}
                name={p.name}
                onTap={
                  editable
                    ? () => {
                        const emoji = nextEmoji(p.emoji)
                        actions().updatePlayer(p.id, { emoji })
                        if (p.id === me) saveProfile({ name: p.name, emoji })
                      }
                    : undefined
                }
              />
              <input
                aria-label={`Tên ${p.name}`}
                className={`min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-2 font-semibold outline-none focus:border-lemon ${
                  p.active ? '' : 'text-muted line-through'
                }`}
                defaultValue={p.name}
                readOnly={!editable}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && !nameTaken(v, p.id)) {
                    actions().updatePlayer(p.id, { name: v })
                    if (p.id === me) saveProfile({ name: v, emoji: p.emoji })
                  }
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
                      : hostAway && p.id === me
                        ? `Làm host (${hostName} đang offline)`
                      : myVote === p.id
                        ? `Rút phiếu bầu ${p.name}`
                        : `Bầu ${p.name} làm host`
                }
                onClick={() => pickHost(p.id, p.name)}
                onClass="bg-mint/25 border-mint"
                badge={tally[p.id] ? `${tally[p.id]}/${needed}` : undefined}
                marked={myVote === p.id || (hostAway && p.id === me)}
              />
              {editable ? (
                <IconToggle
                  on={!p.active}
                  icon="💤"
                  label={p.active ? `Cho ${p.name} tạm nghỉ` : `${p.name} đang nghỉ — bấm để chơi lại`}
                  onClick={() => actions().updatePlayer(p.id, { active: !p.active })}
                  onClass="bg-grape/30 border-grape"
                />
              ) : (
                <span className="size-10 shrink-0" />
              )}
            </SwipeRow>
            )
          })}
        </ul>
      </Card>

      <Card className={`mt-3 ${canHost ? '' : 'hidden'}`}>
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

const DELETE_W = 84

/** Dòng vuốt được: vuốt sang trái để lộ nút Xóa ở mép phải; chạm vào dòng đang mở thì đóng lại. */
function SwipeRow({
  open,
  onOpen,
  onClose,
  onDelete,
  deleteLabel,
  locked,
  children,
}: {
  /** Không được xóa (không phải host) → không vuốt được. */
  locked?: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  onDelete: () => void
  deleteLabel: string
  children: ReactNode
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const gesture = useRef<{ x: number; y: number; base: number; swiping: boolean; at: number } | null>(null)
  const suppressClick = useRef(false)
  const offset = drag ?? (open ? DELETE_W : 0)

  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0 || locked) return
    const base = open ? DELETE_W : 0
    gesture.current = { x: e.clientX, y: e.clientY, base, swiping: false, at: base }
    suppressClick.current = false
  }
  const move = (e: ReactPointerEvent) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.swiping) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) gesture.current = null // cuộn dọc
      else if (Math.abs(dx) > 10) {
        g.swiping = true
        e.currentTarget.setPointerCapture(e.pointerId)
        // Kéo chuột bắt đầu trên ô tên (PC): bỏ bôi chữ, trả ô về đầu dòng
        window.getSelection()?.removeAllRanges()
        const typing = document.activeElement
        if (typing instanceof HTMLInputElement && e.currentTarget.contains(typing)) {
          typing.blur()
          typing.scrollLeft = 0
        }
      }
      if (!g.swiping) return
    }
    // Vuốt sang trái (dx âm) để lộ nút Xóa bên phải
    g.at = Math.min(DELETE_W * 1.25, Math.max(0, g.base - dx))
    setDrag(g.at)
  }
  const up = () => {
    const g = gesture.current
    gesture.current = null
    if (!g?.swiping) return
    suppressClick.current = true
    if (g.at > DELETE_W / 2) onOpen()
    else onClose()
    setDrag(null)
  }

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-label={deleteLabel}
        tabIndex={open ? 0 : -1}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-berry text-sm font-bold text-night"
        style={{ width: DELETE_W, visibility: offset > 0 ? 'visible' : 'hidden' }}
      >
        <span aria-hidden className="text-xl leading-none">
          🗑️
        </span>
        Xóa
      </button>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          // Vừa vuốt xong (chuột trên PC vẫn phát click khi thả) → bỏ qua, giữ nguyên dòng đang mở
          if (suppressClick.current) {
            e.stopPropagation()
            e.preventDefault()
            suppressClick.current = false
            return
          }
          // Dòng đang mở → chạm chỉ để đóng, không bấm nút bên trong
          if (open) {
            e.stopPropagation()
            e.preventDefault()
            onClose()
          }
        }}
        style={{ transform: `translateX(${-offset}px)` }}
        className={`relative flex touch-pan-y items-center gap-2 bg-plum px-2 py-2 ${drag === null ? 'transition-transform duration-200' : ''}`}
      >
        {children}
      </div>
    </li>
  )
}

/** Avatar người chơi: chạm = đổi biểu tượng (không có onTap = chỉ xem); dấu hình người = bạn (máy này). */
function Avatar({
  emoji,
  isMe,
  online,
  resting,
  name,
  onTap,
}: {
  emoji: string
  isMe: boolean
  online?: boolean
  resting?: boolean
  name: string
  onTap?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={!onTap ? name : isMe ? `${name} (bạn) — chạm để đổi biểu tượng` : `Đổi biểu tượng của ${name}`}
      disabled={!onTap}
      onClick={onTap}
      className={`relative grid size-11 shrink-0 touch-none place-items-center rounded-full border-2 bg-plum-2 text-2xl transition select-none active:scale-95 ${
        isMe ? 'border-lemon shadow-[0_0_14px_rgb(255_210_63/0.35)]' : 'border-line'
      }`}
    >
      <span className={resting ? 'opacity-40' : ''}>{emoji}</span>
      {online && <OnlineDot className="absolute -top-0.5 -left-0.5" />}
      {resting && (
        <span aria-hidden className="absolute -top-1.5 -right-2 text-sm leading-none">
          💤
        </span>
      )}
      {isMe && (
        <span aria-hidden className="absolute -right-1.5 -bottom-1 grid size-5 place-items-center rounded-full bg-lemon text-night">
          <MeIcon className="size-3" />
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
