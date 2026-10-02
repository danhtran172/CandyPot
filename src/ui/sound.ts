import { useSyncExternalStore } from 'react'

/**
 * Âm thanh của app: cài đặt (nhạc nền / hiệu ứng / giọng đọc — nhớ trên máy), hiệu ứng tạo bằng Web Audio
 * (không cần file) và giọng đọc tiếng Việt có sẵn của máy (Web Speech) — không tốn dung lượng, không tốn mạng.
 */

export type SoundKind = 'music' | 'sfx' | 'voice' | 'rhyme'
export type SoundPrefs = Record<SoundKind, boolean>

const KEYS: Record<SoundKind, string> = {
  music: 'candypot:music',
  sfx: 'candypot:sfx',
  voice: 'candypot:voice',
  /** Giọng đọc lô tô kiểu rao hội chợ (câu vần) thay vì chỉ đọc số. */
  rhyme: 'candypot:loto-rhyme',
}

function read(): SoundPrefs {
  const get = (k: SoundKind) => {
    try {
      return localStorage.getItem(KEYS[k]) !== '0'
    } catch {
      return true
    }
  }
  return { music: get('music'), sfx: get('sfx'), voice: get('voice'), rhyme: get('rhyme') }
}

let prefs = read()
const listeners = new Set<() => void>()

export function setSoundPref(kind: SoundKind, on: boolean) {
  prefs = { ...prefs, [kind]: on }
  try {
    localStorage.setItem(KEYS[kind], on ? '1' : '0')
  } catch {
    /* không nhớ được thì thôi */
  }
  if (kind === 'voice' && !on) window.speechSynthesis?.cancel()
  listeners.forEach((l) => l())
}

/** Cài đặt âm thanh lúc này (đọc một lần, không theo dõi). */
export const soundPrefs = () => prefs

/** Cài đặt âm thanh hiện tại (tự cập nhật khi đổi). */
export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => prefs,
    () => prefs,
  )
}

// ---------- Hiệu ứng (Web Audio) ----------

let ctx: AudioContext | null = null
let out: GainNode | null = null
let noise: AudioBuffer | null = null

function audio() {
  if (!prefs.sfx || document.hidden) return null
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    out = ctx.createGain()
    out.gain.value = 0.5
    out.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Một tiếng "xoẹt" / "bộp": nhiễu qua bộ lọc, đường bao ngắn. */
function burst(at: number, { type = 'bandpass', freq = 2000, q = 1, dur = 0.08, vol = 0.5, sweepTo }: Burst) {
  const c = ctx!
  const src = c.createBufferSource()
  src.buffer = noise
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, at)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur)
  f.Q.value = q
  const env = c.createGain()
  env.gain.setValueAtTime(vol, at)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(f).connect(env).connect(out!)
  src.start(at, Math.random() * 0.3)
  src.stop(at + dur + 0.02)
}
interface Burst {
  type?: BiquadFilterType
  freq?: number
  q?: number
  dur?: number
  vol?: number
  sweepTo?: number
}

/** Một nốt ngắn (dao động + đường bao). */
function tone(at: number, hz: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number) {
  const c = ctx!
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(hz, at)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
  const env = c.createGain()
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(vol, at + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(env).connect(out!)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

export const sfx = {
  /** Đánh bài xuống bàn: mỗi lá một tiếng "bộp", lá cuối đậm hơn. */
  play(count = 1) {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.01
    for (let i = 0; i < Math.min(count, 6); i++) {
      const at = t + i * 0.045
      const last = i === Math.min(count, 6) - 1
      burst(at, { freq: 1800, q: 0.8, dur: last ? 0.11 : 0.06, vol: last ? 0.9 : 0.5 })
      if (last) tone(at, 140, 0.09, 0.35, 'sine', 70)
    }
  },
  /** Bỏ lượt: hai tiếng gõ bàn nhẹ. */
  pass() {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.01
    tone(t, 220, 0.07, 0.25, 'triangle', 120)
    tone(t + 0.12, 200, 0.07, 0.2, 'triangle', 110)
  },
  /** Rút / chia một lá: tiếng "xoẹt" ngắn. */
  draw() {
    const c = audio()
    if (!c) return
    burst(c.currentTime + 0.01, { type: 'highpass', freq: 1500, dur: 0.14, vol: 0.45, sweepTo: 5000 })
  },
  /** Một lá đáp xuống lúc chia bài (nhỏ, nhanh). */
  tick() {
    const c = audio()
    if (!c) return
    burst(c.currentTime + 0.005, { freq: 2600, q: 1.2, dur: 0.035, vol: 0.28 })
  },
  /** Lật bài (xét / lật bài cái). */
  flip() {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.01
    burst(t, { type: 'highpass', freq: 3000, dur: 0.07, vol: 0.4, sweepTo: 1200 })
    burst(t + 0.07, { freq: 1600, dur: 0.06, vol: 0.5 })
  },
  /** Lô tô: viên số lăn ra khỏi túi. */
  ball() {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.01
    burst(t, { freq: 900, q: 0.7, dur: 0.18, vol: 0.25 })
    tone(t + 0.12, 880, 0.16, 0.3, 'sine', 330)
    tone(t + 0.3, 520, 0.1, 0.18, 'sine', 300)
  },
  /** Thắng (kinh / về Nhất): vài nốt đi lên. */
  win() {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.02
    ;[523, 659, 784, 1047].forEach((hz, i) => tone(t + i * 0.11, hz, i === 3 ? 0.5 : 0.18, 0.28, 'triangle'))
  },
}

// ---------- Giọng đọc (Web Speech, tiếng Việt) ----------

/** Báo cho nhạc nền nhỏ lại lúc đang đọc. */
const duckers = new Set<(on: boolean) => void>()
export const onDuck = (cb: (on: boolean) => void) => {
  duckers.add(cb)
  return () => duckers.delete(cb)
}

function viVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null
}

/** Đọc một câu bằng giọng tiếng Việt của máy. Máy không có giọng Việt thì thôi (không đọc sai giọng). */
export function speak(text: string) {
  const synth = window.speechSynthesis
  if (!prefs.voice || !synth || document.hidden) return
  const voice = viVoice()
  if (!voice) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice.lang
  try {
    u.voice = voice
  } catch {
    // Một số trình duyệt không cho gán giọng → đọc theo `lang`
  }
  u.rate = 0.95
  u.onstart = () => duckers.forEach((d) => d(true))
  u.onend = u.onerror = () => {
    if (!synth.speaking) duckers.forEach((d) => d(false))
  }
  synth.speak(u)
}

/** Máy có giọng tiếng Việt không (danh sách giọng có thể nạp chậm — gọi lại sau là đúng). */
export const hasVietVoice = () => !!viVoice()

// iOS / một số trình duyệt chỉ cho phát tiếng / đọc sau lần chạm đầu → mở khóa ở lần chạm đầu tiên
if (typeof window !== 'undefined') {
  window.speechSynthesis?.getVoices()
  window.addEventListener(
    'pointerdown',
    () => {
      if (prefs.sfx) audio()
      if (prefs.voice && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        window.speechSynthesis.speak(u)
      }
    },
    { once: true, capture: true },
  )
}
