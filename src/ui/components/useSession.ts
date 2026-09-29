import type { Session } from '../../core/types'
import { useApp } from '../../store'

/** Buổi đang mở — chỉ dùng bên trong các màn nằm dưới SessionLayout. */
export function useSession(): Session {
  const session = useApp((s) => s.session)
  if (!session) throw new Error('useSession phải dùng bên trong SessionLayout')
  return session
}
