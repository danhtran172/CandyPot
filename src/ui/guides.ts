import type { GameType } from '../core/types'

/**
 * Hướng dẫn trên bàn chơi: mỗi bước chỉ vào phần tử có `data-guide="<target>"` (không có = thẻ giữa màn hình).
 * `demo`: bàn tay mẫu làm thử ngay trên bàn — bấm vào một chỗ, hoặc kéo gói kẹo từ chỗ này sang chỗ kia.
 * Bước không tìm thấy phần tử (vd chưa có ván) thì tự bỏ qua.
 *
 * Mỗi bước có `id` riêng cho một tính năng: tự hiện đúng một lần trong suốt quá trình dùng app, lúc người dùng
 * lần đầu gặp tính năng đó (bước giống nhau giữa các game chỉ hiện một lần). Nút ? xem lại toàn bộ.
 */
export type GuideRole = 'player' | 'host'

export interface GuideStep {
  id: string
  target?: string
  demo?: { kind: 'tap'; at: string } | { kind: 'drag'; from: string; to: string }
  title: string
  text: string
}

/**
 * Người chơi giả "🤖 Bot demo": chỉ ngồi vào bàn trong lúc hướng dẫn, để bàn tay mẫu luôn có người làm thử
 * (kể cả bàn mới chỉ có mình). Chỗ ngồi của bot mang `data-guide="other"`.
 */
export const DEMO_ID = '__demo-bot'
const DEMO_TARGET = 'other'

// ---------- Thao tác cơ bản (ai cũng xem) — làm mẫu với Bot demo ----------

const BASICS: GuideStep[] = [
  {
    id: 'v3-me',
    target: 'me',
    title: 'Đây là bạn',
    text: 'Chỗ của bạn luôn ở dưới cùng bàn. 🤖 Bot demo chỉ ngồi vào lúc hướng dẫn để làm mẫu.',
  },
  {
    id: 'v3-tap-pay',
    demo: { kind: 'tap', at: 'other' },
    title: 'Bấm người = trả kẹo',
    text: 'Bấm vào người khác (ở đây là Bot demo) → chọn số kẹo → xong. Popup gợi ý sẵn mức hay dùng.',
  },
  {
    id: 'v3-drag-pay',
    demo: { kind: 'drag', from: 'me', to: 'other' },
    title: 'Hoặc kéo kẹo sang',
    text: 'Kéo từ chỗ bạn thả vào người nhận — cũng là trả kẹo.',
  },
  {
    id: 'v3-drag-ask',
    demo: { kind: 'drag', from: 'other', to: 'me' },
    title: 'Kéo về mình = đòi',
    text: 'Kéo người khác về chỗ bạn để đòi kẹo. Họ bấm OK thì kẹo mới chuyển.',
  },
]

// ---------- Người chơi (bàn nhiều người) ----------

const PLAYER_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [],
  xidach: [
    {
      id: 'xidach-bet',
      demo: { kind: 'tap', at: 'bet' },
      title: 'Đặt cược',
      text: 'Bấm ô Bet để đặt cược cho mình. Nhà cái có nơ xanh, không đặt cược.',
    },
  ],
  poker: [
    {
      id: 'poker-turn',
      target: 'actions',
      title: 'Tới lượt bạn',
      text: 'Người viền xanh đang tới lượt: Bỏ bài · Theo · Tố · All-in. App tự tính pot.',
    },
  ],
  loto: [
    {
      id: 'loto-buy',
      demo: { kind: 'tap', at: 'buy' },
      title: 'Mua tờ',
      text: 'Bấm ô Mua (ghi giá mỗi tờ) → chọn tờ. Mua rồi bấm lại để đổi.',
    },
  ],
  free: [
    {
      id: 'free-bet',
      demo: { kind: 'tap', at: 'pot' },
      title: 'Cược',
      text: 'Bấm Pot để cược. Số kẹo mỗi người đã cược hiện trước chỗ ngồi.',
    },
  ],
}

const PLAYER_END: GuideStep[] = [
  { id: 'v3-rule', target: 'rule', title: 'Xem luật', text: 'Rule ? — luật và cách tính kẹo của game đang chơi.' },
  {
    id: 'v3-card-mode-player',
    target: 'card-mode',
    title: 'Bài ngoài hay trên app',
    text: 'Host chọn: Đánh ngoài = chia bài thật, app chỉ ghi kẹo. Trên app = bài hiện trên máy bạn, app tự tính kẹo (thu bài ▾ để bấm các nút khác).',
  },
  { id: 'log', target: 'log', title: 'Trả/nhận', text: 'Lịch sử kẹo của bạn. Lỡ tay thì bấm ↩ để xin host hoàn tác.' },
  {
    id: 'requests',
    target: 'requests',
    title: 'Ai đòi bạn',
    text: 'Lời đòi kẹo hiện ở đây (số đỏ) — bấm OK để trả. Xem lại hướng dẫn: nút ? trên cùng.',
  },
]

