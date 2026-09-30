import { useMemo } from 'react'
import type { ID } from '../core/types'
import { useApp } from '../store'

/** Những người đang có máy mở bàn (chấm xanh). Máy này mất kết nối / tạm ngắt thì không biết → không hiện ai. */
export function useOnlineIds(): Set<ID> {
  const present = useApp((s) => s.present)
  const online = useApp((s) => s.online)
  const paused = useApp((s) => s.paused)
  return useMemo(() => new Set(online && !paused ? present : []), [present, online, paused])
}
