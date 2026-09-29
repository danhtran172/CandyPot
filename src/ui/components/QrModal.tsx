import { useEffect, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'

/** Popup mã QR của một link (vào bàn, mở app…) để người khác quét bằng camera. */
export function QrModal({
  title,
  subtitle,
  url,
  footer,
  onClose,
}: {
  title: string
  subtitle?: string
  url: string
  footer?: ReactNode
  onClose: () => void
}) {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#1c0e22', light: '#fff1e0' } })
      .then((data) => alive && setQr(data))
      .catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/80 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-xs rounded-[2rem] border border-line bg-plum p-5 text-center shadow-2xl">
        <p className="font-display text-xl font-bold">{title}</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        <div className="mx-auto mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-cream">
          {qr && <img src={qr} alt={`Mã QR: ${url}`} className="size-full" />}
        </div>
        {footer}
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-2xl bg-plum-2 py-2.5 font-semibold">
          Đóng
        </button>
      </div>
    </div>
  )
}