// ---------- Host: mời, đổi game, chỉnh luật, mode bài + điều khiển ván ----------

const HOST_START: GuideStep[] = [
  {
    id: 'host-intro',
    title: 'Bạn là host',
    text: 'Bạn mời người chơi, chọn game, mở / chốt ván cho cả bàn. Mọi người tự trả, tự đòi kẹo trên máy mình.',
  },
]

const HOST_SETUP: GuideStep[] = [
  {
    id: 'v3-invite',
    target: 'players',
    title: 'Mời người chơi',
    text: 'Bấm 👥 Người chơi → đưa mã bàn hoặc cho quét mã QR là vào bàn. Ở đó cũng cho nghỉ 💤, chuyển host 🛎️, xóa người.',
  },
  {
    id: 'v3-switch-game',
    target: 'picker',
    title: 'Đổi game',
    text: 'Chạm vào đây để chọn Tiến lên, Xì dách, Poker, Lô tô hay Tự do. Đổi lúc nào cũng được — lời/lỗ cả bàn vẫn cộng dồn.',
  },
  {
    id: 'v3-settings',
    target: 'settings',
    title: 'Chỉnh luật',
    text: 'Bấm ⚙ để đặt mức cược, giá tờ, cách gọi số… của game này. Rule ? bên cạnh để xem luật.',
  },
  {
    id: 'v3-card-mode',
    target: 'card-mode',
    title: 'Bài ngoài hay trên app',
    text: 'Đánh ngoài: chia bài thật, app chỉ ghi kẹo. Trên app: app xào, chia bài, mỗi người cầm bài trên máy mình và app tự tính kẹo. Cả bàn thấy mode đang chọn.',
  },
]

const HOST_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [{ id: 'tienlen-round', target: 'actions', title: 'Ván', text: '+ Mở ván → trả kẹo → Chốt ván. Nhầm thì Hủy ván.' }],
  xidach: [
    { id: 'xidach-round', target: 'actions', title: 'Một nút', text: 'Chốt cược → Kết thúc → ván mới tự mở, giữ cược cũ.' },
    {
      id: 'xidach-dealer',
      demo: { kind: 'drag', from: 'hat', to: 'other' },
      title: 'Đổi nhà cái',
      text: 'Kéo 🎩 thả vào người mới (hoặc bấm 🎩 rồi chọn), trước khi chốt cược. Cái luôn là host: đổi cái là đổi host, đổi host thì host mới làm cái.',
    },
  ],
  poker: [
    {
      id: 'poker-hand',
      target: 'actions',
      title: 'Tay bài',
      text: 'Tay mới tự xoay nút D và bỏ blind. Tới Showdown bấm người bài mạnh nhất — app tự chia pot.',
    },
  ],
  loto: [
    { id: 'loto-lock', target: 'actions', title: 'Chốt', text: 'Mọi người mua tờ xong thì bấm Chốt.' },
    {
      id: 'loto-award',
      demo: { kind: 'drag', from: 'pot', to: 'other' },
      title: 'Trao pot',
      text: 'Có người kinh: kéo Pot thả vào người đó (hoặc bấm Pot → chọn người).',
    },
  ],
  free: [
    { id: 'free-lock', target: 'actions', title: 'Chốt cược', text: 'Cược xong thì Chốt cược. Nhầm thì Bỏ chốt / Hủy ván.' },
    {
      id: 'free-award',
      demo: { kind: 'drag', from: 'pot', to: 'other' },
      title: 'Trao thưởng',
      text: 'Kéo Pot thả vào người thắng. Pot hết là xong ván.',
    },
  ],
}

const HOST_END: GuideStep[] = [
  {
    id: 'host-undo',
    target: 'host',
    title: 'Duyệt hoàn tác',
    text: 'Ai xin hoàn tác hiện ở đây — duyệt từng cái hoặc OK tất cả. Chốt nhầm ván: nút ⏮ cạnh nút chính.',
  },
]

// ---------- Bàn một máy: host ghi hộ cả bàn ----------

const SOLO_START: GuideStep[] = [
  { id: 'solo-intro', title: 'Bạn ghi hộ cả bàn', text: 'Một máy cho cả bàn: bạn kéo thay mọi người, không ai phải bấm xác nhận.' },
  {
    id: 'v3-solo-drag',
    demo: { kind: 'drag', from: 'other', to: 'me' },
    title: 'Kéo = ai trả ai',
    text: 'Kéo từ người trả (ở đây là Bot demo) thả vào người nhận → chọn số kẹo. Kéo giữa hai người bất kỳ cũng được.',
  },
]

