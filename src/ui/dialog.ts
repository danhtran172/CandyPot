import type { ReactNode } from 'react'

/** Hộp thoại trong app thay cho confirm()/alert() của trình duyệt. */
export type Dialog = {
  id: number
  icon?: string
  title: ReactNode
  message?: ReactNode
  okLabel: string
  cancelLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

type Options = { icon?: string; message?: ReactNode; okLabel?: string; cancelLabel?: string; danger?: boolean }

let queue: Dialog[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function push(d: Omit<Dialog, 'id' | 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { ...d, id: nextId++, resolve }]
    emit()
  })
}

/** Hỏi xác nhận — trả về true khi người dùng bấm OK. */
export function ask(title: ReactNode, opts: Options = {}): Promise<boolean> {
  return push({ title, okLabel: 'Đồng ý', cancelLabel: 'Thôi', ...opts })
}

/** Báo tin một nút OK. */
export function tell(title: ReactNode, opts: Omit<Options, 'cancelLabel'> = {}): Promise<boolean> {
  return push({ title, okLabel: 'OK', ...opts, cancelLabel: undefined })
}

export function answer(ok: boolean) {
  const [head, ...rest] = queue
  if (!head) return
  queue = rest
  emit()
  head.resolve(ok)
}

export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const current = (): Dialog | undefined => queue[0]
