import { useEffect, useState } from 'react'
import type { ID } from '../../core/types'
import { actions } from '../../store'
import { pingWait } from '../../store/appStore'
import { tell } from '../dialog'

/** 🔔 Nhắc lại một yêu cầu còn chờ; vừa nhắc thì hiện số giây phải đợi. */
export function PingButton({ req, className = '' }: { req: { id: ID; at: number; pingedAt?: number; answeredAt?: number; pings?: number }; className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  const wait = pingWait(req, now)

  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setNow(Date.now()), 1000)
    return () => window.clearTimeout(t)
  }, [wait, now])

  const ping = async () => {
    const errors = actions().pingRequest(req.id)
    setNow(Date.now())
    if (errors.length) await tell(errors[0], { icon: '🔔' })
  }

  return (
    <button
      type="button"
      aria-label={wait > 0 ? `Nhắc lại sau ${wait} giây` : 'Nhắc lại'}
      disabled={wait > 0}
      onClick={ping}
      className={`shrink-0 rounded-full border border-lemon/60 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-lemon transition active:scale-90 disabled:border-line disabled:text-muted ${className}`}
    >
      🔔 {wait > 0 ? `${wait}s` : 'Nhắc'}
      {!!req.pings && <span className="ml-1 font-normal opacity-70">×{req.pings}</span>}
    </button>
  )
}
