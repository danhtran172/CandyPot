import type { GameType } from '../core/types'

/**
 * Hướng dẫn trên bàn chơi: mỗi bước chỉ vào phần tử có `data-guide="<target>"` (không có = thẻ giữa màn hình).
 * `demo`: bàn tay mẫu làm thử ngay trên bàn — bấm vào một chỗ, hoặc kéo gói kẹo từ chỗ này sang chỗ kia.
 * Bước không tìm thấy phần tử (vd chưa có ván) thì tự bỏ qua.
 */
export type GuideRole = 'player' | 'host'

export interface GuideStep {
  target?: string
  demo?: { kind: 'tap'; at: string } | { kind: 'drag'; from: string; to: string }
  title: string
  text: string
}

// ---------- Người chơi: 3 thao tác cốt lõi (bấm để trả, kéo để trả, kéo về để đòi) ----------

const PLAYER_START: GuideStep[] = [
  { target: 'me', title: 'Đây là bạn', text: 'Chỗ của bạn luôn ở dưới cùng bàn.' },
  {
    demo: { kind: 'tap', at: 'other' },
    title: 'Bấm người = trả kẹo',
    text: 'Bấm vào người khác → chọn số kẹo → xong. Popup gợi ý sẵn mức hay dùng.',
  },
  {
    demo: { kind: 'drag', from: 'me', to: 'other' },
    title: 'Hoặc kéo kẹo sang',
    text: 'Kéo từ chỗ bạn thả vào người nhận — cũng là trả kẹo.',
  },
  {
    demo: { kind: 'drag', from: 'other', to: 'me' },
    title: 'Kéo về mình = đòi',
    text: 'Kéo người khác về chỗ bạn để đòi kẹo. Họ bấm OK thì kẹo mới chuyển.',
  },
]

const PLAYER_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [],
  xidach: [{ demo: { kind: 'tap', at: 'bet' }, title: 'Đặt cược', text: 'Bấm ô Bet để đặt cược cho mình. Nhà cái có nơ xanh, không đặt cược.' }],
  poker: [{ target: 'actions', title: 'Tới lượt bạn', text: 'Người viền xanh đang tới lượt: Bỏ bài · Theo · Tố · All-in. App tự tính pot.' }],
  loto: [{ demo: { kind: 'tap', at: 'pot' }, title: 'Mua tờ', text: 'Bấm Pot → chọn số tờ, app tự tính kẹo theo giá.' }],
  free: [{ demo: { kind: 'tap', at: 'pot' }, title: 'Cược', text: 'Bấm Pot để cược. Số kẹo mỗi người đã cược hiện trước chỗ ngồi.' }],
}

const PLAYER_END: GuideStep[] = [
  { target: 'log', title: 'Trả/nhận', text: 'Lịch sử kẹo của bạn. Lỡ tay thì bấm ↩ để xin host hoàn tác.' },
  { target: 'requests', title: 'Ai đòi bạn', text: 'Lời đòi kẹo hiện ở đây (số đỏ) — bấm OK để trả. Xem lại hướng dẫn: nút ? trên cùng.' },
]

// ---------- Host: điều khiển ván + những việc chỉ host làm ----------

const HOST_START: GuideStep[] = [{ title: 'Bạn là host', text: 'Bạn mở / chốt ván cho cả bàn. Mọi người tự trả, tự đòi kẹo trên máy mình.' }]

const HOST_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [{ target: 'actions', title: 'Ván', text: '+ Mở ván → mọi người trả kẹo → Chốt ván. Nhầm thì Hủy ván.' }],
  xidach: [
    { target: 'actions', title: 'Một nút', text: 'Chốt cược → Kết thúc → ván mới tự mở, giữ cược cũ.' },
    { demo: { kind: 'drag', from: 'hat', to: 'other' }, title: 'Đổi nhà cái', text: 'Kéo 🎩 thả vào người mới (hoặc bấm 🎩 rồi chọn), trước khi chốt cược.' },
  ],
  poker: [{ target: 'actions', title: 'Tay bài', text: 'Tay mới tự xoay nút D và bỏ blind. Tới Showdown bấm người bài mạnh nhất — app tự chia pot.' }],
  loto: [
    { target: 'actions', title: 'Chốt', text: 'Mọi người mua tờ xong thì bấm Chốt.' },
    { demo: { kind: 'drag', from: 'pot', to: 'other' }, title: 'Trao pot', text: 'Có người kinh: kéo Pot thả vào người đó (hoặc bấm Pot → chọn người).' },
  ],
  free: [
    { target: 'actions', title: 'Chốt cược', text: 'Cược xong thì Chốt cược. Nhầm thì Bỏ chốt / Hủy ván.' },
    { demo: { kind: 'drag', from: 'pot', to: 'other' }, title: 'Trao thưởng', text: 'Kéo Pot thả vào người thắng. Pot hết là xong ván.' },
  ],
}

const HOST_END: GuideStep[] = [
  { target: 'settings', title: 'Luật', text: 'Chỉnh mức cược / giá của mode này.' },
  { target: 'players', title: 'Người chơi', text: 'Thêm người, 💤 cho nghỉ, 🛎️ chuyển host, vuốt trái để xóa.' },
  { target: 'host', title: 'Duyệt hoàn tác', text: 'Ai xin hoàn tác hiện ở đây — duyệt từng cái hoặc OK tất cả. Chốt nhầm ván: nút ⏮ cạnh nút chính.' },
]

export function guideSteps(game: GameType, role: GuideRole): GuideStep[] {
  return role === 'host'
    ? [...HOST_START, ...HOST_GAME[game], ...HOST_END]
    : [...PLAYER_START, ...PLAYER_GAME[game], ...PLAYER_END]
}

/** Đã xem hướng dẫn nào trên máy này (theo game + vai trò). Đổi bản khi viết lại hướng dẫn → mọi người xem lại một lần. */
const SEEN_KEY = 'candypot:guides-seen'
const VERSION = 'v2'

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function guideSeen(game: GameType, role: GuideRole): boolean {
  return readSeen().includes(`${game}:${role}:${VERSION}`)
}

export function markGuideSeen(game: GameType, role: GuideRole): void {
  try {
    const seen = new Set(readSeen()).add(`${game}:${role}:${VERSION}`)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // Không lưu được thì lần sau hiện lại hướng dẫn — không sao
  }
}
