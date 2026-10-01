import { useSyncExternalStore } from 'react'

/** Điện thoại xoay ngang (màn thấp) — cùng điều kiện với biến thể `land:` trong index.css. */
const QUERY = '(orientation: landscape) and (max-height: 600px)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(QUERY)
  mq?.addEventListener('change', cb)
  return () => mq?.removeEventListener('change', cb)
}

/** true khi đang xoay ngang (đổi hướng màn hình thì tự cập nhật). */
export function useLandscape(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  )
}
