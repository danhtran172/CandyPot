import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Session } from '../../core/types'
import { useApp } from '../../store'
import { tell } from '../dialog'

/** Link join bàn (mã QR chứa link này). */
function joinLink(code: string): string {
  return `${location.origin}/join?code=${code}`
}

/** Ô mã bàn 5 số + nút QR / chia sẻ link để người khác join từ máy mình. */
export function RoomCode({ session }: { session: Session }) {
  const kind = useApp((s) => s.roomKind)
  const [qr, setQr] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const code = session.code!

  useEffect(() => {
    if (!show) return
    let alive = true
    QRCode.toDataURL(joinLink(code), { margin: 1, width: 480, color: { dark: '#1c0e22', light: '#fff1e0' } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [show, code])

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
        <div className="fixed inset-0 z-50 grid place-items-center p-6" role="dialog" aria-modal="true" aria-label="Mã QR join bàn">
          <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={() => setShow(false)} />
          <div className="pop relative w-full max-w-xs rounded-[2rem] border border-line bg-plum p-5 text-center shadow-2xl">
            <p className="font-display text-xl font-bold">Quét để vào bàn</p>
            <p className="text-xs text-muted">{session.name}</p>
            <div className="mx-auto mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-cream">
              {qr && <img src={qr} alt={`Mã QR vào bàn ${code}`} className="size-full" />}
            </div>
            <div className="num font-display mt-3 text-3xl font-extrabold tracking-[0.3em] text-sky">{code}</div>
            <button type="button" onClick={() => setShow(false)} className="mt-3 w-full rounded-2xl bg-plum-2 py-2.5 font-semibold">
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  )
}
