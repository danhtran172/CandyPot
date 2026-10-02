import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hasVietVoice, setSoundPref, sfx, speak, useSoundPrefs, type SoundKind } from '../sound'
import { lotoCallText } from '../lotoCall'
import { Button } from './kit'

const ROWS: { kind: SoundKind; icon: string; label: string; hint: string }[] = [
  { kind: 'music', icon: '🎵', label: 'Nhạc nền', hint: 'Nhạc êm lúc chơi' },
  { kind: 'sfx', icon: '🃏', label: 'Hiệu ứng', hint: 'Chia bài, đánh bài, rút bài, gọi số' },
  { kind: 'voice', icon: '🗣️', label: 'Giọng đọc', hint: 'Đọc số lô tô, báo kinh / đợi' },
  { kind: 'rhyme', icon: '🎤', label: 'Kêu lô tô', hint: 'Ngắn gọn: "Cờ ra con bốn sáu! Bốn sáu!"' },
]

/** Bảng Âm thanh: bật / tắt nhạc nền, hiệu ứng, giọng đọc (nhớ trên máy này). */
export function SoundSheet({ onClose }: { onClose: () => void }) {
  const prefs = useSoundPrefs()
  // Danh sách giọng của máy có thể nạp chậm → kiểm tra lại khi trình duyệt báo
  const [viet, setViet] = useState(hasVietVoice)
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const update = () => setViet(hasVietVoice())
    synth.addEventListener?.('voiceschanged', update)
    return () => synth.removeEventListener?.('voiceschanged', update)
  }, [])

  const toggle = (kind: SoundKind) => {
    const on = !prefs[kind]
    setSoundPref(kind, on)
    // Bật lên thì nghe thử luôn
    if (on && kind === 'sfx') setTimeout(() => sfx.play(2), 0)
    if (on && kind === 'voice') setTimeout(() => speak('Số mười lăm'), 0)
    if (on && kind === 'rhyme') setTimeout(() => speak(lotoCallText(46, true)), 0)
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Âm thanh" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70" onClick={onClose} />
      <div className="pop relative m-3 w-full max-w-sm rounded-3xl border border-line/60 bg-plum-2 p-4 shadow-2xl">
        <h2 className="font-display text-lg font-bold">🔊 Âm thanh</h2>
        <div className="mt-3 flex flex-col gap-2">
          {ROWS.map(({ kind, icon, label, hint }) => {
            // Kêu lô tô là một kiểu của giọng đọc → tắt giọng đọc thì không chỉnh được (và không có tác dụng)
            const off = kind === 'rhyme' && !prefs.voice
            const on = prefs[kind] && !off
            return (
              <button
                key={kind}
                type="button"
                role="switch"
                aria-checked={on}
                aria-disabled={off}
                disabled={off}
                onClick={() => toggle(kind)}
                className={`flex items-center gap-3 rounded-2xl border border-line/60 bg-night/40 px-3 py-2.5 text-left ${off ? 'opacity-45' : ''}`}
              >
                <span aria-hidden className="text-2xl">
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{label}</span>
                  <span className="block text-xs text-muted">
                    {kind === 'voice' && !viet
                      ? 'Máy chưa có giọng tiếng Việt — thêm trong cài đặt máy (Ngôn ngữ / Đọc văn bản)'
                      : off
                        ? 'Bật Giọng đọc để dùng'
                        : hint}
                  </span>
                </span>
                {/* Công tắc */}
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-mint' : 'bg-line'}`}>
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-cream shadow transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`}
                  />
                </span>
              </button>
            )
          })}
        </div>
        <Button className="mt-3 w-full" onClick={onClose}>
          Xong
        </Button>
      </div>
    </div>,
    document.body,
  )
}
