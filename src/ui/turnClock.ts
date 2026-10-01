import { useEffect, useState } from 'react'
import { TURN_SECONDS } from '../core/games/tienlenPlay'

/** Thời gian mỗi lượt (ms). */
export const TURN_MS = TURN_SECONDS * 1000
/** Người tới lượt mất mạng / đóng app: host tự bỏ lượt thay họ sau thêm bấy nhiêu. */
export const HOST_GRACE_MS = 4000

/**
 * Lúc máy này thấy lượt bắt đầu — tính giờ theo đồng hồ của chính máy (giờ các máy có thể lệch nhau),
 * khóa theo `mã ván:số nước` nên lượt mới (kể cả cùng người) là tính lại từ đầu.
 */
const seen = new Map<string, number>()
export function turnStart(key: string): number {
  let t = seen.get(key)
  if (t === undefined) seen.set(key, (t = Date.now()))
  return t
}

/** Còn bao nhiêu ms của lượt `key` (âm = quá giờ); cập nhật 4 lần mỗi giây. */
export function useTurnLeft(key: string | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!key) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [key])
  if (!key) return null
  return TURN_MS - (Math.max(now, turnStart(key)) - turnStart(key))
}
