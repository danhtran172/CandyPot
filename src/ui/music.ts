import { useEffect, useState } from 'react'

/**
 * Nhạc nền lúc chơi: tự tạo bằng Web Audio (không cần file nhạc) — vòng hợp âm nhẹ kiểu lo-fi:
 * pad êm, bass, nốt rải và tiếng hi-hat nhỏ. Phát lặp vô hạn, nhỏ tiếng, không lấn tiếng nói chuyện.
 */

const BPM = 88
const BEAT = 60 / BPM
/** Mỗi ô nhịp một hợp âm (MIDI), hai vòng xen kẽ cho đỡ nhàm. */
const PROGRESSIONS = [
  [
    [48, 55, 59, 64], // Cmaj7
    [45, 52, 55, 60], // Am7
    [50, 57, 60, 65], // Dm7
    [43, 50, 53, 59], // G7
  ],
  [
    [41, 48, 52, 57], // Fmaj7
    [40, 47, 50, 55], // Em7
    [45, 52, 55, 60], // Am7
    [43, 50, 53, 59], // G7
  ],
]
/** Thứ tự nốt rải trong một ô nhịp (8 móc đơn), chỉ số vào hợp âm (+12 = lên một quãng tám). */
const ARP = [0, 2, 1, 3, 2, 3, 1, 2]

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

class Music {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer = 0
  private nextBar = 0
  private bar = 0
  playing = false

  private setup() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = 0.16
    // Lọc bớt tiếng chói cho êm
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    master.connect(tone).connect(ctx.destination)
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.ctx = ctx
    this.master = master
    this.noise = noise
    return ctx
  }

  /** Một nốt: dao động + đường bao âm lượng (tấn công / nhả). */
  private note(midi: number, at: number, dur: number, type: OscillatorType, vol: number, attack = 0.01) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq(midi)
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(vol, at + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(env).connect(this.master!)
    osc.start(at)
    osc.stop(at + dur + 0.05)
  }

  private hat(at: number, vol: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7000
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.06)
    src.connect(hp).connect(env).connect(this.master!)
    src.start(at)
    src.stop(at + 0.08)
  }

  /** Xếp lịch một ô nhịp bắt đầu ở `t`. */
  private scheduleBar(t: number) {
    const prog = PROGRESSIONS[Math.floor(this.bar / 4) % PROGRESSIONS.length]
    const chord = prog[this.bar % 4]
    const barLen = 4 * BEAT
    // Pad: cả hợp âm, vào chậm, ngân hết ô nhịp
    for (const m of chord.slice(1)) this.note(m + 12, t, barLen * 1.05, 'triangle', 0.035, 0.35)
    // Bass: phách 1 và 3
    this.note(chord[0] - 12, t, BEAT * 1.6, 'sine', 0.22, 0.02)
    this.note(chord[0] - 12, t + 2 * BEAT, BEAT * 1.6, 'sine', 0.18, 0.02)
    // Nốt rải (móc đơn, hơi swing)
    ARP.forEach((k, i) => {
      const swing = i % 2 ? BEAT * 0.08 : 0
      const at = t + (i * BEAT) / 2 + swing
      this.note(chord[k] + 24, at, BEAT * 0.45, 'sine', 0.05 + (i % 4 === 0 ? 0.02 : 0))
    })
    // Hi-hat nhẹ ở phách nghịch
    for (let i = 0; i < 4; i++) this.hat(t + i * BEAT + BEAT / 2, 0.035)
    this.bar++
  }

  start() {
    const ctx = this.setup()
    if (!ctx || this.playing) return
    this.playing = true
    void ctx.resume()
    this.nextBar = ctx.currentTime + 0.1
    // Xếp lịch trước ~1 ô nhịp; kiểm tra mỗi 200ms
    const tick = () => {
      if (!this.ctx) return
      while (this.nextBar < this.ctx.currentTime + 4 * BEAT) {
        this.scheduleBar(this.nextBar)
        this.nextBar += 4 * BEAT
      }
    }
    tick()
    this.timer = window.setInterval(tick, 200)
  }

  stop() {
    if (!this.playing) return
    this.playing = false
    window.clearInterval(this.timer)
    // Đóng hẳn để tắt ngay các nốt đã xếp lịch; lần sau tạo lại
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }
}

const music = new Music()
const KEY = 'candypot:music'

function readOn() {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

/**
 * Nhạc nền ở màn đang dùng hook này: bật / tắt (nhớ trên máy, mặc định bật). Trình duyệt chỉ cho phát
 * sau lần chạm đầu tiên → chờ chạm rồi mới phát; ẩn app thì dừng, mở lại thì phát tiếp.
 */
export function useMusic() {
  const [on, setOn] = useState(readOn)
  useEffect(() => {
    if (!on) return
    const play = () => {
      if (!document.hidden) music.start()
    }
    const onVisibility = () => (document.hidden ? music.stop() : play())
    // Đã chạm vào trang rồi (vd vừa chuyển màn) thì phát luôn; chưa thì chờ một lần chạm (trình duyệt chặn tự phát)
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) play()
    window.addEventListener('pointerdown', play, { once: true, capture: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointerdown', play, { capture: true })
      document.removeEventListener('visibilitychange', onVisibility)
      music.stop()
    }
  }, [on])
  const toggle = () => {
    const next = !on
    setOn(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* không nhớ được thì thôi */
    }
    // Bấm nút cũng là một lần chạm → bật thì phát luôn
    if (next) music.start()
    else music.stop()
  }
  return [on, toggle] as const
}
