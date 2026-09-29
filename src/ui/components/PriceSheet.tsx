import { useEffect, useState } from 'react'
import { Button, Stepper } from './kit'

/** Popup đặt một số (vd giá mỗi tờ Lô tô): Stepper + Lưu; lỗi từ onSave hiện ngay trong popup. */
export function PriceSheet({
  title,
  hint,
  unit,
  initial,
  onSave,
  onClose,
}: {
  title: string
  hint: string
  unit: string
  initial: number
  onSave: (value: number) => string[]
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    const errors = onSave(value)
    if (errors.length) setError(errors[0])
    else onClose()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-sky/70 bg-plum-2 p-5 shadow-2xl">
        <h2 className="font-display text-center text-xl font-bold text-sky">{title}</h2>
        <p className="mt-1 text-center text-xs text-muted">{hint}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Stepper value={value} min={1} onChange={setValue} label={title} />
          <span className="text-sm text-muted">{unit}</span>
        </div>
        {error && <p className="mt-3 text-center text-sm text-berry">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            Thôi
          </Button>
          <Button variant="primary" className="flex-1" onClick={save}>
            Lưu
          </Button>
        </div>
      </div>
    </div>
  )
}
