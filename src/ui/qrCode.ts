/** Lấy mã bàn 5 số từ nội dung mã QR: link join (…/join?code=12345) hoặc chính mã 5 số. */
export function codeFromQr(text: string): string | null {
  try {
    const code = new URL(text).searchParams.get('code')
    if (code && /^\d{5}$/.test(code)) return code
  } catch {
    // Không phải link
  }
  return text.trim().match(/^\d{5}$/)?.[0] ?? null
}
