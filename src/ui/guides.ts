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

// ---------- Người chơi (bàn nhiều người): bấm để trả, kéo để trả, kéo về để đòi ----------

const PLAYER_START: GuideStep[] = [
  { id: 'me', target: 'me', title: 'Đây là bạn', text: 'Chỗ của bạn luôn ở dưới cùng bàn.' },
  {
    id: 'tap-pay',
    demo: { kind: 'tap', at: 'other' },
    title: 'Bấm người = trả kẹo',
    text: 'Bấm vào người khác → chọn số kẹo → xong. Popup gợi ý sẵn mức hay dùng.',
  },
  {
    id: 'drag-pay',
    demo: { kind: 'drag', from: 'me', to: 'other' },
    title: 'Hoặc kéo kẹo sang',
    text: 'Kéo từ chỗ bạn thả vào người nhận — cũng là trả kẹo.',
  },
  {
    id: 'drag-ask',
    demo: { kind: 'drag', from: 'other', to: 'me' },
    title: 'Kéo về mình = đòi',
    text: 'Kéo người khác về chỗ bạn để đòi kẹo. Họ bấm OK thì kẹo mới chuyển.',
  },
]

const PLAYER_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [],
  xidach: [{ id: 'xidach-bet', demo: { kind: 'tap', at: 'bet' }, title: 'Đặt cược', text: 'Bấm ô Bet để đặt cược cho mình. Nhà cái có nơ xanh, không đặt cược.' }],
  poker: [{ id: 'poker-turn', target: 'actions', title: 'Tới lượt bạn', text: 'Người viền xanh đang tới lượt: Bỏ bài · Theo · Tố · All-in. App tự tính pot.' }],
  loto: [{ id: 'loto-buy', demo: { kind: 'tap', at: 'buy' }, title: 'Mua tờ', text: 'Bấm ô Mua (ghi giá mỗi tờ) → chọn số tờ. Mua rồi bấm lại để đổi số tờ.' }],
  free: [{ id: 'free-bet', demo: { kind: 'tap', at: 'pot' }, title: 'Cược', text: 'Bấm Pot để cược. Số kẹo mỗi người đã cược hiện trước chỗ ngồi.' }],
}

const PLAYER_END: GuideStep[] = [
  { id: 'log', target: 'log', title: 'Trả/nhận', text: 'Lịch sử kẹo của bạn. Lỡ tay thì bấm ↩ để xin host hoàn tác.' },
  { id: 'requests', target: 'requests', title: 'Ai đòi bạn', text: 'Lời đòi kẹo hiện ở đây (số đỏ) — bấm OK để trả. Xem lại hướng dẫn: nút ? trên cùng.' },
]

// ---------- Host: điều khiển ván + những việc chỉ host làm ----------

const HOST_START: GuideStep[] = [
  { id: 'host-intro', title: 'Bạn là host', text: 'Bạn mở / chốt ván cho cả bàn. Mọi người tự trả, tự đòi kẹo trên máy mình.' },
]

const HOST_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [{ id: 'tienlen-round', target: 'actions', title: 'Ván', text: '+ Mở ván → trả kẹo → Chốt ván. Nhầm thì Hủy ván.' }],
  xidach: [
    { id: 'xidach-round', target: 'actions', title: 'Một nút', text: 'Chốt cược → Kết thúc → ván mới tự mở, giữ cược cũ.' },
    { id: 'xidach-dealer', demo: { kind: 'drag', from: 'hat', to: 'other' }, title: 'Đổi nhà cái', text: 'Kéo 🎩 thả vào người mới (hoặc bấm 🎩 rồi chọn), trước khi chốt cược.' },
  ],
  poker: [{ id: 'poker-hand', target: 'actions', title: 'Tay bài', text: 'Tay mới tự xoay nút D và bỏ blind. Tới Showdown bấm người bài mạnh nhất — app tự chia pot.' }],
  loto: [
    { id: 'loto-lock', target: 'actions', title: 'Chốt', text: 'Mọi người mua tờ xong thì bấm Chốt.' },
    { id: 'loto-award', demo: { kind: 'drag', from: 'pot', to: 'other' }, title: 'Trao pot', text: 'Có người kinh: kéo Pot thả vào người đó (hoặc bấm Pot → chọn người).' },
  ],
  free: [
    { id: 'free-lock', target: 'actions', title: 'Chốt cược', text: 'Cược xong thì Chốt cược. Nhầm thì Bỏ chốt / Hủy ván.' },
    { id: 'free-award', demo: { kind: 'drag', from: 'pot', to: 'other' }, title: 'Trao thưởng', text: 'Kéo Pot thả vào người thắng. Pot hết là xong ván.' },
  ],
}

