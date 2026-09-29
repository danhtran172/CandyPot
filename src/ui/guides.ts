import type { GameType } from '../core/types'

/**
 * Hướng dẫn trên bàn chơi: mỗi bước chỉ vào một phần tử có `data-guide="<target>"`.
 * Bước không tìm thấy phần tử (vd chưa có ván) thì tự bỏ qua; `target` rỗng = thẻ giữa màn hình.
 */
export type GuideRole = 'player' | 'host'

export interface GuideStep {
  target?: string
  title: string
  text: string
}

const PLAYER_START: GuideStep[] = [
  { target: 'picker', title: 'Chọn game', text: 'Đổi game ở đây. Đổi game chỉ đổi cách tính — lời/lỗ của cả bàn vẫn cộng dồn.' },
  {
    target: 'me',
    title: 'Đây là bạn',
    text: 'Chỗ của bạn luôn ở dưới cùng. Bấm vào người khác để đưa kẹo cho họ; trong popup bấm ⇄ để đòi kẹo thay vì đưa.',
  },
]

const PLAYER_END: GuideStep[] = [
  { target: 'rule', title: 'Rule ?', text: 'Bấm để xem luật đang dùng (mức cược, giá…).' },
  { target: 'log', title: 'Trả/nhận', text: 'Lịch sử kẹo bạn trả và nhận. Lỡ tay thì bấm biểu tượng hoàn tác — host sẽ xác nhận.' },
  { target: 'requests', title: 'Yêu cầu', text: 'Ai đòi kẹo bạn sẽ hiện ở đây (có số đỏ) — bấm OK để trả.' },
  { title: 'Xong rồi!', text: 'Muốn xem lại thì bấm ❓ cạnh nút Người chơi.' },
]

const PLAYER_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [
    { target: 'actions', title: 'Mở ván', text: 'Host bấm + Mở ván. Hết ván, người thua bấm vào người thắng để trả — gợi ý sẵn Nhì, Nhất, heo.' },
  ],
  xidach: [
    { target: 'bet', title: 'Đặt cược', text: 'Bấm ô Bet để đặt cược cho mình (trong khoảng min–max của Rule).' },
    { target: 'hat', title: 'Nhà cái', text: '🎩 là nhà cái. Cái không đặt cược — cái trả/nhận kẹo với từng người con.' },
    { target: 'actions', title: 'Các bước', text: 'Chốt cược → chia bài ngoài đời → bấm vào người để trả kẹo → Kết thúc (ván sau giữ cược cũ).' },
  ],
  poker: [
    { target: 'actions', title: 'Tới lượt', text: 'Người có viền xanh là người đang tới lượt: Bỏ bài · Theo / Xem bài · Tố · All-in.' },
    { target: 'pot', title: 'Pot', text: 'Chip của mọi người vào đây. App tự chia pot chính / pot phụ khi có người all-in thiếu.' },
    { target: 'undo', title: 'Hoàn tác', text: 'Bấm nhầm thì bấm ↩ cạnh avatar của bạn để lùi thao tác vừa làm.' },
  ],
  loto: [
    { target: 'pot', title: 'Mua tờ', text: 'Bấm Pot để mua tờ — chọn số tờ, app tự tính kẹo theo giá.' },
    { target: 'actions', title: 'Chốt & trao', text: 'Mua xong thì Chốt. Có người kinh thì host trao pot cho người đó.' },
  ],
  free: [
    { target: 'pot', title: 'Cược', text: 'Bấm Pot để cược — số kẹo mỗi người đã cược hiện trước chỗ ngồi.' },
    { target: 'pot', title: 'Trao thưởng', text: 'Kéo Pot vào người thắng (hoặc bấm Pot → Trao pot). Pot hết là xong ván.' },
  ],
}

const HOST_START: GuideStep[] = [
  { title: 'Bạn là host', text: 'Host mở/chốt ván, chỉnh luật và duyệt các yêu cầu hoàn tác. Cùng xem nhanh nhé!' },
  { target: 'players', title: 'Người chơi', text: 'Thêm người, chạm avatar để chọn "bạn", 🛎️ chuyển host, 💤 cho tạm nghỉ, vuốt trái để xóa.' },
  { target: 'settings', title: 'Cài đặt luật', text: 'Chỉnh luật của mode này (mức cược, giá…). Chỉ host thấy được popup này.' },
]

const HOST_END: GuideStep[] = [
  { target: 'host', title: 'Duyệt yêu cầu', text: 'Ai xin hoàn tác sẽ hiện ở đây (có số đỏ) — duyệt từng cái hoặc OK tất cả.' },
  { title: 'Sẵn sàng!', text: 'Bấm ❓ → Người chơi để xem phần hướng dẫn chơi.' },
]

const HOST_GAME: Record<GameType, GuideStep[]> = {
  tienlen: [
    { target: 'actions', title: 'Ván', text: '+ Mở ván để bắt đầu; hết ván bấm Chốt ván để tính lời/lỗ, bấm nhầm thì Hủy ván.' },
  ],
  xidach: [
    { target: 'hat', title: 'Đổi cái', text: 'Bấm 🎩 để chọn nhà cái khác (trước khi chốt cược).' },
    { target: 'bet', title: 'Bỏ chốt', text: 'Đã chốt mà cần sửa cược: host nhấn giữ ô Bet để bỏ chốt.' },
    { target: 'actions', title: 'Một nút', text: 'Chốt cược → Kết thúc → ván mới tự mở với cược cũ.' },
  ],
  poker: [
    { target: 'actions', title: 'Tay bài', text: 'Tay mới tự xoay nút D và bỏ blind. Tới Showdown bấm người bài mạnh nhất — app tự chia pot.' },
  ],
  loto: [
    { target: 'actions', title: 'Trao pot', text: 'Sau khi Chốt, bấm Pot → chọn người thắng → xác nhận. Ván xong thì bấm Ván mới.' },
  ],
  free: [{ target: 'actions', title: 'Hủy ván', text: 'Ván đang có cược mà muốn bỏ thì bấm Hủy ván.' }],
}

export function guideSteps(game: GameType, role: GuideRole): GuideStep[] {
  return role === 'host'
    ? [...HOST_START, ...HOST_GAME[game], ...HOST_END]
    : [...PLAYER_START, ...PLAYER_GAME[game], ...PLAYER_END]
}

/** Đã xem hướng dẫn nào trên máy này (theo game + vai trò). */
const SEEN_KEY = 'candypot:guides-seen'

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function guideSeen(game: GameType, role: GuideRole): boolean {
  return readSeen().includes(`${game}:${role}`)
}

export function markGuideSeen(game: GameType, role: GuideRole): void {
  try {
    const seen = new Set(readSeen()).add(`${game}:${role}`)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // Không lưu được thì lần sau hiện lại hướng dẫn — không sao
  }
}
