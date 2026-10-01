import { useState } from 'react'

const KEY = 'candypot:cards-folded'

/**
 * Bài trong app đang thu gọn: chỉ còn một thanh nhỏ (Mở bài + ⋯ thao tác host), bàn và các nút thường hiện lại, bấm được.
 * Nhớ trên máy này, dùng chung cho mọi game bài (Tiến lên, Xì dách, Lô tô).
 */
export function useCardsFolded() {
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const fold = (v: boolean) => {
    setFolded(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* không nhớ được thì thôi */
    }
  }
  return [folded, fold] as const
}

const HIDE_KEY = 'candypot:hide-hand'

/**
 * Giấu bài trên tay (úp lưng lên, ẩn điểm) — đặt máy xuống bàn hay người bên cạnh nhìn sang cũng không lộ bài.
 * Nhớ trên máy này.
 */
export function useHideHand() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () => {
    setHidden(!hidden)
    try {
      localStorage.setItem(HIDE_KEY, hidden ? '0' : '1')
    } catch {
      /* không nhớ được thì thôi */
    }
  }
  return [hidden, toggle] as const
}
