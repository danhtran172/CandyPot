/**
 * Theo dõi máy có đang được dùng không: app ẩn quá `hiddenMs`, hoặc hiện mà không ai chạm quá `idleMs`
 * → onIdle; chạm / mở lại app → onActive.
 */
export function watchIdle({
  idleMs,
  hiddenMs,
  onIdle,
  onActive,
}: {
  idleMs: number
  hiddenMs: number
  onIdle: () => void
  onActive: () => void
}): () => void {
  let idle = false
  let timer = 0
  const arm = (ms: number) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (idle) return
      idle = true
      onIdle()
    }, ms)
  }
  const active = () => {
    if (idle) {
      idle = false
      onActive()
    }
    arm(idleMs)
  }
  const onVisibility = () => (document.hidden ? arm(hiddenMs) : active())
  const events = ['pointerdown', 'keydown'] as const
  document.addEventListener('visibilitychange', onVisibility)
  events.forEach((e) => window.addEventListener(e, active, { passive: true, capture: true }))
  arm(document.hidden ? hiddenMs : idleMs)
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    events.forEach((e) => window.removeEventListener(e, active, { capture: true }))
  }
}
