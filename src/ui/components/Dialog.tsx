import { useEffect, useSyncExternalStore } from 'react'
import { answer, current as head, subscribe } from '../dialog'
import { Button } from './kit'

/** Popup xác nhận/báo tin — đặt một lần ở gốc app, gọi qua ask()/tell() trong ui/dialog. */
export function DialogHost() {
  const current = useSyncExternalStore(subscribe, head)

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answer(false)
      if (e.key === 'Enter') answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  if (!current) return null
  const { icon, title, message, okLabel, cancelLabel, danger } = current
  return (
    <div
      key={current.id}
      role="alertdialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Xác nhận'}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-night/75 backdrop-blur-sm"
        onClick={() => answer(false)}
      />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-lemon bg-plum-2 p-5 text-center shadow-2xl">
        {icon && (
          <div aria-hidden className="mb-1 text-4xl">
            {icon}
          </div>
        )}
        <h2 className="font-display text-xl leading-tight font-bold">{title}</h2>
        {message && <p className="mt-1.5 text-sm text-muted">{message}</p>}
        <div className="mt-4 flex gap-2">
          {cancelLabel && (
            <Button className="flex-1" onClick={() => answer(false)}>
              {cancelLabel}
            </Button>
          )}
          <Button
            autoFocus
            variant="primary"
            className={`flex-1 ${danger ? 'bg-berry! text-night' : ''}`}
            onClick={() => answer(true)}
          >
            {okLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