const SOLO_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [],
  xidach: [
    {
      id: 'solo-xidach-bet',
      demo: { kind: 'drag', from: 'other', to: 'bet' },
      title: 'Đặt cược hộ',
      text: 'Kéo người chơi thả vào ô Bet để đặt cược cho họ.',
    },
  ],
  poker: [
    {
      id: 'solo-poker-turn',
      target: 'actions',
      title: 'Bấm hộ lượt',
      text: 'Người viền xanh đang tới lượt — bấm Bỏ bài · Theo · Tố · All-in thay họ.',
    },
  ],
  loto: [
    {
      id: 'solo-loto-buy',
      demo: { kind: 'drag', from: 'other', to: 'buy' },
      title: 'Mua tờ hộ',
      text: 'Kéo người chơi thả vào ô Mua → chọn số tờ.',
    },
  ],
  free: [
    {
      id: 'solo-free-bet',
      demo: { kind: 'drag', from: 'other', to: 'pot' },
      title: 'Cược hộ',
      text: 'Kéo người chơi thả vào Pot để cược cho họ.',
    },
  ],
}

const SOLO_SETUP: GuideStep[] = [
  {
    id: 'v3-solo-players',
    target: 'players',
    title: 'Thêm người',
    text: 'Bấm 👥 Người chơi để thêm người, 💤 cho nghỉ, vuốt trái để xóa.',
  },
  HOST_SETUP[1],
  HOST_SETUP[2],
]

const SOLO_END: GuideStep[] = [
  { id: 'solo-log', target: 'log', title: 'Trả/nhận cả bàn', text: 'Mọi lượt trả kẹo của cả bàn. Lỡ tay thì bấm ↩ để hoàn tác.' },
]

export function guideSteps(game: GameType, role: GuideRole, solo = false): GuideStep[] {
  if (solo) return [...SOLO_START, ...SOLO_GAME[game], ...HOST_GAME[game], ...SOLO_SETUP, ...SOLO_END]
  return role === 'host'
    ? [...HOST_START, ...BASICS, ...HOST_SETUP, ...HOST_GAME[game], ...HOST_END]
    : [...BASICS, ...PLAYER_GAME[game], ...PLAYER_END]
}

// ---------- Đã xem bước nào (trên máy này) ----------

/**
 * Đổi tên khóa = cả app xem lại hướng dẫn từ đầu (mọi máy coi như chưa xem bước nào).
 * Lần đổi gần nhất: làm lại hướng dẫn (Bot demo, mời, đổi game, luật, mode bài).
 */
const SEEN_KEY = 'candypot:guide-seen-v3'
/** Các khóa cũ — bỏ đi cho gọn. */
const OLD_KEYS = ['candypot:guide-steps-seen', 'candypot:guides-seen']

function readList(key: string): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function seenIds(): Set<string> {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Chế độ riêng tư: không xóa được thì thôi
  }
  return new Set(readList(SEEN_KEY))
}

/** Các bước người dùng chưa từng xem (lần đầu gặp tính năng). */
export function unseenSteps(steps: GuideStep[]): GuideStep[] {
  const seen = seenIds()
  return steps.filter((s) => !seen.has(s.id))
}

export function markStepsSeen(steps: GuideStep[]): void {
  try {
    const seen = new Set(readList(SEEN_KEY))
    steps.forEach((s) => seen.add(s.id))
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // Không lưu được thì lần sau hiện lại hướng dẫn — không sao
  }
}

// ---------- Bước nào đang hiện được trên màn hình ----------

const byGuide = (name: string | undefined) => (name ? document.querySelector<HTMLElement>(`[data-guide="${name}"]`) : null)

/** Các phần tử một bước cần chỉ vào (phần tử chính, hoặc điểm đầu / cuối của bàn tay mẫu). */
export function elementsOf(step: GuideStep): (HTMLElement | null)[] {
  if (step.demo?.kind === 'tap') return [byGuide(step.demo.at)]
  if (step.demo?.kind === 'drag') return [byGuide(step.demo.from), byGuide(step.demo.to)]
  return step.target ? [byGuide(step.target)] : []
}

/** Bước hiện được: thẻ giữa màn hình, hoặc đủ phần tử trên màn hình. */
export const onScreen = (step: GuideStep) => elementsOf(step).every(Boolean)

/** Tên các phần tử (`data-guide`) một bước cần. */
const namesOf = (step: GuideStep): string[] =>
  step.demo?.kind === 'tap'
    ? [step.demo.at]
    : step.demo?.kind === 'drag'
      ? [step.demo.from, step.demo.to]
      : step.target
        ? [step.target]
        : []

/** Bước hướng dẫn được: như `onScreen`, nhưng chỗ của Bot demo luôn coi như có (bot ngồi vào khi hướng dẫn bắt đầu). */
export const canShow = (step: GuideStep) => namesOf(step).every((n) => n === DEMO_TARGET || !!byGuide(n))
