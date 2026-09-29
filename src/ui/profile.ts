/** Tên + biểu tượng của người dùng trình duyệt này — tự điền khi tạo / join bàn lần sau. */
export interface Profile {
  name: string
  emoji: string
}

const KEY = 'candypot:profile'

export function readProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null
    return p?.name ? p : null
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile): void {
  if (!profile.name.trim()) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: profile.name.trim(), emoji: profile.emoji }))
  } catch {
    // Không lưu được thì lần sau tự nhập lại — không sao
  }
}
