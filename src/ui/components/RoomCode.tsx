import { useState } from 'react'
import type { Session } from '../../core/types'
import { useApp } from '../../store'
import { tell } from '../dialog'
import { QrModal } from './QrModal'
import { appUrl } from '../appUrl'

/** Link join bàn (mã QR chứa link này). */
function joinLink(code: string): string {
  return `${appUrl()}/join?code=${code}`
}

/** Ô mã bàn 5 số + nút QR / chia sẻ link để người khác join từ máy mình. */
export function RoomCode({ session }: { session: Session }) {
  const kind = useApp((s) => s.roomKind)
  const [show, setShow] = useState(false)
  const code = session.code!

  const share = async () => {
    const link = joinLink(code)
    try {
      if (navigator.share) await navigator.share({ title: session.name, text: `Vào bàn "${session.name}" — mã ${code}`, url: link })
      else {
        await navigator.clipboard.writeText(link)
        await tell('Đã copy link', { icon: '🔗', message: link })
      }
    } catch {
      // Người dùng bấm hủy chia sẻ — không sao
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-sky/40 bg-sky/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">Mã bàn — mọi người nhập ở "Join bàn"</div>
          <div className="num font-display text-2xl leading-tight font-extrabold tracking-[0.3em] text-sky">{code}</div>
          {kind === 'local' && <div className="text-[10px] text-muted">Chưa kết nối Firebase — chỉ join được trên máy này</div>}
        </div>
        <button
          type="button"
          onClick={() => setShow(true)}
          className="rounded-full bg-sky px-3 py-1.5 text-sm font-bold text-night"
          aria-label="Hiện mã QR để join"
        >
          QR
        </button>
        <button type="button" onClick={share} className="rounded-full border border-sky/60 px-3 py-1.5 text-sm font-bold text-sky">
          Gửi link
        </button>
      </div>

      {show && (
        <QrModal
          title="Quét để vào bàn"
          subtitle={session.name}
          url={joinLink(code)}
          onClose={() => setShow(false)}
          footer={<div className="num font-display mt-3 text-3xl font-extrabold tracking-[0.3em] text-sky">{code}</div>}
        />
      )}
    </>
  )
}
