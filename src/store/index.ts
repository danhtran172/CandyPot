import { useStore } from 'zustand'
import { LocalRepo } from '../storage/LocalRepo'
import { createRoomBackend } from '../sync'
import { watchIdle } from '../sync/idle'
import { createAppStore, type AppState } from './appStore'

export const repo = new LocalRepo()
const rooms = createRoomBackend()
export const appStore = createAppStore(repo, rooms)

// Máy mở app rồi để đó: ẩn quá 1 phút / 15 phút không chạm → tạm ngắt kết nối phòng (gói miễn phí
// giới hạn số máy kết nối cùng lúc); chạm hoặc mở lại app là nối lại
watchIdle({
  idleMs: 15 * 60 * 1000,
  hiddenMs: 60 * 1000,
  onIdle: () => {
    rooms.pause?.()
    appStore.setState({ paused: true })
  },
  onActive: () => {
    rooms.resume?.()
    appStore.setState({ paused: false })
  },
})

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector)
}

export const actions = () => appStore.getState()
