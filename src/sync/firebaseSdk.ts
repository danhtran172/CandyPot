// Tách riêng để Firebase SDK chỉ tải khi có bàn nhiều người (bàn một máy không phải tải)
export { initializeApp } from 'firebase/app'
export { getAuth, signInAnonymously } from 'firebase/auth'
export {
  connectDatabaseEmulator,
  endAt,
  get,
  getDatabase,
  goOffline,
  goOnline,
  limitToFirst,
  onDisconnect,
  onValue,
  orderByValue,
  query,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database'
