import { FirebaseRoomDb } from './FirebaseRoomDb'
import { LocalRoomBackend } from './LocalRoomBackend'
import { PartsRoomBackend } from './PartsRoomBackend'
import type { RoomBackend } from './RoomBackend'

const SWEEP_KEY = 'candypot:sweep-at'
const SWEEP_EVERY_MS = 24 * 60 * 60 * 1000

/**
 * Chọn nơi đặt phòng: có config Firebase (biến VITE_FIREBASE_* trong .env.local) thì dùng Firebase,
 * chưa có thì giả lập trên máy này.
 */
export function createRoomBackend(): RoomBackend {
  const env = import.meta.env
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_DATABASE_URL) return new LocalRoomBackend()
  const emulator = env.VITE_FIREBASE_EMULATOR ? { host: 'localhost', port: Number(env.VITE_FIREBASE_EMULATOR) } : undefined
  const backend = new PartsRoomBackend(
    new FirebaseRoomDb(
      {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: env.VITE_FIREBASE_DATABASE_URL,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      },
      emulator,
    ),
  )
  // Mỗi máy dọn phòng bỏ không tối đa 1 lần / ngày
  const sweep = backend.sweep.bind(backend)
  backend.sweep = async () => {
    try {
      if (Date.now() - Number(localStorage.getItem(SWEEP_KEY) ?? 0) < SWEEP_EVERY_MS) return []
      localStorage.setItem(SWEEP_KEY, String(Date.now()))
    } catch {
      return []
    }
    return sweep()
  }
  return backend
}
