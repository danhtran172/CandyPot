import { useEffect } from 'react'
import { onDuck, setSoundPref, useSoundPrefs } from './sound'

/**
 * Nhạc nền lúc chơi: tự tạo bằng Web Audio (không cần file nhạc), hai kiểu:
 * - êm dịu: vòng hợp âm nhẹ kiểu lo-fi — pad êm, bass, nốt rải, hi-hat nhỏ;
 * - kịch tính: giọng thứ, nhanh hơn — trống dồn, bass móc đơn, nốt nhặt liên tục, dây căng.
 * Phát lặp vô hạn, nhỏ tiếng. Đổi kiểu thì sang đúng đầu ô nhịp kế tiếp cho liền mạch.
 */

export type MusicMood = 'calm' | 'tense'

const BPM = 88
const BEAT = 60 / BPM
const TENSE_BEAT = 60 / 122
/** Kịch tính: La thứ — Am · F · Dm · E (E trưởng kéo về Am cho căng). */
const TENSE = [
  [45, 52, 57, 60],
  [41, 48, 53, 57],
  [38, 50, 53, 57],
  [40, 47, 52, 56],
]
/** Nốt nhặt 16 móc kép trong một ô nhịp (chỉ số vào hợp âm). */
const OSTINATO = [0, 2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 2, 1, 3, 2, 3]
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
  /** Kiểu nhạc cho các ô nhịp sắp xếp lịch. */
  mood: MusicMood = 'calm'

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

  /** Trống trầm: sóng sin tụt nhanh từ 150 xuống 45 Hz. */
  private kick(at: number, vol: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.frequency.setValueAtTime(150, at)
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.16)
    env.gain.setValueAtTime(vol, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
    osc.connect(env).connect(this.master!)
    osc.start(at)
    osc.stop(at + 0.22)
  }

  /** Trống con: nhiễu dải giữa, ngắn. */
  private snare(at: number, vol: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    const env = ctx.createGain()
    env.gain.setValueAtTime(vol, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
    src.connect(bp).connect(env).connect(this.master!)
    src.start(at)
    src.stop(at + 0.14)
  }

  /** Xếp lịch một ô nhịp kịch tính bắt đầu ở `t`; trả về độ dài ô nhịp. */
  private scheduleTense(t: number) {
    const B = TENSE_BEAT
    const chord = TENSE[this.bar % 4]
    // Dây căng: hợp âm ngân cả ô nhịp
    for (const m of chord.slice(1)) this.note(m + 12, t, 4 * B * 1.05, 'sawtooth', 0.012, 0.2)
    for (let i = 0; i < 4; i++) {
      const at = t + i * B
      this.kick(at, 0.5)
      if (i % 2) this.snare(at, 0.12)
    }
    // Bass móc đơn, nhảy quãng tám ở phách nghịch
    for (let i = 0; i < 8; i++) this.note(chord[0] - 12 + (i % 2 ? 12 : 0), t + (i * B) / 2, B * 0.4, 'square', 0.05, 0.005)
    // Nốt nhặt móc kép
    OSTINATO.forEach((k, i) => this.note(chord[k] + 24, t + (i * B) / 4, B * 0.2, 'square', i % 4 === 0 ? 0.03 : 0.018, 0.004))
    // Hi-hat móc đơn, nhấn phách nghịch
    for (let i = 0; i < 8; i++) this.hat(t + (i * B) / 2, i % 2 ? 0.06 : 0.035)
    // Ô cuối vòng: dồn trống con dẫn về đầu vòng
    if (this.bar % 4 === 3) for (let i = 0; i < 4; i++) this.snare(t + 3 * B + (i * B) / 4, 0.06 + i * 0.03)
    this.bar++
    return 4 * B
  }

  /** Xếp lịch một ô nhịp bắt đầu ở `t` (theo kiểu nhạc hiện tại); trả về độ dài ô nhịp. */
  private scheduleBar(t: number): number {
    if (this.mood === 'tense') return this.scheduleTense(t)
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
    return barLen
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
      // Chỉ xếp ô nhịp sắp tới (trước ~0.4 giây) → đổi kiểu nhạc là có hiệu lực ngay ô nhịp sau
      while (this.nextBar < this.ctx.currentTime + 0.4) {
        this.nextBar += this.scheduleBar(this.nextBar)
      }
    }
    tick()
    this.timer = window.setInterval(tick, 200)
  }

  /** Đang đọc số / thông báo → nhỏ nhạc xuống cho nghe rõ; đọc xong thì to lại. */
  duck(on: boolean) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(on ? 0.04 : 0.16, t, 0.15)
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
onDuck((on) => music.duck(on))

/**
 * Nhạc nền ở màn đang dùng hook này, kiểu `mood` (bật / tắt trong bảng Âm thanh, nhớ trên máy, mặc định bật). Trình duyệt chỉ cho
 * phát sau lần chạm đầu tiên → chờ chạm rồi mới phát; ẩn app thì dừng, mở lại thì phát tiếp.
 */
export function useMusic(mood: MusicMood = 'calm') {
  const on = useSoundPrefs().music
  useEffect(() => {
    music.mood = mood
  }, [mood])
  useEffect(() => {
    if (!on) return
    const play = () => {
      if (!document.hidden) music.start()
    }
    const onVisibility = () => (document.hidden ? music.stop() : play())
    // Đã chạm vào trang rồi (vd vừa chuyển màn / vừa bấm bật) thì phát luôn; chưa thì chờ một lần chạm (trình duyệt chặn tự phát)
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) play()
    window.addEventListener('pointerdown', play, { once: true, capture: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointerdown', play, { capture: true })
      document.removeEventListener('visibilitychange', onVisibility)
      music.stop()
    }
  }, [on])
  return [on, () => setSoundPref('music', !on)] as const
}
