import { registerSW } from 'virtual:pwa-register'

const KEY = 'candypot:stale-reload-at'

/**
 * Trang đang chạy bản cũ mà file của bản đó đã bị thay trên máy chủ (vừa đăng bản mới) → tải lại trang.
 * Tối đa 1 lần / 30 giây để không tải lại liên tục. Trả về false nếu không tải lại.
 */
function reloadForNewVersion(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 30_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Giữ app luôn ở bản mới nhất: có bản mới thì tự chuyển; lỡ tải file của bản cũ bị lỗi thì tải lại trang. */
export function keepFresh(): void {
  // Vd máy mở app từ trước khi đăng bản mới, giờ mới tải phần kết nối Firebase (file cũ đã không còn)
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadForNewVersion()) e.preventDefault()
  })
  if (import.meta.env.DEV) return
  // Bản mới cài xong thì tự tải lại trang (lời lỗ lưu trên máy + phòng, không mất gì)
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // Mở lại app từ nền (iPhone giữ app rất lâu) → kiểm tra có bản mới không
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void registration?.update()
      })
    },
  })
}