const HOST_END: GuideStep[] = [
  { id: 'settings', target: 'settings', title: 'Luật', text: 'Chỉnh mức cược / giá của mode này.' },
  { id: 'players', target: 'players', title: 'Người chơi', text: '💤 cho nghỉ, 🛎️ chuyển host, vuốt trái để xóa. Người mới tự join bằng mã.' },
  { id: 'host-undo', target: 'host', title: 'Duyệt hoàn tác', text: 'Ai xin hoàn tác hiện ở đây — duyệt từng cái hoặc OK tất cả. Chốt nhầm ván: nút ⏮ cạnh nút chính.' },
]

// ---------- Bàn một máy: host ghi hộ cả bàn ----------

const SOLO_START: GuideStep[] = [
  { id: 'solo-intro', title: 'Bạn ghi hộ cả bàn', text: 'Một máy cho cả bàn: bạn kéo thay mọi người, không ai phải bấm xác nhận.' },
  {
    id: 'solo-drag',
    demo: { kind: 'drag', from: 'other', to: 'me' },
    title: 'Kéo = ai trả ai',
    text: 'Kéo từ người trả thả vào người nhận → chọn số kẹo. Kéo giữa hai người bất kỳ cũng được.',
  },
]

const SOLO_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [],
  xidach: [{ id: 'solo-xidach-bet', demo: { kind: 'drag', from: 'other', to: 'bet' }, title: 'Đặt cược hộ', text: 'Kéo người chơi thả vào ô Bet để đặt cược cho họ.' }],
  poker: [{ id: 'solo-poker-turn', target: 'actions', title: 'Bấm hộ lượt', text: 'Người viền xanh đang tới lượt — bấm Bỏ bài · Theo · Tố · All-in thay họ.' }],
  loto: [{ id: 'solo-loto-buy', demo: { kind: 'drag', from: 'other', to: 'buy' }, title: 'Mua tờ hộ', text: 'Kéo người chơi thả vào ô Mua → chọn số tờ.' }],
  free: [{ id: 'solo-free-bet', demo: { kind: 'drag', from: 'other', to: 'pot' }, title: 'Cược hộ', text: 'Kéo người chơi thả vào Pot để cược cho họ.' }],
}

const SOLO_END: GuideStep[] = [
  { id: 'solo-log', target: 'log', title: 'Trả/nhận cả bàn', text: 'Mọi lượt trả kẹo của cả bàn. Lỡ tay thì bấm ↩ để hoàn tác.' },
  { id: 'settings', target: 'settings', title: 'Luật', text: 'Chỉnh mức cược / giá của mode này.' },
  { id: 'solo-players', target: 'players', title: 'Người chơi', text: 'Thêm người, 💤 cho nghỉ, vuốt trái để xóa.' },
]

export function guideSteps(game: GameType, role: GuideRole, solo = false): GuideStep[] {
  if (solo) return [...SOLO_START, ...SOLO_GAME[game], ...HOST_GAME[game], ...SOLO_END]
  return role === 'host'
    ? [...HOST_START, ...HOST_GAME[game], ...HOST_END]
    : [...PLAYER_START, ...PLAYER_GAME[game], ...PLAYER_END]
}

// ---------- Đã xem bước nào (trên máy này) ----------

const SEEN_KEY = 'candypot:guide-steps-seen'
/** Bản cũ: đã xem cả bộ theo `game:vai:v2` → coi như đã xem mọi bước của bộ đó. */
const OLD_SEEN_KEY = 'candypot:guides-seen'

function readList(key: string): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function seenIds(): Set<string> {
  const seen = new Set(readList(SEEN_KEY))
  for (const entry of readList(OLD_SEEN_KEY)) {
    const [game, role] = entry.split(':') as [GameType, GuideRole]
    if ((role === 'player' || role === 'host') && game in HOST_GAME) guideSteps(game, role).forEach((s) => seen.add(s.id))
  }
  return seen
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
