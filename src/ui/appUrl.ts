/** Địa chỉ public của app (đang chạy thử trên máy thì trỏ về bản web để điện thoại quét được). */
const PUBLIC_URL = 'https://candypot.web.app'

export function appUrl(): string {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? PUBLIC_URL : location.origin
}
