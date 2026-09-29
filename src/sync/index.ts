import { FirebaseRoomBackend } from './FirebaseRoomBackend'
import { LocalRoomBackend } from './LocalRoomBackend'
import type { RoomBackend } from './RoomBackend'

/**
 * Chọn nơi đặt phòng: có config Firebase (biến VITE_FIREBASE_* trong .env.local) thì dùng Firebase,
 * chưa có thì giả lập trên máy này.
 */
export function createRoomBackend(): RoomBackend {
  const env = import.meta.env
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_DATABASE_URL) return new LocalRoomBackend()
  const emulator = env.VITE_FIREBASE_EMULATOR ? { host: 'localhost', port: Number(env.VITE_FIREBASE_EMULATOR) } : undefined
  return new FirebaseRoomBackend(
    {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: env.VITE_FIREBASE_DATABASE_URL,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    },
    emulator,
  )
}
